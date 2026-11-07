const { query } = require('../config/database');
const routingEngine = require('../wss/routingEngine');
const requestQueue = require('../wss/requestQueue');
const modemGridService = require('../services/modemGridService');

/**
 * POST /api/v1/flexy/send
 */
const sendFlexy = async (req, res) => {
  try {
    const { number, operator, amount, offer, dongle_id, variables: customVariables, isGros } = req.body;
    const userId = req.user.id;
    const serviceType = isGros ? 'flexy_gros' : 'flexy';

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || !isFinite(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'المبلغ غير صالح' });
    }

    // Validate operator
    const validOperators = ['mobilis', 'djezzy', 'ooredoo'];
    if (!operator || !validOperators.includes(operator.toLowerCase())) {
      return res.status(400).json({ error: 'Invalid operator' });
    }

    // Atomic Balance Deduction (Anti-Race Condition & Double-Spending Protection)
    const isAdmin = req.user.role === 'ADMIN';
    if (!isAdmin) {
      const deductResult = await query(
        'UPDATE users SET wallet = wallet - $1 WHERE id = $2 AND wallet >= $1 RETURNING wallet',
        [numAmount, userId]
      );
      if (deductResult.rows.length === 0) {
        return res.status(400).json({ error: 'الرصيد غير كافٍ لإتمام العملية' });
      }
    }

    // Create transaction (start as 'processing')
    const txResult = await query(
      `INSERT INTO transactions (type, operator, phone_number, amount, offer, sim_used, status, client_id, processed_by)
       VALUES ($1, $2, $3, $4, $5, 'modemgrid', 'processing', $6, $6) RETURNING *`,
      [serviceType, operator.toLowerCase(), number, numAmount, offer || null, userId]
    );
    const transaction = txResult.rows[0];

    // --- Route through ModemGrid ---
    let finalStatus = 'failed';
    let errorMsg = 'No ModemGrid node available for this operator';
    let wssResult = null;
    let targetInfo = null;
    let usedExternal = false;

    // 1. Check for external API mapping first
    const mappingResult = await query(
      'SELECT modemgrid_api_name FROM offer_api_mappings WHERE service_type = $1 AND operator = $2 AND offer_name = $3 AND is_active = true',
      [serviceType, operator.toLowerCase(), offer || '']
    );

    if (mappingResult.rows.length > 0) {
      usedExternal = true;
      const apiName = mappingResult.rows[0].modemgrid_api_name;
      const variables = customVariables || {
        phone_number: number,
        price: String(amount),
        amount: String(amount),
      };
      if (offer && !variables.offer) variables.offer = offer;

      try {
        const mgResponse = await modemGridService.executeAndWaitApi(apiName, variables);
        wssResult = {
           status: mgResponse.status === 'completed' ? 'completed' : 'failed',
           request_id: mgResponse.session_id,
           modem_id: mgResponse.modem_id || 'modemgrid',
           result: mgResponse,
           duration: 0,
           raw_data: mgResponse,
        };
        finalStatus = wssResult.status === 'completed' ? 'success' : 'failed';
        errorMsg = mgResponse.error || null;
        targetInfo = { nodeName: 'external_modemgrid', poolName: 'external', apiName };
      } catch (e) {
         errorMsg = e.message;
      }
    }

    // 2. Fallback to internal WSS if no external mapping
    if (!usedExternal) {
      const target = await routingEngine.selectBestTarget(operator, amount, offer, dongle_id, serviceType, offer);
      
      if (target) {
        targetInfo = target;
        const variables = customVariables || {
          phone_number: number,
          price: String(amount),
        };
        if (offer && !variables.offer) variables.offer = offer;
        if (dongle_id) {
          variables.dongle_id = dongle_id;
          variables.target_modem = dongle_id;
        }

        try {
          wssResult = await requestQueue.enqueue(
            target.nodeId,
            target.apiName,
            variables,
            transaction.id
          );
          finalStatus = wssResult.status === 'completed' ? 'success' : 'failed';
          errorMsg = wssResult.error || null;
        } catch (wssError) {
          errorMsg = wssError.message;
        }
      }
    }

    // 3. Handle results
    if (wssResult || usedExternal) {
      if (!wssResult) finalStatus = 'failed';

      await query(
        `UPDATE transactions SET status = $1, sim_used = $2, error_message = $3, 
         metadata = metadata || $4, updated_at = NOW() WHERE id = $5`,
        [
          finalStatus,
          wssResult?.modem_id || 'modemgrid',
          errorMsg,
          JSON.stringify({
            wss_node: targetInfo?.nodeName || 'unknown',
            wss_pool: targetInfo?.poolName || 'unknown',
            wss_request_id: wssResult?.request_id || null,
            wss_modem_id: wssResult?.modem_id || null,
            wss_result: wssResult?.raw_data || null,
            wss_duration_ms: wssResult?.duration || 0,
          }),
          transaction.id,
        ]
      );

      // If failed, refund wallet
      if (finalStatus === 'failed' && !isAdmin) {
        await query('UPDATE users SET wallet = wallet + $1 WHERE id = $2', [amount, userId]);
      }

      // Calculate commission (only on success)
      let clientProfit = 0;
      let adminProfit = 0;
      let adminCost = amount;

      if (finalStatus === 'success') {
        // Use 'flexy' as the base commission rule for both flexy and flexy_gros unless we later split them
        const commResult = await query(
          `SELECT * FROM commission_offers WHERE service = 'flexy' AND operator = $1 AND role = $2 LIMIT 1`,
          [operator.toLowerCase(), req.user.role]
        );

        if (commResult.rows.length > 0) {
          const commOffer = commResult.rows[0];
          if (commOffer.base_amount && commOffer.base_amount > 0) {
            const clientPriceRate = parseFloat(commOffer.client_price) / parseFloat(commOffer.base_amount);
            const adminCostRate = parseFloat(commOffer.admin_cost) / parseFloat(commOffer.base_amount);
            const clientCost = amount * clientPriceRate;
            adminCost = amount * adminCostRate;
            clientProfit = amount - clientCost;
            adminProfit = clientCost - adminCost;

            if (clientProfit > 0 && !isAdmin) {
              await query('UPDATE users SET wallet = wallet + $1 WHERE id = $2', [clientProfit, userId]);
            }
          }
        }

        await query(
          'UPDATE transactions SET cost = $1, profit = $2 WHERE id = $3',
          [adminCost, adminProfit, transaction.id]
        );
      }

      // Emit Socket.IO event
      const io = req.app.get('io');
      if (io) {
        io.to('admin').emit('transaction_update', { ...transaction, status: finalStatus });
        io.to(`user_${userId}`).emit('transaction_update', { ...transaction, status: finalStatus });
      }

      return res.json({
        success: finalStatus === 'success',
        transaction: {
          ...transaction,
          status: finalStatus,
          profit: adminProfit,
          cost: adminCost,
          clientProfit,
          error_message: errorMsg,
          wss_result: wssResult?.result || null,
        },
      });
    } else {
      // No ModemGrid node available — mark as failed
      await query(
        `UPDATE transactions SET status = 'failed', error_message = 'No ModemGrid node available', updated_at = NOW() WHERE id = $1`,
        [transaction.id]
      );

      // Refund wallet
      if (!isAdmin) {
        await query('UPDATE users SET wallet = wallet + $1 WHERE id = $2', [amount, userId]);
      }

      return res.status(503).json({
        success: false,
        error: 'No ModemGrid node available for this operator',
        transaction: { ...transaction, status: 'failed' },
      });
    }
  } catch (err) {
    console.error('Send flexy error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * GET /api/v1/flexy/history
 */
const getFlexyHistory = async (req, res) => {
  try {
    const { status, operator, search, type = 'flexy', page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    let sql = `SELECT t.*, u.username as client_name FROM transactions t LEFT JOIN users u ON t.client_id = u.id WHERE t.type = $1`;
    const params = [type];
    let paramIdx = 2;

    if (!isAdmin) {
      sql += ` AND t.client_id = $${paramIdx++}`;
      params.push(userId);
    }
    if (status) {
      sql += ` AND t.status = $${paramIdx++}`;
      params.push(status);
    }
    if (operator) {
      sql += ` AND t.operator = $${paramIdx++}`;
      params.push(operator);
    }
    if (search) {
      sql += ` AND t.phone_number ILIKE $${paramIdx}`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    const countResult = await query(`SELECT COUNT(*) FROM (${sql}) AS filtered`, params);
    const total = parseInt(countResult.rows[0].count);

    sql += ` ORDER BY t.created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);

    res.json({
      success: true,
      transactions: result.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('Flexy history error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * POST /api/v1/flexy/bulk
 */
const bulkFlexy = async (req, res) => {
  try {
    const { operations } = req.body; // Array of { number, operator, amount, offer }
    if (!Array.isArray(operations) || operations.length === 0) {
      return res.status(400).json({ error: 'Operations array required' });
    }

    const hasInvalidAmount = operations.some(op => !op.amount || isNaN(parseFloat(op.amount)) || !isFinite(parseFloat(op.amount)) || parseFloat(op.amount) <= 0);
    if (hasInvalidAmount) {
      return res.status(400).json({ error: 'يحتوي الطلب على مبلغ غير صالح' });
    }

    const totalAmount = operations.reduce((sum, op) => sum + parseFloat(op.amount || 0), 0);
    if (isNaN(totalAmount) || !isFinite(totalAmount) || totalAmount <= 0) {
      return res.status(400).json({ error: 'المبلغ الإجمالي غير صالح' });
    }

    // Atomic Balance Deduction (Anti-Race Condition & Double-Spending Protection)
    const isAdminBulk = req.user.role === 'ADMIN';
    if (!isAdminBulk) {
      const deductResult = await query(
        'UPDATE users SET wallet = wallet - $1 WHERE id = $2 AND wallet >= $1 RETURNING wallet',
        [totalAmount, req.user.id]
      );
      if (deductResult.rows.length === 0) {
        return res.status(400).json({ error: 'الرصيد غير كافٍ لإتمام كل العمليات' });
      }
    }

    const results = [];
    let failedAmount = 0;

    for (const op of operations) {
      const opAmount = parseFloat(op.amount);
      try {
        const txResult = await query(
          `INSERT INTO transactions (type, operator, phone_number, amount, offer, status, client_id, processed_by)
           VALUES ('flexy', $1, $2, $3, $4, 'pending', $5, $5) RETURNING *`,
          [op.operator, op.number, opAmount, op.offer || null, req.user.id]
        );
        results.push({ ...txResult.rows[0], queued: true });
      } catch (e) {
        failedAmount += opAmount;
        results.push({ number: op.number, error: e.message });
      }
    }

    // If any individual insertion failed, refund that portion
    if (failedAmount > 0 && !isAdminBulk) {
      await query('UPDATE users SET wallet = wallet + $1 WHERE id = $2', [failedAmount, req.user.id]);
    }

    res.json({ success: true, results, total: results.length });
  } catch (err) {
    console.error('Bulk flexy error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * GET /api/v1/flexy/modems
 */
const getOnlineModems = async (req, res) => {
  try {
    const result = await query(`
      SELECT d.dongle_id, d.name, d.operator, d.balance
      FROM wss_dongles d
      JOIN wss_nodes n ON d.node_id = n.id
      WHERE d.online = true AND n.status = 'online'
      ORDER BY d.operator, d.name
    `);
    res.json({ success: true, modems: result.rows });
  } catch (err) {
    console.error('Get modems error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * GET /api/v1/flexy/gros-details
 * Returns important account details for Flexy Gros:
 * - Operator balances (Mobilis, Djezzy, Ooredoo)
 * - Online SIMs / Modems list and statuses
 * - Today's Flexy Gros statistics: total volume, operations count, success rate
 * - Current account wallet & role
 */
const getFlexyGrosDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    // 1. Modems & SIM cards with balances
    let modems = [];
    try {
      const modemsResult = await query(`
        SELECT d.dongle_id, d.name, d.operator, COALESCE(d.balance, 0) as balance,
               d.online, COALESCE(n.name, 'Node') as node_name
        FROM wss_dongles d
        LEFT JOIN wss_nodes n ON d.node_id = n.id
        WHERE d.online = true AND (n.status = 'online' OR n.status IS NULL)
        ORDER BY d.operator, d.name
      `);
      modems = modemsResult.rows || [];
    } catch (e) {
      console.warn('WSS modems fetch note:', e.message);
    }

    // Calculate operator balances
    const operatorBalances = {
      mobilis: modems.filter(m => m.operator?.toLowerCase().includes('mobilis')).reduce((s, m) => s + parseFloat(m.balance || 0), 0),
      djezzy: modems.filter(m => m.operator?.toLowerCase().includes('djezzy')).reduce((s, m) => s + parseFloat(m.balance || 0), 0),
      ooredoo: modems.filter(m => m.operator?.toLowerCase().includes('ooredoo')).reduce((s, m) => s + parseFloat(m.balance || 0), 0),
    };

    // 2. Today's Flexy Gros statistics
    let statsParams = [];
    let statsSql = `
      SELECT 
        COUNT(*) as total_count,
        COALESCE(SUM(CASE WHEN status = 'success' THEN amount ELSE 0 END), 0) as total_amount,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as success_count,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
        COUNT(CASE WHEN status = 'processing' OR status = 'pending' THEN 1 END) as pending_count
      FROM transactions
      WHERE type = 'flexy_gros'
        AND created_at >= CURRENT_DATE
    `;

    if (!isAdmin) {
      statsSql += ` AND (client_id = $1 OR processed_by = $1)`;
      statsParams.push(userId);
    }

    const statsRes = await query(statsSql, statsParams);
    const statsRow = statsRes.rows[0] || {};
    const totalCount = parseInt(statsRow.total_count || 0, 10);
    const successCount = parseInt(statsRow.success_count || 0, 10);
    const failedCount = parseInt(statsRow.failed_count || 0, 10);
    const pendingCount = parseInt(statsRow.pending_count || 0, 10);
    const totalAmount = parseFloat(statsRow.total_amount || 0);
    const successRate = totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 100;

    // 3. User account details
    const userRes = await query('SELECT wallet, debt, username, full_name, role FROM users WHERE id = $1', [userId]);
    const userAcc = userRes.rows[0] || {};

    res.json({
      success: true,
      details: {
        account: {
          username: userAcc.username,
          full_name: userAcc.full_name,
          role: userAcc.role,
          wallet: parseFloat(userAcc.wallet || 0),
          debt: parseFloat(userAcc.debt || 0),
        },
        operatorBalances,
        todayStats: {
          totalAmount,
          totalCount,
          successCount,
          failedCount,
          pendingCount,
          successRate,
        },
        activeModemsCount: modems.length,
        modems,
      }
    });
  } catch (err) {
    console.error('getFlexyGrosDetails error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { sendFlexy, getFlexyHistory, bulkFlexy, getOnlineModems, getFlexyGrosDetails };
