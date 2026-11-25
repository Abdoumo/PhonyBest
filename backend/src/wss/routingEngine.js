/**
 * WSS Routing Engine
 * Selects the best ModemGrid node, modem, and pool for a topup request
 */
const { query } = require('../config/database');
const nodeManager = require('./nodeManager');

// Operator name mapping — maps system operator names to ModemGrid operator patterns
const OPERATOR_MAP = {
  'mobilis': ['mobilis', 'alg mobilis', '60301', '603 01', 'atm'],
  'djezzy': ['djezzy', 'ota', '60302', '603 02', 'optimum'],
  'ooredoo': ['ooredoo', 'wataniya', 'nedjma', '60303', '603 03', 'watania'],
  'idoom': ['idoom', 'algerie telecom', 'at', 'algerietelecom', 'algerie_telecom'],
};

/**
 * Select the best node and determine the api_name for a topup request
 * 
 * @param {string} operator - The operator name (e.g. 'mobilis', 'djezzy', 'ooredoo')
 * @param {number} amount - The topup amount
 * @param {string} apiName - Optional specific API name to use
 * @param {string} dongleId - Optional specific modem/dongle ID to target
 * @param {string} serviceType - Optional service type (e.g. 'flexy', 'flexy_gros', 'idoom')
 * @param {string} offerName - Optional offer name
 * @returns {Object|null} - { nodeId, apiName, poolName, nodeName, totalBalance, dongleId } or null
 */
async function selectBestTarget(operator, amount, apiName = null, dongleId = null, serviceType = null, offerName = null) {
  const op = (operator || '').toLowerCase().trim();
  const numAmount = parseFloat(amount) || 0;

  // 1. Check if any ModemGrid nodes are currently connected via WebSocket
  const onlineNodeIds = nodeManager.getOnlineNodeIds();
  if (!onlineNodeIds || onlineNodeIds.length === 0) {
    console.warn(`[RoutingEngine] No online ModemGrid nodes connected.`);
    return null;
  }

  // 2. Check for offer API mapping first if serviceType and offerName/apiName provided
  let mappedApiName = null;
  if (serviceType && (offerName || apiName)) {
    const offerToCheck = offerName || apiName;
    try {
      const mappingResult = await query(
        `SELECT modemgrid_api_name FROM offer_api_mappings 
         WHERE service_type = $1 
           AND operator = $2 
           AND (offer_name = $3 OR offer_name = '' OR offer_name = 'default' OR offer_name = 'gros') 
           AND is_active = true 
         ORDER BY (CASE WHEN offer_name = $3 THEN 0 WHEN offer_name = 'default' THEN 1 ELSE 2 END)
         LIMIT 1`,
        [serviceType, op, offerToCheck]
      );
      if (mappingResult.rows.length > 0) {
        mappedApiName = mappingResult.rows[0].modemgrid_api_name;
      }
    } catch (e) {
      console.warn('[RoutingEngine] Offer mapping check note:', e.message);
    }
  }

  // 3. CASE A: Specific dongle/modem requested (e.g. chosen from dropdown)
  if (dongleId) {
    try {
      const specificDongleResult = await query(`
        SELECT d.*, n.name as node_name
        FROM wss_dongles d
        JOIN wss_nodes n ON d.node_id = n.id
        WHERE (d.dongle_id = $1 OR d.name = $1)
          AND d.node_id = ANY($2)
          AND d.online = true
        LIMIT 1
      `, [dongleId, onlineNodeIds]);

      if (specificDongleResult.rows.length > 0) {
        const d = specificDongleResult.rows[0];
        const targetApi = mappedApiName || (apiName && !apiName.includes(' ') ? apiName : null) || guessApiName(op || d.operator, []);
        return {
          nodeId: d.node_id,
          apiName: targetApi,
          poolName: 'specific_modem',
          nodeName: d.node_name,
          totalBalance: parseFloat(d.balance) || numAmount,
          dongleId: d.dongle_id
        };
      }
    } catch (e) {
      console.warn('[RoutingEngine] Specific dongle lookup error:', e.message);
    }
  }

  // 4. Fetch all online dongles on currently online nodes
  let allOnlineDongles = [];
  try {
    const donglesQuery = await query(`
      SELECT d.*, n.name as node_name
      FROM wss_dongles d
      JOIN wss_nodes n ON d.node_id = n.id
      WHERE d.node_id = ANY($1) AND d.online = true
      ORDER BY d.last_updated DESC
    `, [onlineNodeIds]);
    allOnlineDongles = donglesQuery.rows || [];
  } catch (e) {
    console.error('[RoutingEngine] Online dongles fetch error:', e.message);
  }

  // 5. Fetch all pools on online nodes (optional)
  let pools = [];
  try {
    const poolsQuery = await query(`
      SELECT p.*, n.name as node_name
      FROM wss_pools p
      JOIN wss_nodes n ON p.node_id = n.id
      WHERE n.status = 'online' AND n.id = ANY($1)
      ORDER BY p.total_balance DESC
    `, [onlineNodeIds]);
    pools = poolsQuery.rows || [];
  } catch (e) {
    console.warn('[RoutingEngine] Pools fetch note:', e.message);
  }

  // 6. Match Dongles for the Operator
  const operatorPatterns = OPERATOR_MAP[op] || [op];

  const matchingDongles = allOnlineDongles.filter(d => {
    if (!d.operator) return false;
    const dongleOp = d.operator.toLowerCase();
    return operatorPatterns.some(pat => dongleOp.includes(pat.toLowerCase()));
  });

  // Candidate selection strategy:
  // - Priority 1: Dongles matching the operator
  // - Priority 2: Dongles with 'unknown', empty, or null operator
  // - Priority 3: If only 1 modem exists on the connected node, assume it's the intended modem
  let candidates = [];
  if (matchingDongles.length > 0) {
    candidates = matchingDongles;
  } else {
    const unknownDongles = allOnlineDongles.filter(d => {
      const dongleOp = (d.operator || '').toLowerCase();
      return dongleOp === 'unknown' || dongleOp === '' || !dongleOp;
    });
    if (unknownDongles.length > 0) {
      candidates = unknownDongles;
    } else if (allOnlineDongles.length === 1) {
      candidates = allOnlineDongles;
    }
  }

  if (candidates.length > 0) {
    // Rank candidates:
    // 1. Dongles with balance >= amount first
    // 2. Highest balance descending
    // 3. Most recently updated
    candidates.sort((a, b) => {
      const balA = parseFloat(a.balance) || 0;
      const balB = parseFloat(b.balance) || 0;
      const enoughA = balA >= numAmount ? 1 : 0;
      const enoughB = balB >= numAmount ? 1 : 0;
      if (enoughA !== enoughB) return enoughB - enoughA;
      if (balB !== balA) return balB - balA;
      return new Date(b.last_updated || 0) - new Date(a.last_updated || 0);
    });

    const chosenDongle = candidates[0];

    // Find if a pool covers this node with API names
    let poolApis = [];
    let poolName = 'default_pool';
    const matchingPool = pools.find(p => p.node_id === chosenDongle.node_id && (p.api_names?.length > 0));
    if (matchingPool) {
      poolApis = matchingPool.api_names || [];
      poolName = matchingPool.name;
    }

    const finalApiName = mappedApiName || (apiName && !apiName.includes(' ') ? apiName : null) || guessApiName(op, poolApis);

    return {
      nodeId: chosenDongle.node_id,
      apiName: finalApiName,
      poolName: poolName,
      nodeName: chosenDongle.node_name,
      totalBalance: parseFloat(chosenDongle.balance) || 0,
      dongleId: chosenDongle.dongle_id,
    };
  }

  // 7. CASE C: If no dongles found in wss_dongles table, try pools
  if (pools.length > 0) {
    const bestPool = pools.find(p => (parseFloat(p.total_balance) || 0) >= numAmount) || pools[0];
    const finalApiName = mappedApiName || (apiName && !apiName.includes(' ') ? apiName : null) || guessApiName(op, bestPool.api_names || []);
    return {
      nodeId: bestPool.node_id,
      apiName: finalApiName,
      poolName: bestPool.name,
      nodeName: bestPool.node_name,
      totalBalance: parseFloat(bestPool.total_balance) || 0,
    };
  }

  // 8. CASE D: Direct fallback to first online node
  try {
    const onlineNodeResult = await query(
      `SELECT id, name FROM wss_nodes WHERE id = ANY($1) AND status = 'online' LIMIT 1`,
      [onlineNodeIds]
    );
    if (onlineNodeResult.rows.length > 0) {
      const node = onlineNodeResult.rows[0];
      return {
        nodeId: node.id,
        apiName: mappedApiName || (apiName && !apiName.includes(' ') ? apiName : null) || guessApiName(op, []),
        poolName: 'direct_node',
        nodeName: node.name,
        totalBalance: 0,
      };
    }
  } catch (e) {
    console.warn('[RoutingEngine] Fallback online node error:', e.message);
  }

  return null;
}

