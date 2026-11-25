const { query } = require('../config/database');
const { createApiDefinition, getApiDefinitions } = require('../services/modemGridService');
const nodeManager = require('../wss/nodeManager');
const requestQueue = require('../wss/requestQueue');

// Predefined catalog of standard services and operator offers
const STANDARD_CATALOG = [
  // Flexy Gros
  { service_type: 'flexy_gros', operator: 'mobilis', offer_name: 'default', title: 'فليكسي موبيليس جملة (Mobilis Gros)', category: 'flexy_gros' },
  { service_type: 'flexy_gros', operator: 'djezzy', offer_name: 'default', title: 'فليكسي جيزي جملة (Djezzy Gros)', category: 'flexy_gros' },
  { service_type: 'flexy_gros', operator: 'ooredoo', offer_name: 'default', title: 'فليكسي أوريدو جملة (Ooredoo Gros)', category: 'flexy_gros' },

  // Flexy Normal
  { service_type: 'flexy', operator: 'mobilis', offer_name: 'default', title: 'فليكسي موبيليس عادي (Mobilis Flexy)', category: 'flexy' },
  { service_type: 'flexy', operator: 'djezzy', offer_name: 'default', title: 'فليكسي جيزي عادي (Djezzy Flexy)', category: 'flexy' },
  { service_type: 'flexy', operator: 'ooredoo', offer_name: 'default', title: 'فليكسي أوريدو عادي (Ooredoo Flexy)', category: 'flexy' },

  // Mobilis Offers
  { service_type: 'flexy', operator: 'mobilis', offer_name: 'Sama Mix 50', title: 'Mobilis Sama Mix 50', category: 'offers' },
  { service_type: 'flexy', operator: 'mobilis', offer_name: 'Sama Mix 100', title: 'Mobilis Sama Mix 100', category: 'offers' },
  { service_type: 'flexy', operator: 'mobilis', offer_name: 'Sama Mix 500', title: 'Mobilis Sama Mix 500', category: 'offers' },
  { service_type: 'flexy', operator: 'mobilis', offer_name: 'Sama Mix 1000', title: 'Mobilis Sama Mix 1000', category: 'offers' },
  { service_type: 'flexy', operator: 'mobilis', offer_name: 'Sama Mix 1500', title: 'Mobilis Sama Mix 1500', category: 'offers' },
  { service_type: 'flexy', operator: 'mobilis', offer_name: 'Sama Mix 2000', title: 'Mobilis Sama Mix 2000', category: 'offers' },
  { service_type: 'flexy', operator: 'mobilis', offer_name: 'Sama Talk 500', title: 'Mobilis Sama Talk 500', category: 'offers' },
  { service_type: 'flexy', operator: 'mobilis', offer_name: 'Sama Talk 1000', title: 'Mobilis Sama Talk 1000', category: 'offers' },
  { service_type: 'flexy', operator: 'mobilis', offer_name: 'Sama Net 500', title: 'Mobilis Sama Net 500', category: 'offers' },
  { service_type: 'flexy', operator: 'mobilis', offer_name: 'Sama Net 1000', title: 'Mobilis Sama Net 1000', category: 'offers' },
  { service_type: 'flexy', operator: 'mobilis', offer_name: 'Sama Net 1500', title: 'Mobilis Sama Net 1500', category: 'offers' },
  { service_type: 'flexy', operator: 'mobilis', offer_name: 'Sama Net 2000', title: 'Mobilis Sama Net 2000', category: 'offers' },
  { service_type: 'flexy', operator: 'mobilis', offer_name: 'PixX 50', title: 'Mobilis PixX 50', category: 'offers' },
  { service_type: 'flexy', operator: 'mobilis', offer_name: 'PixX 100', title: 'Mobilis PixX 100', category: 'offers' },
  { service_type: 'flexy', operator: 'mobilis', offer_name: 'PixX 500', title: 'Mobilis PixX 500', category: 'offers' },
  { service_type: 'flexy', operator: 'mobilis', offer_name: 'PixX 1000', title: 'Mobilis PixX 1000', category: 'offers' },
  { service_type: 'flexy', operator: 'mobilis', offer_name: 'PixX 2000', title: 'Mobilis PixX 2000', category: 'offers' },

  // Djezzy Offers
  { service_type: 'flexy', operator: 'djezzy', offer_name: 'HAYLA BEZZEF Special 500 Da', title: 'Djezzy Hayla Bezzef 500', category: 'offers' },
  { service_type: 'flexy', operator: 'djezzy', offer_name: 'HAYLA BEZZEF Classic 1000 Da', title: 'Djezzy Hayla Bezzef 1000', category: 'offers' },
  { service_type: 'flexy', operator: 'djezzy', offer_name: 'HAYLA BEZZEF Classic 1500 Da', title: 'Djezzy Hayla Bezzef 1500', category: 'offers' },
  { service_type: 'flexy', operator: 'djezzy', offer_name: 'HAYLA BEZZEF Classic 2000 Da', title: 'Djezzy Hayla Bezzef 2000', category: 'offers' },
  { service_type: 'flexy', operator: 'djezzy', offer_name: 'HAYLA BEZZEF Extra 3000 Da', title: 'Djezzy Hayla Bezzef 3000', category: 'offers' },

  // Ooredoo Offers
  { service_type: 'flexy', operator: 'ooredoo', offer_name: 'Gold 1000', title: 'Ooredoo Gold 1000', category: 'offers' },
  { service_type: 'flexy', operator: 'ooredoo', offer_name: 'Gold 1500', title: 'Ooredoo Gold 1500', category: 'offers' },
  { service_type: 'flexy', operator: 'ooredoo', offer_name: 'Gold 2000', title: 'Ooredoo Gold 2000', category: 'offers' },
  { service_type: 'flexy', operator: 'ooredoo', offer_name: 'Gold 2500', title: 'Ooredoo Gold 2500', category: 'offers' },
  { service_type: 'flexy', operator: 'ooredoo', offer_name: 'Gold 4000', title: 'Ooredoo Gold 4000', category: 'offers' },
  { service_type: 'flexy', operator: 'ooredoo', offer_name: 'Yooz 500', title: 'Ooredoo Yooz 500', category: 'offers' },
  { service_type: 'flexy', operator: 'ooredoo', offer_name: 'Yooz 1000', title: 'Ooredoo Yooz 1000', category: 'offers' },
  { service_type: 'flexy', operator: 'ooredoo', offer_name: 'Yooz 1500', title: 'Ooredoo Yooz 1500', category: 'offers' },

  // Idoom
  { service_type: 'idoom', operator: 'adsl', offer_name: 'adsl', title: 'أيدوم ADSL (Idoom ADSL)', category: 'idoom' },
  { service_type: 'idoom', operator: 'fibre', offer_name: 'fibre', title: 'أيدوم فيبر (Idoom Fibre FTTH)', category: 'idoom' },
  { service_type: 'idoom', operator: '4g_lte', offer_name: '4g_lte', title: 'أيدوم 4G LTE (Idoom 4G)', category: 'idoom' },
];

