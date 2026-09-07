const { query } = require('../config/database');

exports.getConsumption = async (req, res) => {
  try {
    const { search } = req.query;

    let sql = `
      SELECT 
        u.id, 
        u.username, 
        u.full_name,
        u.role,
        COALESCE(SUM(t.amount) FILTER (WHERE t.status IN ('success', 'completed')), 0) as total_consumed,
        COALESCE(SUM(t.amount) FILTER (WHERE t.status IN ('success', 'completed') AND LOWER(t.operator) = 'mobilis'), 0) as mobilis_consumed,
        COALESCE(SUM(t.amount) FILTER (WHERE t.status IN ('success', 'completed') AND LOWER(t.operator) = 'ooredoo'), 0) as ooredoo_consumed,
        COALESCE(SUM(t.amount) FILTER (WHERE t.status IN ('success', 'completed') AND LOWER(t.operator) = 'djezzy'), 0) as djezzy_consumed,
        COALESCE(SUM(t.amount) FILTER (WHERE t.status IN ('success', 'completed') AND t.type IN ('buy_cards', 'card')), 0) as cards_consumed,
        COALESCE(SUM(t.amount) FILTER (WHERE t.status IN ('success', 'completed') AND t.type = 'idoom'), 0) as idoom_consumed
      FROM users u
      LEFT JOIN transactions t ON t.client_id = u.id
    `;

    const params = [];
    if (search) {
      sql += ` WHERE (u.username ILIKE $1 OR u.full_name ILIKE $1) `;
      params.push(`%${search}%`);
    }

    sql += `
      GROUP BY u.id, u.username, u.full_name, u.role
      ORDER BY total_consumed DESC
    `;

    const result = await query(sql, params);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching consumption analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
