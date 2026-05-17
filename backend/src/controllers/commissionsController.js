const { query } = require('../config/database');

const getCommissions = async (req, res) => {
  try {
    const result = await query('SELECT * FROM commission_offers ORDER BY service, operator, role');
    res.json({ success: true, offers: result.rows });
  } catch (err) { 
    console.error(err);
    res.status(500).json({ error: 'Server error' }); 
  }
};

const setCommission = async (req, res) => {
  try {
    const { id, role, service, operator, base_amount, admin_cost, client_price } = req.body;
    
    if (id) {
      // Update existing
      const result = await query(
        `UPDATE commission_offers 
         SET role=$1, service=$2, operator=$3, base_amount=$4, admin_cost=$5, client_price=$6 
         WHERE id=$7 RETURNING *`,
        [role, service, operator, base_amount, admin_cost, client_price, id]
      );
      return res.json({ success: true, offer: result.rows[0] });
    } else {
      // Insert new
      const result = await query(
        `INSERT INTO commission_offers (role, service, operator, base_amount, admin_cost, client_price) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [role, service, operator, base_amount, admin_cost, client_price]
      );
      return res.json({ success: true, offer: result.rows[0] });
    }
  } catch (err) { 
    console.error(err);
    res.status(500).json({ error: 'Server error' }); 
  }
};

const deleteCommission = async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM commission_offers WHERE id=$1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getCommissions, setCommission, deleteCommission };
