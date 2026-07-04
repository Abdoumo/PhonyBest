/**
 * WSS Routing Engine
 * Selects the best ModemGrid node and pool for a topup request
 */
const { query } = require('../config/database');
const nodeManager = require('./nodeManager');

// Operator name mapping — maps system operator names to ModemGrid operator patterns
const OPERATOR_MAP = {
  'mobilis': ['mobilis', 'alg mobilis'],
  'djezzy': ['djezzy'],
  'ooredoo': ['ooredoo'],
  'idoom': ['idoom', 'algerie telecom'],
};

/**
 * Select the best node and determine the api_name for a topup request
 * 
 * @param {string} operator - The operator name (e.g. 'mobilis', 'djezzy', 'ooredoo')
 * @param {number} amount - The topup amount
 * @param {string} apiName - Optional specific API name to use
 * @returns {Object|null} - { nodeId, apiName } or null if no suitable target found
 */
async function selectBestTarget(operator, amount, apiName = null) {
  const onlineNodeIds = nodeManager.getOnlineNodeIds();
  if (onlineNodeIds.length === 0) {
    return null;
  }

  // Get all pools from online nodes
  const poolsResult = await query(`
    SELECT p.*, n.id as node_id, n.name as node_name, n.status as node_status
    FROM wss_pools p
    JOIN wss_nodes n ON p.node_id = n.id
    WHERE n.status = 'online' AND n.id = ANY($1) AND p.online_count > 0
    ORDER BY p.total_balance DESC
  `, [onlineNodeIds]);

  const pools = poolsResult.rows;
  if (pools.length === 0) return null;

  // If a specific apiName is requested, filter for pools that support it
  if (apiName) {
    const matchingPools = pools.filter(p => 
      p.api_names && p.api_names.includes(apiName)
    );

    if (matchingPools.length === 0) return null;

    // Pick the pool with the highest balance that has enough for the amount
    const best = matchingPools.find(p => parseFloat(p.total_balance) >= amount) || matchingPools[0];
    return {
      nodeId: best.node_id,
      apiName: apiName,
      poolName: best.name,
      nodeName: best.node_name,
      totalBalance: parseFloat(best.total_balance),
    };
  }

  // Operator-based routing
  const operatorPatterns = OPERATOR_MAP[operator.toLowerCase()] || [operator.toLowerCase()];

  // Find pools whose dongles match the operator
  // We check the pool's dongles via the wss_dongles table
  const dongleResult = await query(`
    SELECT DISTINCT d.node_id, array_agg(DISTINCT unnest_pool_id) as pool_ids
    FROM wss_dongles d,
    LATERAL unnest(d.pool_ids) as unnest_pool_id
    WHERE d.node_id = ANY($1) AND d.online = true AND d.balance >= $2
    AND (${operatorPatterns.map((_, i) => `d.operator ILIKE $${i + 3}`).join(' OR ')})
    GROUP BY d.node_id
  `, [onlineNodeIds, amount, ...operatorPatterns.map(p => `%${p}%`)]);

  if (dongleResult.rows.length === 0) {
    // Fallback: try any pool with enough balance on an online node, even without operator matching
    // This handles cases where operator names don't match exactly
    const fallbackPools = pools.filter(p => parseFloat(p.total_balance) >= amount);
    if (fallbackPools.length === 0) return null;

    const best = fallbackPools[0];
    // Try to find an api_name for the operator
    const guessedApiName = guessApiName(operator, best.api_names);
    return {
      nodeId: best.node_id,
      apiName: guessedApiName,
      poolName: best.name,
      nodeName: best.node_name,
      totalBalance: parseFloat(best.total_balance),
    };
  }

  // Pick the node with matching dongles that has the most balance
  for (const row of dongleResult.rows) {
    const matchingPools = pools.filter(p => 
      p.node_id === row.node_id && parseFloat(p.total_balance) >= amount
    );

    if (matchingPools.length > 0) {
      const best = matchingPools[0];
      const guessedApiName = guessApiName(operator, best.api_names);
      return {
        nodeId: best.node_id,
        apiName: guessedApiName,
        poolName: best.name,
        nodeName: best.node_name,
        totalBalance: parseFloat(best.total_balance),
      };
    }
  }

  return null;
}

/**
 * Guess the best api_name for an operator from available APIs
 */
function guessApiName(operator, apiNames) {
  if (!apiNames || apiNames.length === 0) return `topup_${operator.toLowerCase()}`;
  
  const op = operator.toLowerCase();
  
  // Look for operator-specific APIs first
  const topupApi = apiNames.find(a => a.toLowerCase().includes('topup') && a.toLowerCase().includes(op));
  if (topupApi) return topupApi;

  // Look for any API containing the operator name
  const operatorApi = apiNames.find(a => a.toLowerCase().includes(op));
  if (operatorApi) return operatorApi;

  // Look for generic topup APIs
  const genericTopup = apiNames.find(a => a.toLowerCase().includes('topup') || a.toLowerCase().includes('flexy'));
  if (genericTopup) return genericTopup;

  // Fallback to first available API
  return apiNames[0];
}

/**
 * Get a summary of routing capabilities
 */
async function getRoutingSummary() {
  const onlineNodeIds = nodeManager.getOnlineNodeIds();
  if (onlineNodeIds.length === 0) {
    return { available: false, nodes: 0, operators: [] };
  }

  const result = await query(`
    SELECT d.operator, COUNT(*) as dongle_count, 
           COUNT(*) FILTER (WHERE d.online = true) as online_count,
           COALESCE(SUM(d.balance) FILTER (WHERE d.online = true), 0) as total_balance
    FROM wss_dongles d
    JOIN wss_nodes n ON d.node_id = n.id
    WHERE n.status = 'online' AND n.id = ANY($1)
    GROUP BY d.operator
    ORDER BY total_balance DESC
  `, [onlineNodeIds]);

  return {
    available: true,
    nodes: onlineNodeIds.length,
    operators: result.rows,
  };
}

module.exports = {
  selectBestTarget,
  getRoutingSummary,
  OPERATOR_MAP,
};
