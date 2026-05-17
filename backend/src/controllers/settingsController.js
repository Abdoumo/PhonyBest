const { query } = require('../config/database');

const getSettings = async (req, res) => {
  try {
    const result = await query('SELECT key, value FROM settings');
    const settings = {};
    result.rows.forEach(r => {
      try {
        settings[r.key] = JSON.parse(r.value);
      } catch (e) {
        settings[r.key] = r.value;
      }
    });
    res.json({ success: true, settings });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const updateSettings = async (req, res) => {
  try {
    const settings = req.body;
    for (const [key, value] of Object.entries(settings)) {
      await query(`
        INSERT INTO settings (key, value) VALUES ($1, $2)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `, [key, typeof value === 'string' ? value : JSON.stringify(value)]);
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

module.exports = { getSettings, updateSettings };
