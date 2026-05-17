const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

/**
 * GET /api/v1/users
 */
const getUsers = async (req, res) => {
  try {
    const { role, status, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT u.id, u.username, u.email, u.full_name, u.phone, u.wilaya, u.role, u.wallet, u.debt, u.debt_limit, 
             u.profit_percentage, u.status, u.parent_id, u.permissions, u.last_login, u.created_at,
             COALESCE((SELECT SUM(profit) FROM transactions WHERE client_id = u.id AND status = 'success'), 0) as total_profit
      FROM users u WHERE 1=1
    `;
    const params = [];
    let paramIdx = 1;

    if (role) {
      sql += ` AND role = $${paramIdx++}`;
      params.push(role);
    }
    if (status) {
      sql += ` AND status = $${paramIdx++}`;
      params.push(status);
    }
    if (search) {
      sql += ` AND (username ILIKE $${paramIdx} OR full_name ILIKE $${paramIdx} OR email ILIKE $${paramIdx} OR phone ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    // Count total
    const countResult = await query(`SELECT COUNT(*) FROM (${sql}) AS filtered`, params);
    const total = parseInt(countResult.rows[0].count);

    sql += ` ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);

    res.json({
      success: true,
      users: result.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * GET /api/v1/users/:id
 */
const getUser = async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.username, u.email, u.full_name, u.phone, u.wilaya, u.role, u.wallet, u.debt, u.debt_limit, 
              u.profit_percentage, u.status, u.parent_id, u.permissions, u.last_login, u.created_at,
              COALESCE((SELECT SUM(profit) FROM transactions WHERE client_id = u.id AND status = 'success'), 0) as total_profit
       FROM users u WHERE u.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * POST /api/v1/users
 */
const createUser = async (req, res) => {
  try {
    const { username, email, password, full_name, phone, wilaya, role, wallet, debt_limit, profit_percentage, parent_id, permissions } = req.body;

    // Check duplicate
    const exists = await query('SELECT id FROM users WHERE username = $1 OR email = $2', [username, email]);
    if (exists.rows.length > 0) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await query(
      `INSERT INTO users (username, email, password, full_name, phone, wilaya, role, wallet, debt_limit, profit_percentage, parent_id, permissions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id, username, email, full_name, role, wallet, status, permissions, created_at`,
      [username, email, hashedPassword, full_name, phone, wilaya || null, role || 'GROSIST', wallet || 0, debt_limit || 0, profit_percentage || 0, parent_id || null, permissions || '{}']
    );

    res.status(201).json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * PUT /api/v1/users/:id
 */
const updateUser = async (req, res) => {
  try {
    const { full_name, email, phone, wilaya, role, status, wallet, debt_limit, profit_percentage, permissions, password } = req.body;
    const userId = req.params.id;

    let updatePasswordSql = '';
    let queryParams = [full_name, email, phone, wilaya, role, status, wallet, debt_limit, profit_percentage, permissions, userId];
    let paramIndex = 12;

    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 12);
      updatePasswordSql = `, password = $${paramIndex}`;
      queryParams.push(hashedPassword);
    }

    const result = await query(
      `UPDATE users SET
        full_name = COALESCE($1, full_name),
        email = COALESCE($2, email),
        phone = COALESCE($3, phone),
        wilaya = COALESCE($4, wilaya),
        role = COALESCE($5, role),
        status = COALESCE($6, status),
        wallet = COALESCE($7, wallet),
        debt_limit = COALESCE($8, debt_limit),
        profit_percentage = COALESCE($9, profit_percentage),
        permissions = COALESCE($10, permissions)
        ${updatePasswordSql},
        updated_at = NOW()
      WHERE id = $11
      RETURNING id, username, email, full_name, phone, wilaya, role, wallet, debt, status, permissions`,
      queryParams
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * DELETE /api/v1/users/:id
 */
const deleteUser = async (req, res) => {
  try {
    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
const manageDebt = async (req, res) => {
  try {
    const userId = req.params.id;
    // type: 'add_debt' (user took credit), 'pay_debt' (user paid back)
    const { type, amount, notes } = req.body;
    const value = parseFloat(amount);
    if (!value || value <= 0) return res.status(400).json({ error: 'مبلغ غير صالح' });

    if (type === 'add_debt') {
      // User took debt -> add to their debt, optionally add to their wallet if they took money as balance
      await query('UPDATE users SET debt = debt + $1, wallet = wallet + $1 WHERE id = $2', [value, userId]);
      await query(`INSERT INTO transactions (type, amount, status, client_id, processed_by, metadata) 
                   VALUES ('debt', $1, 'success', $2, $3, $4)`, 
                   [value, userId, req.user.id, JSON.stringify({ action: 'add', notes })]);
    } else if (type === 'pay_debt') {
      // User paid debt -> reduce their debt
      await query('UPDATE users SET debt = debt - $1 WHERE id = $2', [value, userId]);
      await query(`INSERT INTO transactions (type, amount, status, client_id, processed_by, metadata) 
                   VALUES ('debt', $1, 'success', $2, $3, $4)`, 
                   [-value, userId, req.user.id, JSON.stringify({ action: 'pay', notes })]);
    } else {
      return res.status(400).json({ error: 'نوع العملية غير صالح' });
    }

    const userRes = await query('SELECT debt, wallet FROM users WHERE id = $1', [userId]);
    res.json({ success: true, user: userRes.rows[0], message: 'تم تحديث الديون بنجاح' });
  } catch (err) {
    console.error('Manage debt error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getUsers, getUser, createUser, updateUser, deleteUser, manageDebt };
