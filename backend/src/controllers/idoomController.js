const { query } = require('../config/database');
const routingEngine = require('../wss/routingEngine');
const requestQueue = require('../wss/requestQueue');

/**
 * POST /api/v1/idoom/recharge
 */
const rechargeIdoom = async (req, res) => {
  try {
    const { ssuid, phone_number, amount, type } = req.body;
    const userId = req.user.id;

    // Validate type
    const validTypes = ['adsl', 'fibre', 'lte'];
    if (type && !validTypes.includes(type.toLowerCase())) {
      return res.status(400).json({ error: 'Invalid Idoom type' });
    }

    // Check wallet
    const isAdmin = req.user.role === 'ADMIN';
    const userResult = await query('SELECT wallet FROM users WHERE id = $1', [userId]);
    if (!isAdmin && parseFloat(userResult.rows[0].wallet) < amount) {
      return res.status(400).json({ error: 'Insufficient wallet balance' });
    }

    const txResult = await query(
      `INSERT INTO transactions (type, operator, phone_number, amount, status, client_id, processed_by, metadata)
       VALUES ('idoom', 'idoom', $1, $2, 'processing', $3, $3, $4) RETURNING *`,
      [phone_number || ssuid, amount, userId, JSON.stringify({ ssuid, type: type || 'adsl' })]
    );
    const transaction = txResult.rows[0];

    // Deduct wallet
    if (!isAdmin) {
      await query('UPDATE users SET wallet = wallet - $1 WHERE id = $2', [amount, userId]);
    }

    // --- Route through ModemGrid WSS ---
    const target = await routingEngine.selectBestTarget('idoom', amount);

    if (target) {
      const variables = {
        phone_number: phone_number || ssuid,
        price: String(amount),
        ssuid: ssuid || '',
        type: type || 'adsl',
      };

      try {
        const wssResult = await requestQueue.enqueue(
          target.nodeId, target.apiName, variables, transaction.id
        );

        const finalStatus = wssResult.status === 'completed' ? 'success' : 'failed';
        const errorMsg = wssResult.error || null;

        await query(
          `UPDATE transactions SET status = $1, error_message = $2, 
           metadata = metadata || $3, updated_at = NOW() WHERE id = $4`,
          [
            finalStatus, errorMsg,
            JSON.stringify({
              wss_node: target.nodeName,
              wss_request_id: wssResult.request_id,
              wss_modem_id: wssResult.modem_id,
              wss_result: wssResult.result,
            }),
            transaction.id,
          ]
        );

        if (finalStatus === 'failed' && !isAdmin) {
          await query('UPDATE users SET wallet = wallet + $1 WHERE id = $2', [amount, userId]);
        }

        let clientProfit = 0, adminProfit = 0, adminCost = amount;

        if (finalStatus === 'success') {
          const commResult = await query(
            `SELECT * FROM commission_offers WHERE service = 'idoom' AND operator = 'idoom' AND role = $1 LIMIT 1`,
            [req.user.role]
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

        return res.json({
          success: finalStatus === 'success',
          transaction: { ...transaction, status: finalStatus, profit: adminProfit, cost: adminCost },
        });
      } catch (wssError) {
        await query(
          `UPDATE transactions SET status = 'failed', error_message = $1, updated_at = NOW() WHERE id = $2`,
          [wssError.message, transaction.id]
        );
        if (!isAdmin) {
          await query('UPDATE users SET wallet = wallet + $1 WHERE id = $2', [amount, userId]);
        }
        return res.json({
          success: false,
          transaction: { ...transaction, status: 'failed', error_message: wssError.message },
        });
      }
    } else {
      // No node available
      await query(
        `UPDATE transactions SET status = 'failed', error_message = 'No ModemGrid node available', updated_at = NOW() WHERE id = $1`,
        [transaction.id]
      );
      if (!isAdmin) {
        await query('UPDATE users SET wallet = wallet + $1 WHERE id = $2', [amount, userId]);
      }
      return res.status(503).json({
        success: false,
        error: 'No ModemGrid node available',
        transaction: { ...transaction, status: 'failed' },
      });
    }
  } catch (err) {
    console.error('Idoom recharge error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * GET /api/v1/idoom/history
 */
const getIdoomHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const isAdmin = req.user.role === 'ADMIN';

    let sql = `SELECT t.*, u.username as client_name FROM transactions t LEFT JOIN users u ON t.client_id = u.id WHERE t.type = 'idoom'`;
    const params = [];
    let paramIdx = 1;

    if (!isAdmin) {
      sql += ` AND t.client_id = $${paramIdx++}`;
      params.push(req.user.id);
    }

    const countResult = await query(`SELECT COUNT(*) FROM (${sql}) AS filtered`, params);
    const total = parseInt(countResult.rows[0].count);

    sql += ` ORDER BY t.created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);

    res.json({
      success: true,
      transactions: result.rows,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { rechargeIdoom, getIdoomHistory };
