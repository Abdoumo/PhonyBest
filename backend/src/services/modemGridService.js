/**
 * Modem Grid API Service
 * 
 * Provides functions to connect to the Modem Grid API.
 * Uses native fetch (available in Node.js 18+).
 */

const MODEM_GRID_API_URL = process.env.MODEM_GRID_API_URL || 'https://modemgrid.imadox.qzz.io/api/v1';
const MODEM_GRID_API_KEY = process.env.MODEM_GRID_API_KEY;

/**
 * Generic request wrapper for Modem Grid API
 * @param {string} endpoint - API endpoint (e.g., '/ussd/execute')
 * @param {Object} options - Fetch options (method, body, etc.)
 * @returns {Promise<Object>} API response JSON
 */
async function modemGridRequest(endpoint, options = {}) {
  if (!MODEM_GRID_API_KEY) {
    console.warn('MODEM_GRID_API_KEY is not defined in environment variables.');
  }

  const url = endpoint.startsWith('/') 
    ? `${MODEM_GRID_API_URL}${endpoint}` 
    : `${MODEM_GRID_API_URL}/${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': MODEM_GRID_API_KEY,
    ...(options.headers || {})
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Modem Grid API Error (${response.status}): ${errorText}`);
    }

    // Attempt to parse JSON response
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    return await response.text();
  } catch (error) {
    console.error(`Failed to execute Modem Grid API request to ${endpoint}:`, error.message);
    throw error;
  }
}

/**
 * Execute a configured API by name (runs in background)
 * @param {string} apiName - Name of the API to execute
 * @param {Object} variables - Variables required by the API
 * @param {string} modemId - Optional specific modem ID
 * @returns {Promise<Object>} Returns a session UUID
 */
async function executeApi(apiName, variables = {}, modemId = null) {
  const body = { variables };
  if (modemId) {
    body.modem_id = modemId;
  }

  return modemGridRequest(`/execute/${apiName}`, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

/**
 * Send a raw USSD code directly to a specific modem
 * @param {string} modemId - The modem identifier (e.g. 'dongle1')
 * @param {string} ussdCode - The USSD code (e.g. '*123#')
 * @returns {Promise<Object>} API response
 */
async function sendUssd(modemId, ussdCode) {
  return modemGridRequest(`/modems/${modemId}/ussd?ussd_code=${encodeURIComponent(ussdCode)}`, {
    method: 'POST'
  });
}

/**
 * Get a list of all modems
 * @returns {Promise<Object>} List of modems
 */
async function getModems() {
  return modemGridRequest('/modems', {
    method: 'GET'
  });
}

/**
 * Create a new API definition programmatically
 * @param {Object} apiDefinition - The API definition object
 * @param {string} apiDefinition.name - Name of the API (e.g. 'transfer')
 * @param {string} [apiDefinition.description] - Description
 * @param {Array<Object>} apiDefinition.steps - Array of steps e.g. [{ action: 'send', code: '*123#' }]
 * @param {Array<Object>} [apiDefinition.variables] - Array of required variables e.g. [{ name: 'pin', required: true }]
 * @param {number} [apiDefinition.timeout_seconds=60] - Timeout in seconds
 * @returns {Promise<Object>} The created API definition
 */
async function createApiDefinition(apiDefinition) {
  return modemGridRequest('/definitions', {
    method: 'POST',
    body: JSON.stringify(apiDefinition)
  });
}

module.exports = {
  modemGridRequest,
  executeApi,
  sendUssd,
  getModems,
  createApiDefinition,
  MODEM_GRID_API_URL,
  MODEM_GRID_API_KEY
};
