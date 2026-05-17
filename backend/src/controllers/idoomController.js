const { query } = require('../config/database');

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
    const userResult = await query('SELECT wallet FROM users WHERE id = $1', [userId]);
    if (parseFloat(userResult.rows[0].wallet) < amount) {
      return res.status(400).json({ error: 'Insufficient wallet balance' });
    }

    const txResult = await query(
      `INSERT INTO transactions (type, operator, phone_number, amount, status, client_id, processed_by, metadata)
       VALUES ('idoom', 'idoom', $1, $2, 'processing', $3, $3, $4) RETURNING *`,
      [phone_number || ssuid, amount, userId, JSON.stringify({ ssuid, type: type || 'adsl' })]
    );

    // Deduct wallet
    await query('UPDATE users SET wallet = wallet - $1 WHERE id = $2', [amount, userId]);

    // Calculate commission
    const commResult = await query(
      `SELECT * FROM commission_offers WHERE service = 'idoom' AND operator = 'idoom' AND role = $1 LIMIT 1`,
      [req.user.role]
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

    // Simulate success
    await query(
      `UPDATE transactions SET status = 'success', updated_at = NOW(), cost = $1, profit = $2 WHERE id = $3`, 
      [adminCost, adminProfit, txResult.rows[0].id]
    );

    res.json({ success: true, transaction: { ...txResult.rows[0], status: 'success', profit: adminProfit, cost: adminCost } });
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
