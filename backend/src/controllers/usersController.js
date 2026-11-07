const bcrypt = require('bcryptjs');
const { query, pool } = require('../config/database');

/**
 * GET /api/v1/users
 */
const getUsers = async (req, res) => {
  try {
    const { role, status, search, filter_scope, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT u.id, u.username, u.email, u.full_name, u.phone, u.wilaya, u.role, u.wallet, u.debt, u.debt_limit, 
             u.profit_percentage, u.status, u.parent_id, u.permissions, u.last_login, u.created_at, u.logo_url,
             COALESCE(u.self_recharge_limit, 0) as self_recharge_limit,
             COALESCE(u.self_recharge_total, 0) as self_recharge_total,
             COALESCE(u.self_recharge_rule, 'total') as self_recharge_rule,
             COALESCE(u.self_recharge_enabled, true) as self_recharge_enabled,
             COALESCE((SELECT SUM(profit) FROM transactions WHERE client_id = u.id AND status = 'success'), 0) as total_profit
      FROM users u WHERE 1=1
    `;
    const params = [];
    let paramIdx = 1;

    // Strict RBAC: Non-admin can only see accounts they created (direct children)
    if (req.user.role !== 'ADMIN') {
      sql += ` AND u.parent_id = $${paramIdx++}`;
      params.push(req.user.id);
    } else if (filter_scope === 'mine') {
      // For ADMIN: 'Ana – Moi' filter to see accounts created directly by admin
      sql += ` AND u.parent_id = $${paramIdx++}`;
      params.push(req.user.id);
    }

    if (role) {
      if (role === 'GROS' || role === 'GRO') {
        sql += ` AND u.role IN ('GROSIST', 'GRO')`;
      } else {
        sql += ` AND u.role = $${paramIdx++}`;
        params.push(role);
      }
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
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

/**
 * GET /api/v1/users/:id
 */
const getUser = async (req, res) => {
  try {
    // IDOR Protection: If not ADMIN and not self, check if the user is a direct child
    if (req.user.role !== 'ADMIN' && req.user.id !== parseInt(req.params.id)) {
      const checkOwnership = await query('SELECT id FROM users WHERE id = $1 AND parent_id = $2', [req.params.id, req.user.id]);
      if (checkOwnership.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied. You can only view your own clients.' });
      }
    }

    const result = await query(
      `SELECT u.id, u.username, u.email, u.full_name, u.phone, u.wilaya, u.role, u.wallet, u.debt, u.debt_limit, 
              u.profit_percentage, u.status, u.parent_id, u.permissions, u.last_login, u.created_at, u.logo_url,
              COALESCE(u.self_recharge_limit, 0) as self_recharge_limit,
              COALESCE(u.self_recharge_total, 0) as self_recharge_total,
              COALESCE(u.self_recharge_rule, 'total') as self_recharge_rule,
              COALESCE(u.self_recharge_enabled, true) as self_recharge_enabled,
              COALESCE((SELECT SUM(profit) FROM transactions WHERE client_id = u.id AND status = 'success'), 0) as total_profit
       FROM users u WHERE u.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

/**
 * POST /api/v1/users
 */
const createUser = async (req, res) => {
  try {
    let { username, email, password, full_name, phone, wilaya, role, wallet, debt_limit, profit_percentage, parent_id, permissions } = req.body;

    if (req.user.role !== 'ADMIN') {
      parent_id = req.user.id;
      // Non-admins cannot initialize a user with arbitrary balance or debt limits
      wallet = 0;
      debt_limit = 0;
      // Prevent privilege escalation: restrict what roles they can create
      const allowedRoles = {
        'SUPER_GRO': ['GRO', 'GROSIST', 'COMMERCANT', 'CLIENT'],
        'GRO': ['COMMERCANT', 'CLIENT'],
        'GROSIST': ['COMMERCANT', 'CLIENT'],
        'COMMERCANT': ['CLIENT']
      };
      
      const userAllowedRoles = allowedRoles[req.user.role] || [];
      if (!userAllowedRoles.includes(role)) {
        return res.status(403).json({ error: 'غير مصرح لك بإنشاء هذا الدور' });
      }
    } else {
      // Admin validation
      wallet = (wallet !== undefined && !isNaN(parseFloat(wallet)) && isFinite(parseFloat(wallet))) ? Math.max(0, parseFloat(wallet)) : 0;
      debt_limit = (debt_limit !== undefined && !isNaN(parseFloat(debt_limit)) && isFinite(parseFloat(debt_limit))) ? Math.max(0, parseFloat(debt_limit)) : 0;
    }

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
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

/**
 * PUT /api/v1/users/:id
 */
const updateUser = async (req, res) => {
  try {
    let { full_name, email, phone, wilaya, role, status, wallet, debt_limit, profit_percentage, permissions, password, self_recharge_limit, self_recharge_total, self_recharge_rule, self_recharge_enabled } = req.body;
    const userId = req.params.id;

    if (req.user.role !== 'ADMIN') {
      const checkOwnership = await query('SELECT id, role FROM users WHERE id = $1 AND parent_id = $2', [userId, req.user.id]);
      if (checkOwnership.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Strict Anti-Tampering: Non-admins can NEVER directly alter wallet balance or debt limit
      wallet = null;
      debt_limit = null;

      const targetUserRole = checkOwnership.rows[0].role;
      // If they try to change the role, check if they are allowed
      if (role && role !== targetUserRole) {
        const allowedRoles = {
          'SUPER_GRO': ['GRO', 'GROSIST', 'COMMERCANT', 'CLIENT'],
          'GRO': ['COMMERCANT', 'CLIENT'],
          'GROSIST': ['COMMERCANT', 'CLIENT'],
          'COMMERCANT': ['CLIENT']
        };
        const userAllowedRoles = allowedRoles[req.user.role] || [];
        if (!userAllowedRoles.includes(role)) {
          return res.status(403).json({ error: 'غير مصرح لك بتعيين هذا الدور' });
        }
      } else {
        role = targetUserRole; // keep existing role if not changed
      }
    } else {
      // Protect root admin from accidental demotion or disabling
      if (parseInt(userId) === 1) {
        if (role && role !== 'ADMIN') {
          return res.status(400).json({ error: 'لا يمكن تغيير رتبة الحساب الإداري الرئيسي' });
        }
        if (status && status !== 'active') {
          return res.status(400).json({ error: 'لا يمكن تعطيل الحساب الإداري الرئيسي' });
        }
      }

      // Validate wallet and debt_limit if provided by admin
      if (wallet !== undefined && wallet !== null) {
        const numW = parseFloat(wallet);
        wallet = (!isNaN(numW) && isFinite(numW) && numW >= 0) ? numW : null;
      }
      if (debt_limit !== undefined && debt_limit !== null) {
        const numD = parseFloat(debt_limit);
        debt_limit = (!isNaN(numD) && isFinite(numD) && numD >= 0) ? numD : null;
      }
    }

    let updatePasswordSql = '';
    let queryParams = [
      full_name, email, phone, wilaya, role, status, wallet, debt_limit, profit_percentage, permissions,
      self_recharge_limit !== undefined ? parseFloat(self_recharge_limit) : null,
      self_recharge_total !== undefined ? parseFloat(self_recharge_total) : null,
      self_recharge_rule !== undefined ? self_recharge_rule : null,
      self_recharge_enabled !== undefined ? self_recharge_enabled : null,
      userId
    ];
    let paramIndex = 16;

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
        permissions = COALESCE($10, permissions),
        self_recharge_limit = COALESCE($11, self_recharge_limit),
        self_recharge_total = COALESCE($12, self_recharge_total),
        self_recharge_rule = COALESCE($13, self_recharge_rule),
        self_recharge_enabled = COALESCE($14, self_recharge_enabled)
        ${updatePasswordSql},
        updated_at = NOW()
      WHERE id = $15
      RETURNING id, username, email, full_name, phone, wilaya, role, wallet, debt, status, permissions, self_recharge_limit, self_recharge_total, self_recharge_rule, self_recharge_enabled`,
      queryParams
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

/**
 * DELETE /api/v1/users/:id
 */
const deleteUser = async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    if (!targetId || isNaN(targetId)) {
      return res.status(400).json({ error: 'معرف المستخدم غير صالح' });
    }
    // Prevent deleting root super-admin or caller's own account
    if (targetId === 1 || targetId === req.user.id) {
      return res.status(403).json({ error: 'لا يمكن حذف الحساب الإداري الرئيسي أو حسابك الشخصي' });
    }
    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [targetId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
const manageDebt = async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.params.id;
    const isCallerAdmin = req.user.role === 'ADMIN';

    // IDOR Protection: Enforce hierarchy for debt management
    if (!isCallerAdmin) {
      const checkOwnership = await client.query('SELECT id FROM users WHERE id = $1 AND parent_id = $2', [userId, req.user.id]);
      if (checkOwnership.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied. You can only manage debt for your direct clients.' });
      }
    }

    // type: 'add_debt' (user took credit), 'pay_debt' (user paid back)
    const { type, amount, notes } = req.body;
    const value = parseFloat(amount);
    if (!value || isNaN(value) || !isFinite(value) || value <= 0) {
      return res.status(400).json({ error: 'مبلغ غير صالح' });
    }

    await client.query('BEGIN');

    if (type === 'add_debt') {
      // If caller is not admin, verify caller has enough wallet and deduct it
      if (!isCallerAdmin) {
        const parentRes = await client.query('SELECT wallet FROM users WHERE id = $1 FOR UPDATE', [req.user.id]);
        const parentWallet = parseFloat(parentRes.rows[0]?.wallet || 0);
        if (parentWallet < value) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'رصيد محفظتك غير كافٍ لإعطاء دين ورصيد لهذا العميل' });
        }
        await client.query('UPDATE users SET wallet = wallet - $1 WHERE id = $2', [value, req.user.id]);
      }

      // Add to client's debt and wallet
      await client.query('UPDATE users SET debt = debt + $1, wallet = wallet + $1, updated_at = NOW() WHERE id = $2', [value, userId]);
      await client.query(
        `INSERT INTO transactions (type, amount, status, client_id, processed_by, metadata) 
         VALUES ('debt', $1, 'success', $2, $3, $4)`, 
        [value, userId, req.user.id, JSON.stringify({ action: 'add', notes })]
      );
    } else if (type === 'pay_debt') {
      // Child pays back debt -> reduce child debt, and if caller is not admin, refund/credit parent's wallet
      if (!isCallerAdmin) {
        await client.query('UPDATE users SET wallet = wallet + $1 WHERE id = $2', [value, req.user.id]);
      }
      await client.query('UPDATE users SET debt = GREATEST(0, debt - $1), updated_at = NOW() WHERE id = $2', [value, userId]);
      await client.query(
        `INSERT INTO transactions (type, amount, status, client_id, processed_by, metadata) 
         VALUES ('debt', $1, 'success', $2, $3, $4)`, 
        [-value, userId, req.user.id, JSON.stringify({ action: 'pay', notes })]
      );
    } else {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'نوع العملية غير صالح' });
    }

    await client.query('COMMIT');

    const userRes = await query('SELECT debt, wallet FROM users WHERE id = $1', [userId]);
    res.json({ success: true, user: userRes.rows[0], message: 'تم تحديث الديون بنجاح' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Manage debt error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

/**
 * POST /api/v1/users/me/logo
 */
const uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'لم يتم تحميل أي صورة' });
    }

    // Since server.js mounts app.use('/uploads', express.static('uploads'))
    // the public URL path should be /uploads/logos/<filename>
    const logoUrl = `/uploads/logos/${req.file.filename}`;

    await query('UPDATE users SET logo_url = $1 WHERE id = $2', [logoUrl, req.user.id]);

    res.json({ success: true, logo_url: logoUrl, message: 'تم تحديث الشعار بنجاح' });
  } catch (err) {
    console.error('Upload logo error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * POST /api/v1/users/:id/self-recharge-config
 */
const setSelfRechargeConfig = async (req, res) => {
  try {
    const userId = req.params.id;
    // IDOR Protection: Enforce hierarchy
    if (req.user.role !== 'ADMIN') {
      const checkOwnership = await query('SELECT id FROM users WHERE id = $1 AND parent_id = $2', [userId, req.user.id]);
      if (checkOwnership.rows.length === 0) {
        return res.status(403).json({ error: 'غير مصرح لك بإدارة هذا العميل' });
      }
    }

    const { limit, total, rule = 'total', enabled = true } = req.body;
    const parsedLimit = parseFloat(limit) || 0;
    const parsedTotal = total !== undefined ? (parseFloat(total) || 0) : parsedLimit;

    await query(
      `UPDATE users SET 
        self_recharge_limit = $1, 
        self_recharge_total = $2, 
        self_recharge_rule = $3, 
        self_recharge_enabled = $4,
        updated_at = NOW()
       WHERE id = $5`,
      [parsedLimit, parsedTotal, rule, enabled, userId]
    );

    const result = await query(
      `SELECT id, username, self_recharge_limit, self_recharge_total, self_recharge_rule, self_recharge_enabled FROM users WHERE id = $1`,
      [userId]
    );

    res.json({ success: true, user: result.rows[0], message: 'تم تحديث ترخيص الشحن الذاتي بنجاح' });
  } catch (err) {
    console.error('Set self recharge config error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getUsers, getUser, createUser, updateUser, deleteUser, manageDebt, uploadLogo, setSelfRechargeConfig };
