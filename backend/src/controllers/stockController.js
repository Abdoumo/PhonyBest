const { query } = require('../config/database');
const { getTotalBalance } = require('../wss/dongleManager');

exports.getStockOverview = async (req, res) => {
  try {
    const [mobilis, djezzy, ooredoo, idoom] = await Promise.all([
      getTotalBalance('mobilis'),
      getTotalBalance('djezzy'),
      getTotalBalance('ooredoo'),
      getTotalBalance('idoom')
    ]);

    const cardsRes = await query(`SELECT COUNT(*) as total FROM cards WHERE status = 'available'`);
    const cards = parseInt(cardsRes.rows[0].total) || 0;

    res.json({
      success: true,
      stock: {
        mobilis,
        djezzy,
        ooredoo,
        idoom,
        cards,
        coupons: 0
      }
    });
  } catch (error) {
    console.error('Error fetching stock overview:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
