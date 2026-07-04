/**
 * WSS Request Queue
 * Manages pending topup requests — queuing, sending, result matching, timeouts
 */
const { query } = require('../config/database');
const nodeManager = require('./nodeManager');

// In-memory map: request_id (from ModemGrid) -> { resolve, reject, timer, queueId, sentAt }
const pendingRequests = new Map();

// Configurable timeout (default 60s)
const REQUEST_TIMEOUT = parseInt(process.env.WSS_REQUEST_TIMEOUT) || 60000;

/**
 * Enqueue a topup request and send it to a node
 * Returns a Promise that resolves when the node responds
 */
async function enqueue(nodeId, apiName, variables, transactionId) {
  // Create queue entry in DB
  const queueResult = await query(
    `INSERT INTO wss_request_queue (transaction_id, node_id, api_name, variables, status, created_at)
     VALUES ($1, $2, $3, $4, 'queued', NOW()) RETURNING id`,
    [transactionId, nodeId, apiName, JSON.stringify(variables)]
  );
  const queueId = queueResult.rows[0].id;

  // Build the message to send to the node (per WSS protocol — no request_id, node generates it)
  const message = {
    api_name: apiName,
    variables: variables,
  };

  // Send to the node
  const sent = nodeManager.sendToNode(nodeId, message);
  if (!sent) {
    await query(
      `UPDATE wss_request_queue SET status = 'failed', error = 'Node not connected', completed_at = NOW() WHERE id = $1`,
      [queueId]
    );
    throw new Error('Node not connected or WebSocket not open');
  }

  // Mark as sent
  await query(
    `UPDATE wss_request_queue SET status = 'sent', sent_at = NOW() WHERE id = $1`,
    [queueId]
  );

  // Return a promise that resolves when we get a result
  return new Promise((resolve, reject) => {
    const timer = setTimeout(async () => {
      // Timeout — clean up
      const entry = findPendingByQueueId(queueId);
      if (entry) {
        const [requestId] = entry;
        pendingRequests.delete(requestId);
      }
      // Also try cleaning up by queue ID
      cleanupByQueueId(queueId);

      await query(
        `UPDATE wss_request_queue SET status = 'timeout', error = 'Request timed out (${REQUEST_TIMEOUT}ms)', completed_at = NOW() WHERE id = $1 AND status = 'sent'`,
        [queueId]
      );

      // Log to request log
      await logToHistory(queueId);

      reject(new Error(`Request timed out after ${REQUEST_TIMEOUT}ms`));
    }, REQUEST_TIMEOUT);

    // We don't know the request_id yet (node generates it), so we store by queueId
    // and we'll map the request_id when the result comes back
    // Store a special entry that maps by queueId for matching
    const entryKey = `_queue_${queueId}`;
    pendingRequests.set(entryKey, {
      resolve,
      reject,
      timer,
      queueId,
      nodeId,
      transactionId,
      sentAt: Date.now(),
    });
  });
}

/**
 * Handle a result message from a node
 * Called by the WSS server when it receives a result from a ModemGrid node
 */
async function handleResult(nodeId, data) {
  const { request_id, status, result, error, modem_id } = data;

  // Find the pending request for this node
  // Since ModemGrid generates request_id and we stored by queueId,
  // we need to match by nodeId — find the oldest pending request for this node
  let matchedEntry = null;
  let matchedKey = null;

  for (const [key, entry] of pendingRequests.entries()) {
    if (entry.nodeId === nodeId && key.startsWith('_queue_')) {
      matchedEntry = entry;
      matchedKey = key;
      break; // FIFO — first entry for this node
    }
  }

  if (!matchedEntry) {
    console.warn(`⚠️ WSS: Received result for unknown request: ${request_id} from node ${nodeId}`);
    return;
  }

  // Clean up
  clearTimeout(matchedEntry.timer);
  pendingRequests.delete(matchedKey);

  const duration = Date.now() - matchedEntry.sentAt;

  // Update queue entry
  await query(
    `UPDATE wss_request_queue SET status = $1, request_id = $2, result = $3, error = $4, modem_id = $5, completed_at = NOW() WHERE id = $6`,
    [status, request_id, result, error, modem_id, matchedEntry.queueId]
  );

  // Log to history
  await logToHistory(matchedEntry.queueId, duration);

  // Emit to admin dashboard
  nodeManager.emitToAdmin('wss_request_result', {
    queueId: matchedEntry.queueId,
    transactionId: matchedEntry.transactionId,
    nodeId,
    request_id,
    status,
    result,
    error,
    modem_id,
    duration,
  });

  // Resolve the promise
  matchedEntry.resolve({
    request_id,
    status,
    result,
    error,
    modem_id,
    duration,
  });
}

