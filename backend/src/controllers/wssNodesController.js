/**
 * WSS Nodes Controller
 * REST API for managing ModemGrid nodes, dongles, pools, and monitoring
 */
const { query } = require('../config/database');
const authService = require('../wss/authService');
const nodeManager = require('../wss/nodeManager');
const dongleManager = require('../wss/dongleManager');
const poolManager = require('../wss/poolManager');
const requestQueue = require('../wss/requestQueue');
const routingEngine = require('../wss/routingEngine');

/**
 * GET /api/v1/wss/nodes — List all registered nodes with live status
 */
const getNodes = async (req, res) => {
  try {
    const nodes = await nodeManager.getAllNodes();
    res.json({ success: true, nodes });
  } catch (err) {
    console.error('Get nodes error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * POST /api/v1/wss/nodes — Register a new node (generates token)
 */
const createNode = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Node name is required' });
    }

    // Generate token
    const { rawToken, tokenHash } = await authService.generateNodeToken();

    // Insert node
    const result = await query(
      `INSERT INTO wss_nodes (name, token_hash, status) VALUES ($1, $2, 'offline') RETURNING id, name, status, created_at`,
      [name.trim(), tokenHash]
    );

    const node = result.rows[0];

    // Log event
    await nodeManager.logEvent(node.id, node.name, 'created', `Node "${node.name}" registered`);

    res.json({
      success: true,
      node,
      token: rawToken, // Only shown once!
      message: 'Save this token — it will not be shown again',
    });
  } catch (err) {
    console.error('Create node error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * DELETE /api/v1/wss/nodes/:id — Remove a node
 */
const deleteNode = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if node exists
    const existing = await query('SELECT * FROM wss_nodes WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Node not found' });
    }

    const nodeName = existing.rows[0].name;

    // Delete (cascades to wss_dongles and wss_pools)
    await query('DELETE FROM wss_nodes WHERE id = $1', [id]);

    // Log event
    await nodeManager.logEvent(parseInt(id), nodeName, 'deleted', `Node "${nodeName}" removed`);

    res.json({ success: true, message: 'Node removed' });
  } catch (err) {
    console.error('Delete node error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * PUT /api/v1/wss/nodes/:id/regenerate-token — Regenerate token for a node
 */
const regenerateToken = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await query('SELECT * FROM wss_nodes WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Node not found' });
    }

    const { rawToken, tokenHash } = await authService.generateNodeToken();

    await query('UPDATE wss_nodes SET token_hash = $1, updated_at = NOW() WHERE id = $2', [tokenHash, id]);

    await nodeManager.logEvent(parseInt(id), existing.rows[0].name, 'token_regenerated', `Token regenerated for "${existing.rows[0].name}"`);

    res.json({
      success: true,
      token: rawToken,
      message: 'Save this token — it will not be shown again',
    });
  } catch (err) {
    console.error('Regenerate token error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * GET /api/v1/wss/nodes/:id/dongles — Get dongles for a specific node
 */
const getNodeDongles = async (req, res) => {
  try {
    const dongles = await dongleManager.getDonglesByNode(parseInt(req.params.id));
    res.json({ success: true, dongles });
  } catch (err) {
    console.error('Get node dongles error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * GET /api/v1/wss/dongles — List all dongles across all nodes
 */
const getAllDongles = async (req, res) => {
  try {
    const dongles = await dongleManager.getAllDongles();
    res.json({ success: true, dongles });
  } catch (err) {
    console.error('Get all dongles error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * GET /api/v1/wss/pools — List all pools across all nodes
 */
const getAllPools = async (req, res) => {
  try {
    const pools = await poolManager.getAllPools();
    res.json({ success: true, pools });
  } catch (err) {
    console.error('Get all pools error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * GET /api/v1/wss/stats — Aggregate stats
 */
const getStats = async (req, res) => {
  try {
    const [nodes, dongleStats, pendingCount, routingSummary] = await Promise.all([
      nodeManager.getAllNodes(),
      dongleManager.getDongleStats(),
      requestQueue.getPendingCount(),
      routingEngine.getRoutingSummary(),
    ]);

    const onlineNodes = nodes.filter(n => n.status === 'online').length;
    const totalNodes = nodes.length;

    res.json({
      success: true,
      stats: {
        totalNodes,
        onlineNodes,
        offlineNodes: totalNodes - onlineNodes,
        totalDongles: parseInt(dongleStats.total_dongles) || 0,
        onlineDongles: parseInt(dongleStats.online_dongles) || 0,
        totalBalance: parseFloat(dongleStats.total_balance) || 0,
        onlineBalance: parseFloat(dongleStats.online_balance) || 0,
        pendingRequests: pendingCount,
        routing: routingSummary,
      },
    });
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * GET /api/v1/wss/queue — Current request queue
 */
const getQueue = async (req, res) => {
  try {
    const queue = await requestQueue.getQueue();
    res.json({ success: true, queue });
  } catch (err) {
    console.error('Get queue error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * GET /api/v1/wss/events — Recent events log
 */
const getEvents = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const events = await nodeManager.getRecentEvents(limit);
    res.json({ success: true, events });
  } catch (err) {
    console.error('Get events error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * GET /api/v1/wss/history — Request history
 */
const getHistory = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const history = await requestQueue.getHistory(limit);
    res.json({ success: true, history });
  } catch (err) {
    console.error('Get history error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getNodes,
  createNode,
  deleteNode,
  regenerateToken,
  getNodeDongles,
  getAllDongles,
  getAllPools,
  getStats,
  getQueue,
  getEvents,
  getHistory,
};