/**
 * Guess the best api_name for an operator from available APIs
 */
function guessApiName(operator, apiNames = []) {
  const op = (operator || '').toLowerCase();
  
  if (Array.isArray(apiNames) && apiNames.length > 0) {
    // 1. Direct match: e.g. "ooredoo" or "flexy_ooredoo" or "topup_ooredoo"
    const exactOp = apiNames.find(a => a.toLowerCase() === op || a.toLowerCase() === `flexy_${op}` || a.toLowerCase() === `topup_${op}`);
    if (exactOp) return exactOp;

    // 2. Contains operator name and topup/flexy
    const opAction = apiNames.find(a => a.toLowerCase().includes(op) && (a.toLowerCase().includes('topup') || a.toLowerCase().includes('flexy')));
    if (opAction) return opAction;

    // 3. Contains operator name
    const opAny = apiNames.find(a => a.toLowerCase().includes(op));
    if (opAny) return opAny;

    // 4. Generic flexy or topup
    const generic = apiNames.find(a => a.toLowerCase() === 'flexy' || a.toLowerCase() === 'topup' || a.toLowerCase().includes('flexy') || a.toLowerCase().includes('topup'));
    if (generic) return generic;

    return apiNames[0];
  }

  // Default fallback when no specific API list is known
  return op ? `topup_${op}` : 'flexy';
}

/**
 * Get a summary of routing capabilities
 */
async function getRoutingSummary() {
  const onlineNodeIds = nodeManager.getOnlineNodeIds();
  if (!onlineNodeIds || onlineNodeIds.length === 0) {
    return { available: false, nodes: 0, operators: [] };
  }

  try {
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
  } catch (e) {
    return { available: true, nodes: onlineNodeIds.length, operators: [] };
  }
}

module.exports = {
  selectBestTarget,
  getRoutingSummary,
  guessApiName,
  OPERATOR_MAP,
};
