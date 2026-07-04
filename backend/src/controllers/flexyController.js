const { query } = require('../config/database');
const routingEngine = require('../wss/routingEngine');
const requestQueue = require('../wss/requestQueue');

/**
 * POST /api/v1/flexy/send
 */
const sendFlexy = async (req, res) => {
  try {
    const { number, operator, amount, offer } = req.body;
    const userId = req.user.id;

    // Validate operator
    const validOperators = ['mobilis', 'djezzy', 'ooredoo'];
    if (!validOperators.includes(operator.toLowerCase())) {
      return res.status(400).json({ error: 'Invalid operator' });
    }

    // Check wallet balance (ADMIN has infinite virtual balance)
    const isAdmin = req.user.role === 'ADMIN';
    const userResult = await query('SELECT wallet FROM users WHERE id = $1', [userId]);
    const wallet = parseFloat(userResult.rows[0].wallet);
    if (!isAdmin && wallet < amount) {
      return res.status(400).json({ error: 'Insufficient wallet balance' });
    }

    // Create transaction (start as 'processing')
    const txResult = await query(
      `INSERT INTO transactions (type, operator, phone_number, amount, offer, sim_used, status, client_id, processed_by)
       VALUES ('flexy', $1, $2, $3, $4, 'modemgrid', 'processing', $5, $5) RETURNING *`,
      [operator.toLowerCase(), number, amount, offer || null, userId]
    );
    const transaction = txResult.rows[0];

    // Deduct wallet (skip for ADMIN)
    if (!isAdmin) {
      await query('UPDATE users SET wallet = wallet - $1 WHERE id = $2', [amount, userId]);
    }

    // --- Route through ModemGrid WSS ---
    const target = await routingEngine.selectBestTarget(operator, amount);

    if (target) {
      // Build variables for the ModemGrid API
      const variables = {
        phone_number: number,
        price: String(amount),
      };

      try {
        const wssResult = await requestQueue.enqueue(
          target.nodeId,
          target.apiName,
          variables,
          transaction.id
        );

        // Update transaction with result from ModemGrid
        const finalStatus = wssResult.status === 'completed' ? 'success' : 'failed';
        const errorMsg = wssResult.error || null;

        await query(
          `UPDATE transactions SET status = $1, sim_used = $2, error_message = $3, 
           metadata = metadata || $4, updated_at = NOW() WHERE id = $5`,
          [
            finalStatus,
            wssResult.modem_id || 'modemgrid',
            errorMsg,
            JSON.stringify({
              wss_node: target.nodeName,
              wss_pool: target.poolName,
              wss_request_id: wssResult.request_id,
              wss_modem_id: wssResult.modem_id,
              wss_result: wssResult.result,
              wss_duration_ms: wssResult.duration,
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
            wss_result: wssResult.result,
          },
        });
      } catch (wssError) {
        // WSS request failed (timeout, node disconnected, etc.)
        await query(
          `UPDATE transactions SET status = 'failed', error_message = $1, updated_at = NOW() WHERE id = $2`,
          [wssError.message, transaction.id]
        );

        // Refund wallet
        if (!isAdmin) {
          await query('UPDATE users SET wallet = wallet + $1 WHERE id = $2', [amount, userId]);
        }

        return res.json({
          success: false,
          transaction: { ...transaction, status: 'failed', error_message: wssError.message },
        });
      }
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
    const { status, operator, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    let sql = `SELECT t.*, u.username as client_name FROM transactions t LEFT JOIN users u ON t.client_id = u.id WHERE t.type = 'flexy'`;
    const params = [];
    let paramIdx = 1;

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

    const totalAmount = operations.reduce((sum, op) => sum + parseFloat(op.amount || 0), 0);
    const isAdminBulk = req.user.role === 'ADMIN';
    const userResult = await query('SELECT wallet FROM users WHERE id = $1', [req.user.id]);
    const wallet = parseFloat(userResult.rows[0].wallet);

    if (!isAdminBulk && wallet < totalAmount) {
      return res.status(400).json({ error: 'الرصيد غير كافٍ لإتمام كل العمليات' });
    }

    if (!isAdminBulk) {
      await query('UPDATE users SET wallet = wallet - $1 WHERE id = $2', [totalAmount, req.user.id]);
    }

    const results = [];
    for (const op of operations) {
      try {
        const txResult = await query(
          `INSERT INTO transactions (type, operator, phone_number, amount, offer, status, client_id, processed_by)
           VALUES ('flexy', $1, $2, $3, $4, 'pending', $5, $5) RETURNING *`,
          [op.operator, op.number, op.amount, op.offer || null, req.user.id]
        );
        results.push({ ...txResult.rows[0], queued: true });
      } catch (e) {
        results.push({ number: op.number, error: e.message });
      }
    }

    res.json({ success: true, results, total: results.length });
  } catch (err) {
    console.error('Bulk flexy error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { sendFlexy, getFlexyHistory, bulkFlexy };
