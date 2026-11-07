const { query } = require('../config/database');

const getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const type = req.query.type; // flexy, idoom, card, transfer, debt, etc.
    const status = req.query.status;
    const search = req.query.search;
    const filterClientId = req.query.client_id;
    const date_from = req.query.date_from;
    const date_to = req.query.date_to;

    let whereClauses = [];
    let params = [];
    let paramIndex = 1;

    if (filterClientId) {
      if (!isAdmin) {
        // Enforce hierarchy / IDOR check: non-admin can only see their own clients or themselves
        const checkChild = await query(
          'SELECT id FROM users WHERE id = $1 AND (parent_id = $2 OR id = $2)',
          [filterClientId, userId]
        );
        if (checkChild.rows.length === 0) {
          return res.status(403).json({ error: 'غير مصرح لك بالوصول لبيانات هذا العميل' });
        }
      }
      whereClauses.push(`(t.client_id = $${paramIndex} OR t.processed_by = $${paramIndex})`);
      params.push(filterClientId);
      paramIndex++;
    } else if (!isAdmin) {
      whereClauses.push(`(t.client_id = $${paramIndex} OR t.processed_by = $${paramIndex})`);
      params.push(userId);
      paramIndex++;
    }

    if (type) {
      whereClauses.push(`t.type = $${paramIndex++}`);
      params.push(type);
    }

    if (status) {
      whereClauses.push(`t.status = $${paramIndex++}`);
      params.push(status);
    }

    if (date_from) {
      whereClauses.push(`t.created_at >= $${paramIndex++}`);
      params.push(date_from);
    }

    if (date_to) {
      whereClauses.push(`t.created_at <= $${paramIndex++}`);
      params.push(date_to + ' 23:59:59');
    }

    if (search) {
      whereClauses.push(
        `(u.username ILIKE $${paramIndex} OR u.full_name ILIKE $${paramIndex} OR t.phone_number ILIKE $${paramIndex} OR CAST(t.id AS TEXT) ILIKE $${paramIndex} OR t.metadata::text ILIKE $${paramIndex})`
      );
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countResult = await query(`
      SELECT COUNT(*) FROM transactions t 
      LEFT JOIN users u ON t.client_id = u.id 
      ${whereStr}
    `, params);
    const total = parseInt(countResult.rows[0].count);

    // Get transactions with user details and sender/recipient information
    const txQuery = `
      SELECT t.*, 
             u.username as client_name, u.full_name as client_full_name,
             p.username as processed_by_name, p.full_name as processed_by_full_name,
             COALESCE(t.metadata->>'notes', t.metadata->>'transfer_type', '') as notes_text
      FROM transactions t
      LEFT JOIN users u ON t.client_id = u.id
      LEFT JOIN users p ON t.processed_by = p.id
      ${whereStr}
      ORDER BY t.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const txResult = await query(txQuery, [...params, limit, offset]);

    res.json({
      success: true,
      transactions: txResult.rows,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Get transactions error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getTransactions };
