/**
 * CreditShift Session & Offers Service
 * =============================================================
 * Handles automatic login and session renewal with creditshift.co
 * and fetches real-time SIM offers for any Algerian phone number.
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://creditshift.co';

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
   * Perform automatic login to CreditShift
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
    });

    const loginRes = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': `${BASE_URL}/login`,
        'Cookie': `DID=${did}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: loginParams.toString(),
      redirect: 'manual'
    });

    // Extract SID from Set-Cookie headers
    let sid = null;
    const rawSetCookie = loginRes.headers.get('set-cookie') || '';
    const sidMatch = rawSetCookie.match(/SID=([^;,\s]+)/);
    if (sidMatch) {
      sid = sidMatch[1];
    }

    if (!sid) {
      // Check if we already have a sid or if response body has a clue
      const body = await loginRes.text();
      if (body.includes('Invalid') || body.includes('غير صحيح')) {
        throw new Error('CreditShift login failed: Invalid username or password.');
      }
      throw new Error('CreditShift login failed: No session cookie received.');
    }

    let cookieHeader = `DID=${did}; SID=${sid}; language=ar`;

    // Step 2: Check /seller to verify if PIN verification is required
    const checkRes = await fetch(`${BASE_URL}/seller`, {
      method: 'GET',
      headers: {
        'Cookie': cookieHeader,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      redirect: 'manual'
    });

    const checkBody = await checkRes.text();

    if (checkRes.status !== 200 || checkBody.includes('verifyPin') || checkBody.includes('أدخل الرقم السري')) {
      if (!creds.pin) {
        throw new Error('CreditShift PIN verification required but no PIN provided in credentials.');
      }

      console.log('[CreditShift] Submitting 4-digit PIN verification...');
      const pinParams = new URLSearchParams({
        auth_token: did,
        pin: creds.pin
      });

      const pinRes = await fetch(`${BASE_URL}/verifyPin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': `${BASE_URL}/seller`,
          'Cookie': cookieHeader,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: pinParams.toString(),
        redirect: 'manual'
      });

      const pinSetCookie = pinRes.headers.get('set-cookie') || '';
      const pinSidMatch = pinSetCookie.match(/SID=([^;,\s]+)/);
      if (pinSidMatch) {
        sid = pinSidMatch[1];
        cookieHeader = `DID=${did}; SID=${sid}; language=ar`;
      }

      // Verify dashboard access again
      const verifyRes = await fetch(`${BASE_URL}/seller`, {
        method: 'GET',
        headers: {
          'Cookie': cookieHeader,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        redirect: 'manual'
      });

      if (verifyRes.status !== 200) {
        throw new Error(`CreditShift PIN verification failed (status ${verifyRes.status})`);
      }
    }

    console.log('[CreditShift] Login successful! New session token cached.');
    this.saveSession(did, sid);
    return { did, sid, role: this.session.role };
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

    // Ensure session is initialized
    if (!this.session.sid) {
      await this.login();
    }

    const role = this.session.role || 'seller';
    const url = `${BASE_URL}/${role}/getFlexyOffers?phoneNbr=${cleanPhone}`;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'Referer': `${BASE_URL}/${role}/flexy`,
            'Cookie': this.getCookieHeader(),
            'Accept': 'application/json, text/plain, */*',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          redirect: 'manual'
        });

        // If redirected or status 302, session is expired
        if (res.status === 302 || res.headers.get('location')) {
          console.log('[CreditShift] Session expired (302 redirect). Re-authenticating...');
          await this.login();
          continue;
        }

        const text = await res.text();
        if (text.trim().startsWith('<!DOCTYPE') || text.includes('/login')) {
          console.log('[CreditShift] Received HTML login page instead of JSON. Re-authenticating...');
          await this.login();
          continue;
        }

        const data = JSON.parse(text);

        // Check if CreditShift returned an error payload
        if (data && typeof data === 'object' && !Array.isArray(data) && data.error) {
          const errObj = data.error;
          const msg = errObj.message_ar || errObj.message || JSON.stringify(errObj);
          return { error: msg, offers: [] };
        }

        if (Array.isArray(data)) {
          return { error: null, offers: data };
        }

        return { error: null, offers: [] };
      } catch (err) {
        if (attempt === 0) {
          console.warn(`[CreditShift] Fetch error on attempt 1: ${err.message}. Retrying with re-login...`);
          try {
            await this.login();
            continue;
          } catch (loginErr) {
            throw new Error(`CreditShift query failed: ${err.message} (login retry failed: ${loginErr.message})`);
          }
        }
        throw err;
      }
    }

    return { error: 'Failed to fetch offers after retry', offers: [] };
  }
}

module.exports = new CreditShiftService();
