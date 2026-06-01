const { query } = require('../config/database');

const getHistory = async (req, res) => {
  try {
    const { search } = req.query;
    let sql = `
      SELECT t.id, t.created_at as date, u1.username as from_user, u2.username as to_user, t.amount, t.type, t.status 
      FROM transfers t
      LEFT JOIN users u1 ON t.from_user = u1.id
      LEFT JOIN users u2 ON t.to_user = u2.id
      WHERE 1=1
    `;
    const params = [];
    if (search) {
      sql += ` AND (u1.username ILIKE $1 OR u2.username ILIKE $1 OR CAST(t.id AS TEXT) ILIKE $1)`;
      params.push(`%${search}%`);
    }
    sql += ` ORDER BY t.created_at DESC LIMIT 100`;

    const result = await query(sql, params);
    res.json({ success: true, transactions: result.rows });
  } catch (err) {
    console.error('Wallet history error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

const addBalance = async (req, res) => {
  try {
    const { user_id, amount, notes } = req.body;
    if (!user_id || !amount || amount <= 0) return res.status(400).json({ error: 'Valid user_id and amount required' });
    await query('UPDATE users SET wallet = wallet + $1 WHERE id = $2', [amount, user_id]);
    await query(`INSERT INTO transfers (from_user,to_user,amount,type,notes,status) VALUES ($1,$2,$3,'deposit',$4,'completed')`, [req.user.id, user_id, amount, notes||null]);
    await query(`INSERT INTO transactions (type,amount,status,client_id,processed_by) VALUES ('wallet_add',$1,'success',$2,$3)`, [amount, user_id, req.user.id]);
    const user = await query('SELECT id,username,wallet,debt FROM users WHERE id=$1', [user_id]);
    res.json({ success: true, user: user.rows[0] });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const removeBalance = async (req, res) => {
  try {
    const { user_id, amount, notes } = req.body;
    if (!user_id || !amount || amount <= 0) return res.status(400).json({ error: 'Valid user_id and amount required' });
    const userRes = await query('SELECT wallet FROM users WHERE id=$1', [user_id]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    await query('UPDATE users SET wallet = wallet - $1 WHERE id = $2', [amount, user_id]);
    await query(`INSERT INTO transfers (from_user,to_user,amount,type,notes,status) VALUES ($1,$2,$3,'withdrawal',$4,'completed')`, [user_id, req.user.id, amount, notes||null]);
    await query(`INSERT INTO transactions (type,amount,status,client_id,processed_by) VALUES ('wallet_remove',$1,'success',$2,$3)`, [amount, user_id, req.user.id]);
    const user = await query('SELECT id,username,wallet,debt FROM users WHERE id=$1', [user_id]);
    res.json({ success: true, user: user.rows[0] });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const transfer = async (req, res) => {
  try {
    const { to_user_id, username, amount, notes } = req.body;
    let recipientId = to_user_id;

    if (!recipientId && username) {
      const userRes = await query('SELECT id FROM users WHERE username = $1', [username]);
      if (userRes.rows.length === 0) return res.status(404).json({ error: 'المستخدم غير موجود' });
      recipientId = userRes.rows[0].id;
    }

    if (!recipientId || !amount || amount <= 0) return res.status(400).json({ error: 'يجب تحديد المستلم والمبلغ الصالح' });
    if (recipientId === req.user.id) return res.status(400).json({ error: 'لا يمكنك التحويل لنفسك' });
    const from = await query('SELECT wallet, role FROM users WHERE id=$1', [req.user.id]);
    const isTransferAdmin = from.rows[0].role === 'ADMIN';
    if (!isTransferAdmin && parseFloat(from.rows[0].wallet) < amount) return res.status(400).json({ error: 'رصيد غير كافٍ' });
    if (!isTransferAdmin) {
      await query('UPDATE users SET wallet = wallet - $1 WHERE id = $2', [amount, req.user.id]);
    }
    await query('UPDATE users SET wallet = wallet + $1 WHERE id = $2', [amount, recipientId]);
    await query(`INSERT INTO transfers (from_user,to_user,amount,type,notes,status) VALUES ($1,$2,$3,'transfer',$4,'completed')`, [req.user.id, recipientId, amount, notes||null]);
    await query(`INSERT INTO transactions (type,amount,status,client_id,processed_by) VALUES ('transfer',$1,'success',$2,$3)`, [amount, recipientId, req.user.id]);
    res.json({ success: true, message: 'Transfer completed' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

module.exports = { addBalance, removeBalance, transfer, getHistory };
