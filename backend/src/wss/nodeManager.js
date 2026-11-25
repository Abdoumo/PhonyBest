/**
 * WSS Node Manager
 * Manages connected ModemGrid nodes — lifecycle, state, and events
 */
const { query } = require('../config/database');
const dongleManager = require('./dongleManager');
const poolManager = require('./poolManager');

// In-memory map: nodeId -> WebSocket connection
const nodeConnections = new Map();

// In-memory map: requestId -> { resolve, reject, timer, nodeId, type, sentAt }
const pendingQueries = new Map();

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
  const metadata = {
    ...(node.metadata || {}),
    ...(data.apis ? { apis: data.apis } : {}),
    ...(data.version ? { version: data.version } : {}),
  };
  await query(
    `UPDATE wss_nodes SET status = 'online', ip_address = $1, last_seen = NOW(), 
     dongle_count = $2, online_count = $3, metadata = $4, updated_at = NOW() WHERE id = $5`,
    [ip, dongle_count || 0, online_count || 0, JSON.stringify(metadata), node.id]
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
    `UPDATE wss_nodes SET last_seen = NOW(), dongle_count = $1, online_count = $2, 
     metadata = metadata || $3, updated_at = NOW() WHERE id = $4`,
    [
      dongle_count || 0,
      online_count || 0,
      JSON.stringify({
        ...(data.apis ? { apis: data.apis } : {}),
        ...(data.version ? { version: data.version } : {}),
      }),
      nodeId
    ]
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
 * Check if a pending query exists for this request_id
 */
function hasPendingQuery(requestId) {
  return pendingQueries.has(requestId);
}

/**
 * Handle a response to a query sent to a node (e.g. getallapis)
 */
async function handleQueryResponse(requestId, data) {
  const pending = pendingQueries.get(requestId);
  if (!pending) return false;

  clearTimeout(pending.timer);
  pendingQueries.delete(requestId);

  // Normalize APIs list
  let apis = data.apis || data.definitions || data.data || [];
  if (!Array.isArray(apis) && typeof apis === 'object') {
    apis = Object.values(apis);
  }

  // Store in DB for this node
  if (pending.nodeId && Array.isArray(apis) && apis.length > 0) {
    await storeNodeApis(pending.nodeId, apis);
  }

  pending.resolve({
    success: true,
    nodeId: pending.nodeId,
    requestId,
    apis,
    raw: data
  });
  return true;
}

/**
 * Store APIs in the database under wss_nodes.metadata
 */
async function storeNodeApis(nodeId, apis) {
  if (!nodeId || !Array.isArray(apis)) return;
  try {
    const formattedApis = apis.map(a => {
      if (typeof a === 'string') return { name: a };
      return {
        name: a.name || a.api_name || a.id,
        description: a.description || '',
        timeout_seconds: a.timeout_seconds || 60,
        variables: a.variables || a.vars || [],
        steps: a.steps || []
      };
    });

    await query(
      `UPDATE wss_nodes 
       SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{apis}', $1::jsonb),
           updated_at = NOW() 
       WHERE id = $2`,
      [JSON.stringify(formattedApis), nodeId]
    );

    emitToAdmin('wss_node_apis_updated', { nodeId, apis: formattedApis });
    console.log(`📦 WSS Stored ${formattedApis.length} APIs for node ${nodeId}`);
  } catch (err) {
    console.warn(`⚠️ Failed to store APIs for node ${nodeId}:`, err.message);
  }
}

/**
 * Send 'getallapis' socket request to a connected node
 * Payload: {"type": "getallapis", "request_id": "<uuid>"}
 */
function fetchApisFromNode(nodeId, timeoutMs = 12000) {
  const ws = nodeConnections.get(nodeId);

  // If node is not connected, fallback to cached APIs in DB
  if (!ws || ws.readyState !== 1) {
    return query('SELECT id, name, status, metadata FROM wss_nodes WHERE id = $1', [nodeId])
      .then(res => {
        if (res.rows.length === 0) return { success: false, error: 'Node not found', apis: [] };
        const row = res.rows[0];
        const apis = (row.metadata && row.metadata.apis) || [];
        return {
          success: true,
          nodeId: row.id,
          nodeName: row.name,
          status: row.status,
          source: 'cached',
          apis
        };
      });
  }

  const requestId = `api_req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const payload = {
    type: 'getallapis',
    request_id: requestId
  };

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingQueries.delete(requestId);
      // Fallback to cached on timeout
      query('SELECT id, name, metadata FROM wss_nodes WHERE id = $1', [nodeId])
        .then(res => {
          const row = res.rows[0];
          const cachedApis = (row?.metadata && row?.metadata?.apis) || [];
          resolve({
            success: true,
            nodeId,
            source: 'cached_timeout',
            apis: cachedApis,
            warning: `Timeout waiting for live response from node, returned ${cachedApis.length} cached APIs`
          });
        })
        .catch(() => reject(new Error(`Timeout waiting for getallapis response (${timeoutMs}ms)`)));
    }, timeoutMs);

    pendingQueries.set(requestId, {
      resolve,
      reject,
      timer,
      nodeId,
      type: 'getallapis',
      sentAt: Date.now()
    });

    console.log(`📡 Sending getallapis to node ${nodeId} (request_id: ${requestId})`);
    ws.send(JSON.stringify(payload));
  });
}

/**
 * Fetch all APIs across all online nodes and DB cache
 */
async function fetchAllNodesApis(timeoutMs = 10000) {
  const onlineIds = getOnlineNodeIds();
  const liveResults = await Promise.allSettled(
    onlineIds.map(id => fetchApisFromNode(id, timeoutMs))
  );

  // Read all nodes from DB to get cached APIs and pool api_names
  const nodesRes = await query('SELECT id, name, status, metadata FROM wss_nodes ORDER BY status = \'online\' DESC, name ASC');
  const poolsRes = await query('SELECT node_id, api_names FROM wss_pools');

  const apisMap = new Map(); // api_name -> API details object

  // Add pool api_names as fallback baseline
  for (const pool of poolsRes.rows) {
    if (Array.isArray(pool.api_names)) {
      for (const name of pool.api_names) {
        if (!name) continue;
        if (!apisMap.has(name)) {
          apisMap.set(name, {
            name,
            description: `Pool API (${name})`,
            node_id: pool.node_id,
            source: 'pool'
          });
        }
      }
    }
  }

  // Add DB metadata cached APIs
  for (const node of nodesRes.rows) {
    const cached = (node.metadata && node.metadata.apis) || [];
    if (Array.isArray(cached)) {
      for (const api of cached) {
        const apiName = typeof api === 'string' ? api : (api.name || api.api_name);
        if (!apiName) continue;
        apisMap.set(apiName, {
          name: apiName,
          description: api.description || '',
          timeout_seconds: api.timeout_seconds || 60,
          variables: api.variables || api.vars || [],
          steps: api.steps || [],
          node_id: node.id,
          node_name: node.name,
          source: 'node_metadata'
        });
      }
    }
  }

  // Add live results from getallapis
  for (const res of liveResults) {
    if (res.status === 'fulfilled' && res.value && Array.isArray(res.value.apis)) {
      for (const api of res.value.apis) {
        const apiName = typeof api === 'string' ? api : (api.name || api.api_name);
        if (!apiName) continue;
        apisMap.set(apiName, {
          name: apiName,
          description: api.description || '',
          timeout_seconds: api.timeout_seconds || 60,
          variables: api.variables || api.vars || [],
          steps: api.steps || [],
          node_id: res.value.nodeId,
          node_name: res.value.nodeName,
          source: 'live_wss'
        });
      }
    }
  }

  return {
    success: true,
    apis: Array.from(apisMap.values()),
    nodes: nodesRes.rows.map(n => ({
      id: n.id,
      name: n.name,
      status: n.status,
      online: onlineIds.includes(n.id)
    }))
  };
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
  hasPendingQuery,
  handleQueryResponse,
  storeNodeApis,
  fetchApisFromNode,
  fetchAllNodesApis
};
