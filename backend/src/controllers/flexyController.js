const { query } = require('../config/database');

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

    // Check wallet balance
    const userResult = await query('SELECT wallet FROM users WHERE id = $1', [userId]);
    const wallet = parseFloat(userResult.rows[0].wallet);
    if (wallet < amount) {
      return res.status(400).json({ error: 'Insufficient wallet balance' });
    }

    // Find available SIM
    const simResult = await query(
      `SELECT * FROM sim_cards WHERE operator = $1 AND status = 'active' AND daily_used + $2 <= daily_limit ORDER BY daily_used ASC LIMIT 1`,
      [operator.toLowerCase(), amount]
    );

    const simUsed = simResult.rows.length > 0 ? simResult.rows[0].phone_number : 'auto';

    // Create transaction
    const txResult = await query(
      `INSERT INTO transactions (type, operator, phone_number, amount, offer, sim_used, status, client_id, processed_by)
       VALUES ('flexy', $1, $2, $3, $4, $5, 'processing', $6, $6) RETURNING *`,
      [operator.toLowerCase(), number, amount, offer || null, simUsed, userId]
    );

    // Deduct wallet
    await query('UPDATE users SET wallet = wallet - $1 WHERE id = $2', [amount, userId]);

    // Update SIM usage
    if (simResult.rows.length > 0) {
      await query(
        'UPDATE sim_cards SET daily_used = daily_used + $1, last_used = NOW() WHERE id = $2',
        [amount, simResult.rows[0].id]
      );
    }

    // TODO: Integrate with actual GSM gateway here
    // For now, mark as success after simulating
    await query(
      `UPDATE transactions SET status = 'success', updated_at = NOW() WHERE id = $1`,
      [txResult.rows[0].id]
    );

    // Calculate commission based on offers
    const commResult = await query(
      `SELECT * FROM commission_offers WHERE service = 'flexy' AND operator = $1 AND role = $2 LIMIT 1`,
      [operator.toLowerCase(), req.user.role]
    );

    let clientProfit = 0;
    let adminProfit = 0;
    let adminCost = amount;

    if (commResult.rows.length > 0) {
      const offer = commResult.rows[0];
      if (offer.base_amount && offer.base_amount > 0) {
        const clientPriceRate = parseFloat(offer.client_price) / parseFloat(offer.base_amount);
        const adminCostRate = parseFloat(offer.admin_cost) / parseFloat(offer.base_amount);
        
        const clientCost = amount * clientPriceRate;
        adminCost = amount * adminCostRate;
        
        clientProfit = amount - clientCost;
        adminProfit = clientCost - adminCost;
        
        // Give client profit back to their wallet
        if (clientProfit > 0) {
          await query('UPDATE users SET wallet = wallet + $1 WHERE id = $2', [clientProfit, userId]);
        }
      }
    }

    // Update transaction with cost and admin profit
    await query(
      'UPDATE transactions SET cost = $1, profit = $2 WHERE id = $3', 
      [adminCost, adminProfit, txResult.rows[0].id]
    );

    res.json({
      success: true,
      transaction: { ...txResult.rows[0], status: 'success', profit: adminProfit, cost: adminCost, clientProfit },
    });
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
    const userResult = await query('SELECT wallet FROM users WHERE id = $1', [req.user.id]);
    const wallet = parseFloat(userResult.rows[0].wallet);

    if (wallet < totalAmount) {
      return res.status(400).json({ error: 'الرصيد غير كافٍ لإتمام كل العمليات' });
    }

    await query('UPDATE users SET wallet = wallet - $1 WHERE id = $2', [totalAmount, req.user.id]);

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
