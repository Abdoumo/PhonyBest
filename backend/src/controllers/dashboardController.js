const { query } = require('../config/database');

const getDashboardStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const userId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    const [todayEarnings, totalTx, failedTx, activeSims, totalUsers, walletSum, myWallet] = await Promise.all([
      query(`SELECT COALESCE(SUM(profit),0) as total FROM transactions WHERE DATE(created_at)=$1 AND status='success' ${!isAdmin ? `AND processed_by=${userId}` : ''}`, [today]),
      query(`SELECT COUNT(*) as total FROM transactions WHERE DATE(created_at)=$1 ${!isAdmin ? `AND client_id=${userId}` : ''}`, [today]),
      query(`SELECT COUNT(*) as total FROM transactions WHERE status='failed' AND DATE(created_at)=$1 ${!isAdmin ? `AND client_id=${userId}` : ''}`, [today]),
      query(`SELECT COUNT(*) as total FROM sim_cards WHERE status='active'`),
      query(`SELECT COUNT(*) as total FROM users WHERE status='active' ${!isAdmin ? `AND parent_id=${userId}` : ''}`),
      query(`SELECT COALESCE(SUM(wallet),0) as total FROM users`),
      query(`SELECT wallet FROM users WHERE id=$1`, [userId])
    ]);

    const recentTx = await query(`SELECT t.*, u.username as client_name FROM transactions t LEFT JOIN users u ON t.client_id=u.id ${!isAdmin ? `WHERE t.client_id=${userId}` : ''} ORDER BY t.created_at DESC LIMIT 10`);
    const chartData = await query(`SELECT DATE(created_at) as date, SUM(amount) as volume, SUM(profit) as profit, COUNT(*) as count FROM transactions WHERE created_at >= NOW() - INTERVAL '30 days' AND status='success' ${!isAdmin ? `AND client_id=${userId}` : ''} GROUP BY DATE(created_at) ORDER BY date`);

    res.json({
      success: true,
      stats: {
        todayEarnings: parseFloat(todayEarnings.rows[0].total),
        totalTransactions: parseInt(totalTx.rows[0].total),
        failedOperations: parseInt(failedTx.rows[0].total),
        activeSims: parseInt(activeSims.rows[0].total),
        totalUsers: parseInt(totalUsers.rows[0].total),
        totalWalletBalance: parseFloat(walletSum.rows[0].total),
        myWalletBalance: parseFloat(myWallet.rows[0].wallet)
      },
      recentTransactions: recentTx.rows,
      chartData: chartData.rows,
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getDashboardStats };
