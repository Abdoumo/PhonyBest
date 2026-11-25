/**
 * CreditShift Session & Offers Service
 * =============================================================
 * Handles automatic login and session renewal with creditshift.co
 * and fetches real-time SIM offers for any Algerian phone number.
 * 
 * Includes:
 * 1. Robust Node.js HTTPS client with IPv4 forcing (family: 4) and SSL resilience.
 * 2. Automatic Python fallback to test/test/get_offers.py if Node.js network is restricted.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { execFile } = require('child_process');

const BASE_URL = 'https://creditshift.co';

// Custom HTTPS Agent forcing IPv4 (avoids IPv6 hanging/failing on Ubuntu servers)
const httpsAgent = new https.Agent({
  family: 4,
  keepAlive: true,
  rejectUnauthorized: false,
  timeout: 15000,
});

class CreditShiftService {
  constructor() {
    this.session = {
      did: null,
      sid: null,
      role: 'seller',
      lastRefreshed: null
    };

    // Load initial cookies from disk if available
    this.initSession();
  }

  /**
   * Resolve credential file paths
   */
  getCredPaths() {
    return [
      path.resolve(__dirname, '../../../test/test/cred'),
      path.resolve(__dirname, '../../cred'),
      path.resolve(__dirname, '../../../cred')
    ];
  }

  /**
   * Resolve cookie file paths
   */
  getCookiePaths() {
    return [
      path.resolve(__dirname, '../../../test/test/cookies'),
      path.resolve(__dirname, '../../data/creditshift_cookies'),
      path.resolve(__dirname, '../../../cookies')
    ];
  }

  /**
   * Resolve Python script path
   */
  getPythonScriptPath() {
    return path.resolve(__dirname, '../../../test/test/get_offers.py');
  }

  /**
   * Parse credentials from environment or cred file
   */
  getCredentials() {
    const envUser = process.env.CREDITSHIFT_USERNAME;
    const envPass = process.env.CREDITSHIFT_PASSWORD;
    const envPin = process.env.CREDITSHIFT_PIN;

    if (envUser && envPass) {
      return {
        username: envUser.trim(),
        password: envPass.trim(),
        pin: (envPin || '').trim()
      };
    }

    for (const p of this.getCredPaths()) {
      if (fs.existsSync(p)) {
        try {
          const content = fs.readFileSync(p, 'utf8');
          const creds = {};
          content.split(/\r?\n/).forEach(line => {
            line = line.trim();
            if (!line || line.startsWith('#')) return;
            const idx = line.indexOf('=');
            if (idx > -1) {
              const k = line.substring(0, idx).trim().toLowerCase();
              const v = line.substring(idx + 1).trim();
              creds[k] = v;
            }
          });

          const username = creds.username || creds.user;
          const password = creds.pass || creds.password;
          const pin = creds.pin || '';

          if (username && password) {
            return { username, password, pin };
          }
        } catch (e) {
          console.warn(`[CreditShift] Error reading cred file at ${p}:`, e.message);
        }
      }
    }

    return null;
  }

  /**
   * Load cookies from cache file
   */
  initSession() {
    for (const p of this.getCookiePaths()) {
      if (fs.existsSync(p)) {
        try {
          const content = fs.readFileSync(p, 'utf8');
          const sidMatch = content.match(/SID=([^\s;\r\n]+)/);
          const didMatch = content.match(/DID=([a-f0-9]{32,64})/i);

          if (sidMatch) this.session.sid = sidMatch[1];
          if (didMatch) this.session.did = didMatch[1];

          if (this.session.sid && this.session.did) {
            this.session.lastRefreshed = new Date();
            break;
          }
        } catch (e) {
          console.warn(`[CreditShift] Error reading cookies from ${p}:`, e.message);
        }
      }
    }

    if (!this.session.did) {
      this.session.did = process.env.CREDITSHIFT_DID || 'b66a803e173c0989ab6a1e108ba18a6da07bfec9d313c041e95a4bb9900da4eb';
    }
  }

  /**
   * Save active cookies to file
   */
  saveSession(did, sid) {
    this.session.did = did;
    this.session.sid = sid;
    this.session.lastRefreshed = new Date();

    const cookieContent = `SID=${sid}\nDID=${did}\nCookie\n\tDID=${did}; SID=${sid}; language=ar\n`;

    for (const p of this.getCookiePaths()) {
      try {
        const dir = path.dirname(p);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(p, cookieContent, 'utf8');
        break;
      } catch (e) {
        // Continue to next path
      }
    }
  }

  /**
   * Format cookie header string
   */
  getCookieHeader() {
    if (!this.session.did || !this.session.sid) return '';
    return `DID=${this.session.did}; SID=${this.session.sid}; language=ar`;
  }

  /**
   * Robust HTTPS request with family: 4 (IPv4) forcing
   */
  httpRequest(targetUrl, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const u = new URL(targetUrl);
        const isHttps = u.protocol === 'https:';
        const client = isHttps ? https : http;

        const headers = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'ar,fr;q=0.9,en;q=0.8',
          ...(options.headers || {})
        };

        const reqOptions = {
          method: options.method || 'GET',
          headers,
          agent: isHttps ? httpsAgent : undefined,
          family: 4, // Force IPv4
          rejectUnauthorized: false,
          timeout: options.timeout || 15000,
        };

        const req = client.request(u, reqOptions, (res) => {
          let chunks = [];
          res.on('data', chunk => chunks.push(chunk));
          res.on('end', () => {
            const body = Buffer.concat(chunks).toString('utf8');
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body,
            });
          });
        });

        req.on('timeout', () => {
          req.destroy();
          reject(new Error(`Request to ${u.hostname} timed out after 15s`));
        });

        req.on('error', (err) => {
          reject(new Error(`HTTPS error (${err.code || 'UNKNOWN'}): ${err.message}`));
        });

        if (options.body) {
          req.write(options.body);
        }
        req.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Perform automatic login to CreditShift via Node HTTPS
   */
  async login() {
    const creds = this.getCredentials();
    if (!creds) {
      throw new Error('CreditShift credentials not configured. Please set CREDITSHIFT_USERNAME/PASSWORD in .env or test/test/cred.');
    }

    const did = this.session.did || 'b66a803e173c0989ab6a1e108ba18a6da07bfec9d313c041e95a4bb9900da4eb';
    console.log(`[CreditShift] Logging in as '${creds.username}'...`);

    // Step 1: POST /login
    const loginParams = new URLSearchParams({
      auth_token: did,
      location_lat: '',
      location_long: '',
      username: creds.username,
      password: creds.password,
      remember: 'on'
    }).toString();

    const loginRes = await this.httpRequest(`${BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': `${BASE_URL}/login`,
        'Cookie': `DID=${did}`,
        'Content-Length': Buffer.byteLength(loginParams)
      },
      body: loginParams
    });

    // Extract SID from Set-Cookie headers
    let sid = null;
    const rawSetCookies = loginRes.headers['set-cookie'] || [];
    const setCookieStr = Array.isArray(rawSetCookies) ? rawSetCookies.join('; ') : String(rawSetCookies);
    const sidMatch = setCookieStr.match(/SID=([^;,\s]+)/);
    if (sidMatch) {
      sid = sidMatch[1];
    }

    if (!sid) {
      if (loginRes.body.includes('Invalid') || loginRes.body.includes('غير صحيح')) {
        throw new Error('CreditShift login failed: Invalid username or password.');
      }
      throw new Error(`CreditShift login failed: No session cookie received (status ${loginRes.statusCode})`);
    }

    let cookieHeader = `DID=${did}; SID=${sid}; language=ar`;

    // Step 2: Check /seller to verify if PIN verification is required
    const checkRes = await this.httpRequest(`${BASE_URL}/seller`, {
      method: 'GET',
      headers: { 'Cookie': cookieHeader }
    });

    if (checkRes.statusCode !== 200 || checkRes.body.includes('verifyPin') || checkRes.body.includes('أدخل الرقم السري')) {
      if (!creds.pin) {
        throw new Error('CreditShift PIN verification required but no PIN provided in credentials.');
      }

      console.log('[CreditShift] Submitting 4-digit PIN verification...');
      const pinParams = new URLSearchParams({
        auth_token: did,
        pin: creds.pin
      }).toString();

      const pinRes = await this.httpRequest(`${BASE_URL}/verifyPin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': `${BASE_URL}/seller`,
          'Cookie': cookieHeader,
          'Content-Length': Buffer.byteLength(pinParams)
        },
        body: pinParams
      });

      const pinSetCookies = pinRes.headers['set-cookie'] || [];
      const pinCookieStr = Array.isArray(pinSetCookies) ? pinSetCookies.join('; ') : String(pinSetCookies);
      const pinSidMatch = pinCookieStr.match(/SID=([^;,\s]+)/);
      if (pinSidMatch) {
        sid = pinSidMatch[1];
        cookieHeader = `DID=${did}; SID=${sid}; language=ar`;
      }

      const verifyRes = await this.httpRequest(`${BASE_URL}/seller`, {
        method: 'GET',
        headers: { 'Cookie': cookieHeader }
      });

      if (verifyRes.statusCode !== 200) {
        throw new Error(`CreditShift PIN verification failed (status ${verifyRes.statusCode})`);
      }
    }

    console.log('[CreditShift] Login successful! New session token cached.');
    this.saveSession(did, sid);
    return { did, sid, role: this.session.role };
  }

  /**
   * Fallback: Query via Python script test/test/get_offers.py
   */
  fetchViaPython(phone) {
    return new Promise((resolve, reject) => {
      const scriptPath = this.getPythonScriptPath();
      if (!fs.existsSync(scriptPath)) {
        return reject(new Error(`Python script not found at ${scriptPath}`));
      }

      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
      execFile(pythonCmd, [scriptPath, phone, '--json'], { timeout: 20000 }, (error, stdout, stderr) => {
        if (error) {
          return reject(new Error(`Python script error: ${error.message} (stderr: ${stderr})`));
        }

        try {
          // Parse stdout (may have banner logs before JSON)
          const jsonStart = stdout.indexOf('[');
          const jsonObjectStart = stdout.indexOf('{');
          const startIdx = (jsonStart > -1 && (jsonObjectStart === -1 || jsonStart < jsonObjectStart))
            ? jsonStart
            : jsonObjectStart;

          if (startIdx === -1) {
            return reject(new Error(`No valid JSON output from Python script: ${stdout.slice(0, 200)}`));
          }

          const cleanJson = stdout.slice(startIdx).trim();
          const parsed = JSON.parse(cleanJson);

          // Refresh cookies in memory if python script updated cookies file
          this.initSession();

          resolve(parsed);
        } catch (parseErr) {
          reject(new Error(`JSON parse error from Python script: ${parseErr.message}`));
        }
      });
    });
  }

  /**
   * Fetch real available offers for a specific customer phone number
   * @param {string} phone - 10-digit Algerian phone number
   * @returns {Promise<Array>} List of offers [{ offerName, offerAmount }]
   */
  async getFlexyOffers(phone) {
    const cleaned = String(phone || '').replace(/\D/g, '');
    let cleanPhone = cleaned.startsWith('213') ? '0' + cleaned.slice(3) : cleaned;

    if (cleanPhone.length !== 10) {
      throw new Error(`Invalid phone number: ${phone} (must be 10 digits)`);
    }

    // Try Node HTTPS client first
    let nodeError = null;
    try {
      if (!this.session.sid) {
        await this.login();
      }

      const role = this.session.role || 'seller';
      const url = `${BASE_URL}/${role}/getFlexyOffers?phoneNbr=${cleanPhone}`;

      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await this.httpRequest(url, {
          method: 'GET',
          headers: {
            'Referer': `${BASE_URL}/${role}/flexy`,
            'Cookie': this.getCookieHeader(),
          }
        });

        // 302 redirect or login HTML => session expired
        if (res.statusCode === 302 || (res.body && res.body.includes('/login'))) {
          console.log('[CreditShift] Session expired (302 redirect). Re-authenticating...');
          await this.login();
          continue;
        }

        const data = JSON.parse(res.body);

        if (data && typeof data === 'object' && !Array.isArray(data) && data.error) {
          const errObj = data.error;
          const msg = errObj.message_ar || errObj.message || JSON.stringify(errObj);
          return { error: msg, offers: [] };
        }

        if (Array.isArray(data)) {
          return { error: null, offers: data };
        }

        return { error: null, offers: [] };
      }
    } catch (err) {
      nodeError = err;
      console.warn(`[CreditShift] Node HTTPS request failed (${err.message}). Trying Python fallback...`);
    }

    // Fallback: Run Python get_offers.py directly
    try {
      const pythonData = await this.fetchViaPython(cleanPhone);
      if (Array.isArray(pythonData)) {
        console.log(`[CreditShift] Python fallback succeeded for ${cleanPhone}: ${pythonData.length} offers found.`);
        return { error: null, offers: pythonData };
      }
      if (pythonData && pythonData.error) {
        return { error: pythonData.error.message_ar || pythonData.error.message || 'خطأ من السيرفر', offers: [] };
      }
    } catch (pyErr) {
      console.warn(`[CreditShift] Python fallback also failed: ${pyErr.message}`);
    }

    throw new Error(`CreditShift query failed: ${nodeError ? nodeError.message : 'Unknown network failure'}`);
  }
}

module.exports = new CreditShiftService();
