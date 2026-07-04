/**
 * WSS Pool Manager
 * Syncs pool state from ModemGrid node status updates
 */
const { query } = require('../config/database');

/**
 * Sync pools from a node's register/status message into the database
 */
async function syncPools(nodeId, pools) {
  if (!Array.isArray(pools)) return;

  try {
    // Remove old pools for this node that are no longer reported
    const reportedPoolIds = pools.map(p => p.pool_id);
    if (reportedPoolIds.length > 0) {
      await query(
        'DELETE FROM wss_pools WHERE node_id = $1 AND pool_id != ALL($2)',
        [nodeId, reportedPoolIds]
      );
    }

    for (const pool of pools) {
      await query(`
        INSERT INTO wss_pools (node_id, pool_id, name, dongle_count, online_count, total_balance, highest_balance, api_names, last_updated)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT (node_id, pool_id) DO UPDATE SET
          name = EXCLUDED.name,
          dongle_count = EXCLUDED.dongle_count,
          online_count = EXCLUDED.online_count,
          total_balance = EXCLUDED.total_balance,
          highest_balance = EXCLUDED.highest_balance,
          api_names = EXCLUDED.api_names,
          last_updated = NOW()
      `, [
        nodeId,
        pool.pool_id,
        pool.name || `Pool ${pool.pool_id}`,
        pool.dongle_count || 0,
        pool.online_count || 0,
        pool.total_balance || 0,
        pool.highest_balance || 0,
        pool.apis || [],
      ]);
    }
  } catch (err) {
    console.error('❌ Pool sync error:', err.message);
  }
}

/**
 * Get pools that can handle a given operator (by matching dongle operators in the pool)
 */
async function getPoolsByOperator(operator) {
  const result = await query(`
    SELECT p.*, n.name as node_name, n.status as node_status
    FROM wss_pools p
    JOIN wss_nodes n ON p.node_id = n.id
    WHERE n.status = 'online' AND p.online_count > 0
    ORDER BY p.total_balance DESC
  `);
  return result.rows;
}

/**
 * Get pools that support a specific API name
 */
async function getPoolByApiName(apiName) {
  const result = await query(`
    SELECT p.*, n.name as node_name, n.status as node_status
    FROM wss_pools p
    JOIN wss_nodes n ON p.node_id = n.id
    WHERE n.status = 'online' AND $1 = ANY(p.api_names) AND p.online_count > 0
    ORDER BY p.total_balance DESC
  `, [apiName]);
  return result.rows;
}

/**
 * Get pool capacity (online dongle count and total balance)
 */
async function getPoolCapacity(nodeId, poolId) {
  const result = await query(
    'SELECT * FROM wss_pools WHERE node_id = $1 AND pool_id = $2',
    [nodeId, poolId]
  );
  return result.rows[0] || null;
}

/**
 * Get all pools with node info
 */
async function getAllPools() {
  const result = await query(`
    SELECT p.*, n.name as node_name, n.status as node_status
    FROM wss_pools p
    JOIN wss_nodes n ON p.node_id = n.id
    ORDER BY n.name, p.name
  `);
  return result.rows;
}

/**
 * Clear pools for a node (on disconnect)
 */
async function clearPoolsForNode(nodeId) {
  try {
    await query('UPDATE wss_pools SET online_count = 0, last_updated = NOW() WHERE node_id = $1', [nodeId]);
  } catch (err) {
    console.error('❌ Pool clear error:', err.message);
  }
}

module.exports = {
  syncPools,
  getPoolsByOperator,
  getPoolByApiName,
  getPoolCapacity,
  getAllPools,
  clearPoolsForNode,
};
