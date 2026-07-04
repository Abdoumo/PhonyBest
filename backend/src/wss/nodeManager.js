/**
 * WSS Node Manager
 * Manages connected ModemGrid nodes — lifecycle, state, and events
 */
const { query } = require('../config/database');
const dongleManager = require('./dongleManager');
const poolManager = require('./poolManager');

// In-memory map: nodeId -> WebSocket connection
const nodeConnections = new Map();

// Socket.IO instance (set during init)
let io = null;

/**
 * Initialize with Socket.IO for real-time dashboard updates
 */
function init(socketIo) {
  io = socketIo;
}

/**
 * Emit an event to the admin dashboard via Socket.IO
 */
function emitToAdmin(event, data) {
  if (io) {
    io.to('admin').emit(event, data);
  }
}

/**
 * Log an event to the wss_events table
 */
async function logEvent(nodeId, nodeName, eventType, message, metadata = {}) {
  try {
    await query(
      'INSERT INTO wss_events (node_id, node_name, event_type, message, metadata) VALUES ($1, $2, $3, $4, $5)',
      [nodeId, nodeName, eventType, message, JSON.stringify(metadata)]
    );
  } catch (err) {
    console.error('❌ Event log error:', err.message);
  }
}

/**
 * Handle a node registration (after auth is validated)
 */
async function handleRegister(ws, node, data) {
  const { pools, dongles, dongle_count, online_count } = data;

  // Store the WebSocket connection mapped to node ID
  nodeConnections.set(node.id, ws);
  ws._nodeId = node.id;
  ws._nodeName = node.name;

  // Update node status in DB
  const ip = ws._socket?.remoteAddress || 'unknown';
  await query(
    `UPDATE wss_nodes SET status = 'online', ip_address = $1, last_seen = NOW(), 
     dongle_count = $2, online_count = $3, updated_at = NOW() WHERE id = $4`,
    [ip, dongle_count || 0, online_count || 0, node.id]
  );

  // Sync pools and dongles
  await poolManager.syncPools(node.id, pools);
  await dongleManager.syncDongles(node.id, dongles);

  // Log event
  await logEvent(node.id, node.name, 'connected',
    `Node "${node.name}" connected with ${dongle_count || 0} dongles (${online_count || 0} online)`,
    { ip, dongle_count, online_count }
  );

  // Emit to admin dashboard
  emitToAdmin('wss_node_connected', {
    nodeId: node.id,
    name: node.name,
    dongle_count,
    online_count,
    ip,
  });

  console.log(`✅ WSS Node registered: "${node.name}" (${dongle_count} dongles, ${online_count} online)`);

  // Send welcome
  ws.send(JSON.stringify({ type: 'welcome' }));
}

/**
 * Handle a periodic status update from a node
 */
async function handleStatusUpdate(ws, data) {
  const nodeId = ws._nodeId;
  if (!nodeId) return;

  const { pools, dongles, dongle_count, online_count } = data;

  // Update node last_seen and counts
  await query(
    `UPDATE wss_nodes SET last_seen = NOW(), dongle_count = $1, online_count = $2, updated_at = NOW() WHERE id = $3`,
    [dongle_count || 0, online_count || 0, nodeId]
  );

  // Sync pools and dongles
  await poolManager.syncPools(nodeId, pools);
  await dongleManager.syncDongles(nodeId, dongles);

  // Emit to admin dashboard
  emitToAdmin('wss_node_status', {
    nodeId,
    name: ws._nodeName,
    dongle_count,
    online_count,
    pools,
    dongles,
  });
}

/**
 * Handle node disconnect
 */
async function handleDisconnect(ws) {
  const nodeId = ws._nodeId;
  if (!nodeId) return;

  nodeConnections.delete(nodeId);

  // Mark node offline
  await query(
    `UPDATE wss_nodes SET status = 'offline', updated_at = NOW() WHERE id = $1`,
    [nodeId]
  );

  // Mark all dongles offline, clear pool online counts
  await dongleManager.markAllOffline(nodeId);
  await poolManager.clearPoolsForNode(nodeId);

  // Log event
  await logEvent(nodeId, ws._nodeName, 'disconnected',
    `Node "${ws._nodeName}" disconnected`
  );

  // Emit to admin dashboard
  emitToAdmin('wss_node_disconnected', {
    nodeId,
    name: ws._nodeName,
  });

  console.log(`⚠️ WSS Node disconnected: "${ws._nodeName}"`);
}

/**
 * Get the WebSocket connection for a node
 */
function getConnection(nodeId) {
  return nodeConnections.get(nodeId) || null;
}

/**
 * Get all online node IDs
 */
function getOnlineNodeIds() {
  return Array.from(nodeConnections.keys());
}

/**
 * Get all online nodes with their info from DB
 */
async function getOnlineNodes() {
  const ids = getOnlineNodeIds();
  if (ids.length === 0) return [];
  const result = await query(
    `SELECT * FROM wss_nodes WHERE id = ANY($1) AND status = 'online'`,
    [ids]
  );
  return result.rows;
}

/**
 * Get all registered nodes
 */
async function getAllNodes() {
  const result = await query('SELECT id, name, status, ip_address, last_seen, dongle_count, online_count, metadata, created_at, updated_at FROM wss_nodes ORDER BY created_at DESC');
  return result.rows;
}

/**
 * Get recent events
 */
async function getRecentEvents(limit = 50) {
  const result = await query(
    'SELECT * FROM wss_events ORDER BY created_at DESC LIMIT $1',
    [limit]
  );
  return result.rows;
}

/**
 * Send a topup request to a specific node
 */
function sendToNode(nodeId, message) {
  const ws = nodeConnections.get(nodeId);
  if (!ws || ws.readyState !== 1) { // 1 = WebSocket.OPEN
    return false;
  }
  ws.send(JSON.stringify(message));
  return true;
}

module.exports = {
  init,
  handleRegister,
  handleStatusUpdate,
  handleDisconnect,
  getConnection,
  getOnlineNodeIds,
  getOnlineNodes,
  getAllNodes,
  getRecentEvents,
  sendToNode,
  logEvent,
  emitToAdmin,
};