/**
 * Find pending entry by queueId
 */
function findPendingByQueueId(queueId) {
  const key = `_queue_${queueId}`;
  if (pendingRequests.has(key)) {
    return [key, pendingRequests.get(key)];
  }
  return null;
}

/**
 * Clean up by queueId
 */
function cleanupByQueueId(queueId) {
  const key = `_queue_${queueId}`;
  const entry = pendingRequests.get(key);
  if (entry) {
    clearTimeout(entry.timer);
    pendingRequests.delete(key);
  }
}

/**
 * Cancel all pending requests for a node (on disconnect)
 */
async function cancelPendingForNode(nodeId) {
  const toRemove = [];
  for (const [key, entry] of pendingRequests.entries()) {
    if (entry.nodeId === nodeId) {
      clearTimeout(entry.timer);
      entry.reject(new Error('Node disconnected'));
      toRemove.push(key);

      // Update queue status
      await query(
        `UPDATE wss_request_queue SET status = 'failed', error = 'Node disconnected', completed_at = NOW() WHERE id = $1 AND status IN ('queued', 'sent')`,
        [entry.queueId]
      );
    }
  }
  toRemove.forEach(k => pendingRequests.delete(k));
}

/**
 * Log completed request to history table
 */
async function logToHistory(queueId, durationMs = null) {
  try {
    const qResult = await query('SELECT * FROM wss_request_queue WHERE id = $1', [queueId]);
    if (qResult.rows.length === 0) return;
    const q = qResult.rows[0];

    const nodeResult = await query('SELECT name FROM wss_nodes WHERE id = $1', [q.node_id]);
    const nodeName = nodeResult.rows[0]?.name || 'unknown';

    await query(
      `INSERT INTO wss_request_log (transaction_id, node_id, node_name, api_name, variables, status, request_id, result, error, modem_id, duration_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [q.transaction_id, q.node_id, nodeName, q.api_name, q.variables, q.status, q.request_id, q.result, q.error, q.modem_id, durationMs]
    );
  } catch (err) {
    console.error('❌ Request log error:', err.message);
  }
}

/**
 * Get current queue state
 */
async function getQueue() {
  const result = await query(
    `SELECT q.*, n.name as node_name 
     FROM wss_request_queue q 
     LEFT JOIN wss_nodes n ON q.node_id = n.id 
     WHERE q.status IN ('queued', 'sent') 
     ORDER BY q.created_at ASC`
  );
  return result.rows;
}

/**
 * Get request history
 */
async function getHistory(limit = 50) {
  const result = await query(
    'SELECT * FROM wss_request_log ORDER BY created_at DESC LIMIT $1',
    [limit]
  );
  return result.rows;
}

/**
 * Get pending request count
 */
async function getPendingCount() {
  const result = await query(
    `SELECT COUNT(*) as count FROM wss_request_queue WHERE status IN ('queued', 'sent')`
  );
  return parseInt(result.rows[0].count);
}

module.exports = {
  enqueue,
  handleResult,
  cancelPendingForNode,
  getQueue,
  getHistory,
  getPendingCount,
};