/**
 * GET /api/v1/admin/offer-mappings
 * List all offer to API mappings
 */
const getOfferMappings = async (req, res) => {
  try {
    const result = await query(`
      SELECT id, service_type, operator, offer_name, modemgrid_api_name, 
             COALESCE(description, '') as description, 
             default_amount, 
             COALESCE(variables, '{}'::jsonb) as variables,
             is_active, created_at 
      FROM offer_api_mappings 
      ORDER BY service_type, operator, offer_name
    `);
    res.json({ success: true, mappings: result.rows });
  } catch (error) {
    console.error('Error fetching offer mappings:', error);
    res.status(500).json({ success: false, error: 'Server error fetching mappings' });
  }
};

/**
 * GET /api/v1/admin/offer-mappings/catalog
 * Returns standard known catalog with mapped status
 */
const getOfferCatalog = async (req, res) => {
  try {
    const mappingsRes = await query('SELECT * FROM offer_api_mappings');
    const existing = mappingsRes.rows;

    const catalogWithStatus = STANDARD_CATALOG.map(item => {
      const match = existing.find(m =>
        m.service_type === item.service_type &&
        m.operator.toLowerCase() === item.operator.toLowerCase() &&
        (m.offer_name.toLowerCase() === item.offer_name.toLowerCase() ||
         (item.offer_name === 'default' && (m.offer_name === '' || m.offer_name === 'default' || m.offer_name === 'gros')))
      );

      return {
        ...item,
        is_mapped: !!match,
        mapping_id: match ? match.id : null,
        modemgrid_api_name: match ? match.modemgrid_api_name : null,
        is_active: match ? match.is_active : false,
        description: match ? match.description : null,
        default_amount: match ? match.default_amount : null
      };
    });

    res.json({ success: true, catalog: catalogWithStatus });
  } catch (error) {
    console.error('Error fetching offer catalog:', error);
    res.status(500).json({ success: false, error: 'Server error fetching catalog' });
  }
};

