/**
 * WSS Dongle Manager
 * Syncs dongle state from ModemGrid node status updates
 */
const { query } = require('../config/database');

/**
 * Sync dongles from a node's register/status message into the database
 */
async function syncDongles(nodeId, dongles) {
  if (!Array.isArray(dongles)) return;

  try {
    // Mark all existing dongles for this node as offline first
    await query('UPDATE wss_dongles SET online = false WHERE node_id = $1', [nodeId]);

    for (const dongle of dongles) {
      await query(`
        INSERT INTO wss_dongles (node_id, dongle_id, name, operator, online, balance, pool_ids, last_updated)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (node_id, dongle_id) DO UPDATE SET
          name = EXCLUDED.name,
          operator = EXCLUDED.operator,
          online = EXCLUDED.online,
          balance = EXCLUDED.balance,
          pool_ids = EXCLUDED.pool_ids,
          last_updated = NOW()
      `, [
        nodeId,
        dongle.dongle_id,
        dongle.name || dongle.dongle_id,
        dongle.operator || 'unknown',
        dongle.online || false,
        dongle.balance != null ? dongle.balance : null,
        dongle.pool_ids || [],
      ]);
    }
  } catch (err) {
    console.error('❌ Dongle sync error:', err.message);
  }
}

/**
 * Mark all dongles for a node as offline
 */
async function markAllOffline(nodeId) {
  try {
    await query('UPDATE wss_dongles SET online = false, last_updated = NOW() WHERE node_id = $1', [nodeId]);
  } catch (err) {
    console.error('❌ Dongle markAllOffline error:', err.message);
  }
}

/**
 * Get dongles by node
 */
async function getDonglesByNode(nodeId) {
  const result = await query(
    'SELECT * FROM wss_dongles WHERE node_id = $1 ORDER BY dongle_id',
    [nodeId]
  );
  return result.rows;
}

/**
 * Get all online dongles for an operator
 */
async function getDonglesByOperator(operator) {
  const result = await query(
    `SELECT d.*, n.name as node_name, n.status as node_status 
     FROM wss_dongles d JOIN wss_nodes n ON d.node_id = n.id 
     WHERE d.operator ILIKE $1 AND d.online = true AND n.status = 'online'
     ORDER BY d.balance DESC NULLS LAST`,
    [`%${operator}%`]
  );
  return result.rows;
}

/**
 * Get total balance for an operator across all online nodes
 */
async function getTotalBalance(operator) {
  const result = await query(
    `SELECT COALESCE(SUM(d.balance), 0) as total
     FROM wss_dongles d JOIN wss_nodes n ON d.node_id = n.id
     WHERE d.operator ILIKE $1 AND d.online = true AND n.status = 'online'`,
    [`%${operator}%`]
  );
  return parseFloat(result.rows[0].total);
}

/**
 * Get aggregate dongle stats
 */
async function getDongleStats() {
  const result = await query(`
    SELECT 
      COUNT(*) as total_dongles,
      COUNT(*) FILTER (WHERE online = true) as online_dongles,
      COALESCE(SUM(balance), 0) as total_balance,
      COALESCE(SUM(balance) FILTER (WHERE online = true), 0) as online_balance
    FROM wss_dongles d
    JOIN wss_nodes n ON d.node_id = n.id
    WHERE n.status = 'online'
  `);
  return result.rows[0];
}

/**
 * Get all dongles with node info
 */
async function getAllDongles() {
  const result = await query(`
    SELECT d.*, n.name as node_name, n.status as node_status
    FROM wss_dongles d
    JOIN wss_nodes n ON d.node_id = n.id
    ORDER BY n.name, d.dongle_id
  `);
  return result.rows;
}

module.exports = {
  syncDongles,
  markAllOffline,
  getDonglesByNode,
  getDonglesByOperator,
  getTotalBalance,
  getDongleStats,
  getAllDongles,
};
