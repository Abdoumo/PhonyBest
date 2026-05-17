const { query } = require('../config/database');

const getAds = async (req, res) => {
  try {
    const ads = await query(`SELECT * FROM advertisements WHERE active = true AND (starts_at IS NULL OR starts_at <= NOW()) AND (ends_at IS NULL OR ends_at >= NOW()) ORDER BY created_at DESC`);
    res.json({ success: true, ads: ads.rows });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const getAllAds = async (req, res) => {
  try {
    const ads = await query('SELECT a.*, u.username as created_by_name FROM advertisements a LEFT JOIN users u ON a.created_by = u.id ORDER BY a.created_at DESC');
    res.json({ success: true, ads: ads.rows });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const createAd = async (req, res) => {
  try {
    const { title, content, link_url, position, active, order } = req.body;
    let image_url = req.body.image_url;
    if (req.file) {
      image_url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    }
    const result = await query(
      `INSERT INTO advertisements (title,content,image_url,link_url,position,active,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [title, content, image_url, link_url, position||'dashboard', active === 'true' || active === true, req.user.id]
    );
    res.status(201).json({ success: true, ad: result.rows[0] });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const updateAd = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, link_url, position, active, order } = req.body;
    let image_url = req.body.image_url;
    if (req.file) {
      image_url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    }
    const result = await query(
      `UPDATE advertisements SET title=$1, content=$2, image_url=$3, link_url=$4, position=$5, active=$6 WHERE id=$7 RETURNING *`,
      [title, content, image_url, link_url, position||'dashboard', active === 'true' || active === true, id]
    );
    res.json({ success: true, ad: result.rows[0] });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const updateAdStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;
    await query(`UPDATE advertisements SET active = $1 WHERE id = $2`, [active, id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const deleteAd = async (req, res) => {
  try {
    const { id } = req.params;
    await query(`DELETE FROM advertisements WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

module.exports = { getAds, getAllAds, createAd, updateAd, updateAdStatus, deleteAd };