/**
 * GET /api/v1/admin/offer-mappings/node-apis
 * Fetch all APIs discovered on connected WSS nodes + DB cache
 */
const getNodeApis = async (req, res) => {
  try {
    const result = await nodeManager.fetchAllNodesApis(6000);
    res.json(result);
  } catch (error) {
    console.error('Error fetching node APIs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch node APIs' });
  }
};

/**
 * POST /api/v1/admin/offer-mappings/sync-apis
 * Sends socket request {"type": "getallapis", "request_id": "..."} to online nodes
 */
const syncNodeApis = async (req, res) => {
  try {
    const { node_id } = req.body;
    let result;

    if (node_id) {
      result = await nodeManager.fetchApisFromNode(node_id, 15000);
    } else {
      result = await nodeManager.fetchAllNodesApis(15000);
    }

    res.json({
      success: true,
      message: 'تم إرسال طلب getallapis وتحديث قائمة الواجهات بنجاح',
      ...result
    });
  } catch (error) {
    console.error('Error syncing node APIs:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to sync APIs from node' });
  }
};

/**
 * POST /api/v1/admin/offer-mappings
 * Create a new offer mapping
 */
const createOfferMapping = async (req, res) => {
  try {
    const {
      service_type,
      operator,
      offer_name,
      modemgrid_api_name,
      description,
      default_amount,
      variables,
      sync_to_modemgrid,
      modemgrid_api_def
    } = req.body;

    if (!service_type || !operator || !offer_name || !modemgrid_api_name) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Check if it exists
    const existing = await query(
      'SELECT id FROM offer_api_mappings WHERE service_type = $1 AND operator = $2 AND offer_name = $3',
      [service_type, operator.toLowerCase(), offer_name]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Mapping already exists for this offer' });
    }

    // Optionally sync to Modem Grid REST
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
      `INSERT INTO offer_api_mappings (service_type, operator, offer_name, modemgrid_api_name, description, default_amount, variables, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true) RETURNING *`,
      [
        service_type,
        operator.toLowerCase(),
        offer_name,
        modemgrid_api_name,
        description || null,
        default_amount || null,
        JSON.stringify(variables || {})
      ]
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
    const {
      service_type,
      operator,
      offer_name,
      modemgrid_api_name,
      description,
      default_amount,
      variables,
      is_active
    } = req.body;

    const result = await query(
      `UPDATE offer_api_mappings 
       SET service_type = COALESCE($1, service_type),
           operator = COALESCE($2, operator),
           offer_name = COALESCE($3, offer_name),
           modemgrid_api_name = COALESCE($4, modemgrid_api_name),
           description = COALESCE($5, description),
           default_amount = COALESCE($6, default_amount),
           variables = COALESCE($7, variables),
           is_active = COALESCE($8, is_active)
       WHERE id = $9 RETURNING *`,
      [
        service_type,
        operator ? operator.toLowerCase() : null,
        offer_name,
        modemgrid_api_name,
        description !== undefined ? description : null,
        default_amount !== undefined ? default_amount : null,
        variables !== undefined ? JSON.stringify(variables) : null,
        is_active,
        id
      ]
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
 * POST /api/v1/admin/offer-mappings/test-api
 * Direct test execution of an API on a connected node
 */
const testApiExecution = async (req, res) => {
  try {
    const { api_name, variables = {}, node_id } = req.body;
    if (!api_name) {
      return res.status(400).json({ error: 'API name is required' });
    }

    const onlineNodeIds = nodeManager.getOnlineNodeIds();
    const targetNodeId = node_id || onlineNodeIds[0];

    if (!targetNodeId) {
      return res.status(400).json({ error: 'لا يوجد جهاز ModemGrid متصل حالياً لإجراء الاختبار' });
    }

    const result = await requestQueue.enqueue(
      targetNodeId,
      api_name,
      variables,
      null
    );

    res.json({
      success: true,
      message: 'تم تنفيذ الاختبار بنجاح',
      node_id: targetNodeId,
      result
    });
  } catch (error) {
    console.error('Test API error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error executing test API'
    });
  }
};

/**
 * GET /api/v1/admin/offer-mappings/modemgrid-apis
 * Fetch existing API definitions from Modem Grid REST service fallback
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
  getOfferCatalog,
  getNodeApis,
  syncNodeApis,
  createOfferMapping,
  updateOfferMapping,
  deleteOfferMapping,
  testApiExecution,
  getModemGridApis
};
