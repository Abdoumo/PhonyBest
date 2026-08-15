const { query } = require('../config/database');
const { createApiDefinition, getApiDefinitions } = require('../services/modemGridService');

/**
 * GET /api/v1/admin/offer-mappings
 * List all offer to API mappings
 */
const getOfferMappings = async (req, res) => {
  try {
    const result = await query('SELECT * FROM offer_api_mappings ORDER BY service_type, operator, offer_name');
    res.json({ success: true, mappings: result.rows });
  } catch (error) {
    console.error('Error fetching offer mappings:', error);
    res.status(500).json({ success: false, error: 'Server error fetching mappings' });
  }
};

/**
 * POST /api/v1/admin/offer-mappings
 * Create a new offer mapping
 */
const createOfferMapping = async (req, res) => {
  try {
    const { service_type, operator, offer_name, modemgrid_api_name, sync_to_modemgrid, modemgrid_api_def } = req.body;

    if (!service_type || !operator || !offer_name || !modemgrid_api_name) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Check if it exists
    const existing = await query(
      'SELECT id FROM offer_api_mappings WHERE service_type = $1 AND operator = $2 AND offer_name = $3',
      [service_type, operator, offer_name]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Mapping already exists for this offer' });
    }

    // Optionally sync to Modem Grid
    if (sync_to_modemgrid && modemgrid_api_def) {
      try {
        await createApiDefinition({
          name: modemgrid_api_name,
          ...modemgrid_api_def
        });
        console.log(`Synced API ${modemgrid_api_name} to Modem Grid successfully.`);
      } catch (err) {
        console.error('Failed to sync API to Modem Grid:', err.message);
        return res.status(500).json({ success: false, error: `Failed to create API on Modem Grid: ${err.message}` });
      }
    }

    const result = await query(
      `INSERT INTO offer_api_mappings (service_type, operator, offer_name, modemgrid_api_name, is_active)
       VALUES ($1, $2, $3, $4, true) RETURNING *`,
      [service_type, operator, offer_name, modemgrid_api_name]
    );

    res.json({ success: true, mapping: result.rows[0] });
  } catch (error) {
    console.error('Error creating offer mapping:', error);
    res.status(500).json({ success: false, error: 'Server error creating mapping' });
  }
};

/**
 * PUT /api/v1/admin/offer-mappings/:id
 * Update an existing mapping
 */
const updateOfferMapping = async (req, res) => {
  try {
    const { id } = req.params;
    const { service_type, operator, offer_name, modemgrid_api_name, is_active } = req.body;

    const result = await query(
      `UPDATE offer_api_mappings 
       SET service_type = COALESCE($1, service_type),
           operator = COALESCE($2, operator),
           offer_name = COALESCE($3, offer_name),
           modemgrid_api_name = COALESCE($4, modemgrid_api_name),
           is_active = COALESCE($5, is_active)
       WHERE id = $6 RETURNING *`,
      [service_type, operator, offer_name, modemgrid_api_name, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Mapping not found' });
    }

    res.json({ success: true, mapping: result.rows[0] });
  } catch (error) {
    console.error('Error updating offer mapping:', error);
    res.status(500).json({ success: false, error: 'Server error updating mapping' });
  }
};

/**
 * DELETE /api/v1/admin/offer-mappings/:id
 * Delete a mapping
 */
const deleteOfferMapping = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM offer_api_mappings WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Mapping not found' });
    }

    res.json({ success: true, message: 'Mapping deleted successfully' });
  } catch (error) {
    console.error('Error deleting offer mapping:', error);
    res.status(500).json({ success: false, error: 'Server error deleting mapping' });
  }
};

/**
 * GET /api/v1/admin/offer-mappings/modemgrid-apis
 * Fetch existing API definitions from Modem Grid
 */
const getModemGridApis = async (req, res) => {
  try {
    const apis = await getApiDefinitions();
    res.json({ success: true, apis: apis || [] });
  } catch (error) {
    console.error('Error fetching Modem Grid APIs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch APIs from Modem Grid' });
  }
};

module.exports = {
  getOfferMappings,
  createOfferMapping,
  updateOfferMapping,
  deleteOfferMapping,
  getModemGridApis
};
