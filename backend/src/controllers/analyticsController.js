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

exports.getOverview = async (req, res) => {
  try {
    // 1. Service Distribution (Pie Chart) - Last 30 days
    const pieRes = await query(`
      SELECT 
        CASE 
          WHEN type IN ('flexy', 'flexy_gros') THEN 'فليكسي'
          WHEN type = 'idoom' THEN 'أيدوم'
          WHEN type IN ('buy_cards', 'card') THEN 'البطاقات'
          WHEN type = 'transfer' THEN 'التحويلات'
          ELSE 'أخرى'
        END as name,
        COALESCE(SUM(amount), 0) as value
      FROM transactions
      WHERE status IN ('success', 'completed')
        AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY name
    `);
    
    let pieData = pieRes.rows.map(r => ({ name: r.name, value: Number(r.value) }));
    
    // Ensure all main categories exist even if 0
    const categories = ['فليكسي', 'أيدوم', 'البطاقات', 'التحويلات'];
    categories.forEach(cat => {
      if (!pieData.find(p => p.name === cat)) {
        pieData.push({ name: cat, value: 0 });
      }
    });

    // 2. Weekly Revenue (Bar Chart) - Last 7 days
    const barRes = await query(`
      WITH last_7_days AS (
        SELECT current_date - i AS d
        FROM generate_series(0, 6) i
      )
      SELECT 
        to_char(d, 'Day') as day_name,
        d as date,
        COALESCE(SUM(t.amount), 0) as revenue
      FROM last_7_days
      LEFT JOIN transactions t 
        ON DATE(t.created_at) = d 
        AND t.status IN ('success', 'completed')
      GROUP BY d, day_name
      ORDER BY d ASC
    `);
    
    // Translate English day names to Arabic
    const daysMap = {
      'sunday': 'الأحد',
      'monday': 'الإثنين',
      'tuesday': 'الثلاثاء',
      'wednesday': 'الأربعاء',
      'thursday': 'الخميس',
      'friday': 'الجمعة',
      'saturday': 'السبت'
    };
    
    const barData = barRes.rows.map(r => ({
      day: daysMap[r.day_name.trim().toLowerCase()] || r.day_name.trim(),
      revenue: Number(r.revenue)
    }));

    // 3. Stats (Net Profit, Best Operator, ARPU)
    // Net profit
    const profitRes = await query(`
      SELECT COALESCE(SUM(profit), 0) as total_profit 
      FROM transactions 
      WHERE status IN ('success', 'completed')
    `);
    const netProfit = Number(profitRes.rows[0].total_profit);

    // Best Operator
    const operatorRes = await query(`
      SELECT operator, COALESCE(SUM(amount), 0) as volume
      FROM transactions
      WHERE status IN ('success', 'completed') 
        AND operator IN ('mobilis', 'djezzy', 'ooredoo')
      GROUP BY operator
      ORDER BY volume DESC
      LIMIT 1
    `);
    
    let bestOperator = 'لا يوجد';
    let bestOperatorPercentage = 0;
    
    if (operatorRes.rows.length > 0) {
      const topOpName = operatorRes.rows[0].operator;
      if (topOpName.toLowerCase() === 'mobilis') bestOperator = 'موبيليس';
      else if (topOpName.toLowerCase() === 'ooredoo') bestOperator = 'أوريدو';
      else if (topOpName.toLowerCase() === 'djezzy') bestOperator = 'جيزي';
      
      const totalOpsRes = await query(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE status IN ('success', 'completed') 
          AND operator IN ('mobilis', 'djezzy', 'ooredoo')
      `);
      const totalOpsVolume = Number(totalOpsRes.rows[0].total);
      if (totalOpsVolume > 0) {
        bestOperatorPercentage = Math.round((Number(operatorRes.rows[0].volume) / totalOpsVolume) * 100);
      }
    }

    // ARPU (Average Revenue Per User)
    const arpuRes = await query(`
      SELECT 
        COUNT(DISTINCT client_id) as active_users,
        COALESCE(SUM(amount), 0) as total_revenue
      FROM transactions
      WHERE status IN ('success', 'completed')
        AND created_at >= date_trunc('month', CURRENT_DATE)
    `);
    
    const activeUsers = Number(arpuRes.rows[0].active_users);
    const totalRev = Number(arpuRes.rows[0].total_revenue);
    const arpu = activeUsers > 0 ? Math.round(totalRev / activeUsers) : 0;

    res.json({
      success: true,
      data: {
        pieData,
        barData,
        stats: {
          netProfit,
          bestOperator,
          bestOperatorPercentage,
          arpu
        }
      }
    });
  } catch (error) {
    console.error('Error fetching analytics overview:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
