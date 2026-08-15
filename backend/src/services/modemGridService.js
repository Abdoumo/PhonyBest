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
 * Execute a USSD command via Modem Grid API
 * @param {string} ussd - The USSD code to execute (e.g., '*123#')
 * @param {string} modem - Optional modem identifier or port
 * @returns {Promise<Object>} API response
 */
async function executeUssd(ussd, modem) {
  const body = { ussd };
  if (modem) {
    body.modem = modem;
  }

  return modemGridRequest('/ussd/execute', {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

module.exports = {
  modemGridRequest,
  executeUssd,
  MODEM_GRID_API_URL,
  MODEM_GRID_API_KEY
};
