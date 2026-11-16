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
    const parsedPools = pools.map((p, idx) => {
      const poolId = p.pool_id != null ? p.pool_id : (p.id != null ? p.id : idx + 1);
      const name = p.name || p.operator || `Pool ${poolId}`;
      const dongleCount = p.dongle_count || (p.dongles ? p.dongles.length : 0);
      const onlineCount = p.online_count != null ? p.online_count : (p.online ? 1 : dongleCount);
      const totalBalance = (p.total_balance != null && !isNaN(parseFloat(p.total_balance))) 
        ? parseFloat(p.total_balance) 
        : ((p.balance != null && !isNaN(parseFloat(p.balance))) ? parseFloat(p.balance) : 0);
      const highestBalance = (p.highest_balance != null && !isNaN(parseFloat(p.highest_balance)))
        ? parseFloat(p.highest_balance)
        : totalBalance;
      const apiNames = Array.isArray(p.apis) ? p.apis : (Array.isArray(p.api_names) ? p.api_names : []);

      return {
        poolId,
        name,
        dongleCount,
        onlineCount,
        totalBalance,
        highestBalance,
        apiNames
      };
    });

    // Remove old pools for this node that are no longer reported
    const reportedPoolIds = parsedPools.map(p => p.poolId);
    if (reportedPoolIds.length > 0) {
      await query(
        'DELETE FROM wss_pools WHERE node_id = $1 AND pool_id != ALL($2)',
        [nodeId, reportedPoolIds]
      );
    }

    for (const pool of parsedPools) {
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
        pool.poolId,
        pool.name,
        pool.dongleCount,
        pool.onlineCount,
        pool.totalBalance,
        pool.highestBalance,
        pool.apiNames,
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
