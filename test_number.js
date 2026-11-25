/**
 * 📱 Test Numbers & SIM Offers via YOUR ModemGrid (Standalone)
 * =============================================================
 * Queries your own ModemGrid PRO to check SIM offers for a number.
 * No CreditShift or external service needed.
 *
 * Usage:
 *   node test_number.js <PHONE_NUMBER>
 *
 * Examples:
 *   node test_number.js 0699326406   (Mobilis)
 *   node test_number.js 0775512407   (Djezzy)
 *   node test_number.js 0550123456   (Ooredoo)
 */

const readline = require('readline');
const https = require('https');
const http = require('http');
const path = require('path');
const fs = require('fs');

// ─── Load backend/.env ───
let MODEM_GRID_API_URL = '';
let MODEM_GRID_API_KEY = '';
let BACKEND_URL = '';

try {
  const envPath = path.join(__dirname, 'backend', '.env');
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
      const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (!m) return;
      let v = (m[2] || '').replace(/^["']|["']$/g, '').trim();
      if (m[1] === 'MODEM_GRID_API_URL') MODEM_GRID_API_URL = v;
      if (m[1] === 'MODEM_GRID_API_KEY') MODEM_GRID_API_KEY = v;
      if (m[1] === 'PORT') BACKEND_URL = `http://localhost:${v}`;
    });
  }
} catch (e) {}

// ─── Helpers ───

function analyzePhoneNumber(raw) {
  if (!raw) return { isValid: false, error: 'لم يتم إدخال رقم' };
  const cleaned = raw.replace(/[^0-9]/g, '');
  let n = cleaned.startsWith('213') ? '0' + cleaned.slice(3) : cleaned;

  if (n.length !== 10) {
    return { isValid: false, error: `رقم غير صالح (${n.length} أرقام بدل 10)` };
  }

  const map = {
    '06': { op: 'mobilis',  ar: 'موبيليس (Mobilis)',  ussd: '*600#' },
    '07': { op: 'djezzy',   ar: 'جيزي (Djezzy)',      ussd: '*707#' },
    '05': { op: 'ooredoo',  ar: 'أوريدو (Ooredoo)',   ussd: '*505#' },
  };
  const prefix = n.slice(0, 2);
  const info = map[prefix];
  if (!info) return { isValid: false, error: `بادئة غير معروفة: ${prefix}` };

  return { isValid: true, number: n, ...info };
}

function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const client = u.protocol === 'https:' ? https : http;
    const method = options.method || 'GET';
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers || {})
    };

    const req = client.request(u, { method, headers, timeout: 15000 }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body), raw: body }); }
        catch { resolve({ status: res.statusCode, data: null, raw: body }); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (options.body) req.write(options.body);
    req.end();
  });
}

function mgFetch(endpoint, opts = {}) {
  const url = MODEM_GRID_API_URL.replace(/\/$/, '') + endpoint;
  return httpRequest(url, {
    ...opts,
    headers: { 'X-API-Key': MODEM_GRID_API_KEY, ...(opts.headers || {}) }
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Core ───

async function getModems() {
  console.log('\n🔌 جاري الاتصال بـ ModemGrid PRO...');
  console.log(`   URL: ${MODEM_GRID_API_URL}/modems`);
  const res = await mgFetch('/modems');
  if (res.status !== 200) throw new Error(`ModemGrid error ${res.status}: ${res.raw.slice(0, 200)}`);
  const modems = Array.isArray(res.data) ? res.data : (res.data?.modems || []);
  return modems;
}

async function getApiDefinitions() {
  const res = await mgFetch('/definitions');
  if (res.status !== 200) return [];
  return Array.isArray(res.data) ? res.data : (res.data?.definitions || res.data?.apis || []);
}

async function executeAndPoll(apiName, variables, timeoutMs = 30000) {
  const execRes = await mgFetch(`/execute/${apiName}`, {
    method: 'POST',
    body: JSON.stringify({ variables })
  });

  if (execRes.status !== 200 && execRes.status !== 201) {
    throw new Error(`Execute failed (${execRes.status}): ${execRes.raw.slice(0, 200)}`);
  }

  const sessionId = execRes.data?.session_id;
  if (!sessionId) throw new Error('No session_id returned');

  console.log(`   ⏳ جاري تنفيذ كود USSD... (session: ${sessionId.slice(0, 8)}...)`);

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await sleep(2000);
    const statusRes = await mgFetch(`/execute/status/${sessionId}`);
    const s = statusRes.data;
    if (!s) continue;

    process.stdout.write(`   ⏳ الحالة: ${s.status || 'polling'}...\r`);

    if (['completed', 'success', 'failed', 'timeout', 'error'].includes(s.status)) {
      console.log(`   ✅ انتهى التنفيذ: ${s.status}`);
      return s;
    }
  }
  throw new Error('Timeout waiting for USSD response');
}

function parseOffersFromUssd(rawText, operator) {
  if (!rawText) return [];
  const offers = [];
  const lines = rawText.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    // Try to match patterns like "1. Sama Mix 100 - 100 DA" or "Sama Mix 500"
    let match;

    // Pattern: "OfferName AmountDA" or "OfferName Amount Da"
    match = line.match(/^(?:\d+[\.\)]\s*)?(.+?)\s*[-–:]\s*(\d+)\s*(?:DA|دج|Da)?/i);
    if (match) {
      offers.push({ offerName: match[1].trim(), offerAmount: parseInt(match[2]) });
      continue;
    }

    // Pattern: numbered list "1) Offer Name"
    match = line.match(/^(\d+)[\.\)]\s*(.+)/);
    if (match) {
      const name = match[2].trim();
      // Try to extract amount from name
      const amtMatch = name.match(/(\d+)\s*(?:DA|دج|Da)?$/i);
      offers.push({
        offerName: name,
        offerAmount: amtMatch ? parseInt(amtMatch[1]) : 0
      });
    }
  }

  return offers;
}

// ─── Known offers catalog (from HAR + operator knowledge) ───

const KNOWN_OFFERS = {
  mobilis: [
    { offerName: 'Sama Mix 50',   offerAmount: 50 },
    { offerName: 'Sama Mix 100',  offerAmount: 100 },
    { offerName: 'Sama Mix 500',  offerAmount: 500 },
    { offerName: 'Sama Mix 1000', offerAmount: 1000 },
    { offerName: 'Sama Mix 1500', offerAmount: 1500 },
    { offerName: 'Sama Mix 2000', offerAmount: 2000 },
    { offerName: 'Sama Talk 500', offerAmount: 500 },
    { offerName: 'Sama Talk 1000',offerAmount: 1000 },
    { offerName: 'Sama Talk 1500',offerAmount: 1500 },
    { offerName: 'Sama Talk 2000',offerAmount: 2000 },
    { offerName: 'Sama Net 500',  offerAmount: 500 },
    { offerName: 'Sama Net 1000', offerAmount: 1000 },
    { offerName: 'Sama Net 1500', offerAmount: 1500 },
    { offerName: 'Sama Net 2000', offerAmount: 2000 },
  ],
  djezzy: [
    { offerName: 'HAYLA BEZZEF Special 500 Da',  offerAmount: 500 },
    { offerName: 'HAYLA BEZZEF Classic 1000 Da', offerAmount: 1000 },
    { offerName: 'HAYLA BEZZEF Classic 1500 Da', offerAmount: 1500 },
    { offerName: 'HAYLA BEZZEF Classic 2000 Da', offerAmount: 2000 },
    { offerName: 'HAYLA BEZZEF Extra 3000 Da',   offerAmount: 3000 },
  ],
  ooredoo: [
    { offerName: 'YOOZ 500 Da',      offerAmount: 500 },
    { offerName: 'YOOZ 1000 Da',     offerAmount: 1000 },
    { offerName: 'YOOZ 1500 Da',     offerAmount: 1500 },
    { offerName: 'SAHLA Box 2000 Da', offerAmount: 2000 },
  ],
};

// ─── Display ───

function printOffers(offers, operator) {
  if (!offers.length) {
    console.log('   ℹ️  لا توجد عروض.');
    return;
  }

  console.log(`   ✅ ${offers.length} عرض متوفر:\n`);

  if (operator === 'mobilis' && offers.some(o => o.offerName.startsWith('Sama'))) {
    const cats = {
      'Sama Mix':  offers.filter(o => o.offerName.includes('Mix')),
      'Sama Talk': offers.filter(o => o.offerName.includes('Talk')),
      'Sama Net':  offers.filter(o => o.offerName.includes('Net')),
    };
    for (const [cat, list] of Object.entries(cats)) {
      if (!list.length) continue;
      console.log(`   📂 [${cat}]:`);
      list.forEach(o => console.log(`      ⚡ ${o.offerName.padEnd(20)} 💰 ${String(o.offerAmount).padStart(5)} د.ج`));
      console.log('');
    }
  } else {
    offers.forEach((o, i) => {
      const clean = o.offerName.replace(/\d+_DA\|/g, '');
      console.log(`   [${i+1}] 🏷️  ${clean.padEnd(30)} 💰 ${String(o.offerAmount).padStart(5)} د.ج`);
    });
  }
}

// ─── Main ───

async function run(phoneInput) {
  console.log('═'.repeat(65));
  console.log('  📱 أداة فحص الأرقام وعروض الشرائح عبر ModemGrid PRO');
  console.log('═'.repeat(65));

  const info = analyzePhoneNumber(phoneInput);
  if (!info.isValid) {
    console.log(`\n❌ ${info.error}`);
    return;
  }

  console.log(`\n📋 معلومات الرقم:`);
  console.log(`   • الرقم     : ${info.number}`);
  console.log(`   • المتعامل  : ${info.ar}`);
  console.log(`   • USSD      : ${info.ussd}`);

  if (!MODEM_GRID_API_URL || !MODEM_GRID_API_KEY) {
    console.log('\n⚠️  لم يتم العثور على MODEM_GRID_API_URL أو MODEM_GRID_API_KEY في backend/.env');
    console.log('   📂 عرض كتالوج العروض المعروفة لهذا المتعامل:\n');
    printOffers(KNOWN_OFFERS[info.op] || [], info.op);
    return;
  }

  // Step 1: Get modems & find one for this operator
  try {
    const modems = await getModems();
    console.log(`   ✅ متصل بـ ModemGrid! (${modems.length} مودم)`);

    const opModems = modems.filter(m => {
      const mOp = (m.operator || m.name || '').toLowerCase();
      return mOp.includes(info.op);
    });

    const onlineModems = opModems.filter(m =>
      m.online === true || m.connected === true ||
      ['idle', 'ready', 'active', 'online', 'connected'].includes(String(m.status || '').toLowerCase())
    );

    console.log(`\n📡 مودمات ${info.ar}:`);
    if (opModems.length === 0) {
      console.log(`   ⚠️  لا يوجد مودم ${info.ar} مسجل في ModemGrid.`);
    } else {
      opModems.forEach(m => {
        const status = (m.online || m.connected) ? '🟢 متصل' : '🔴 غير متصل';
        const bal = m.balance != null ? `${m.balance} DA` : 'غير محدد';
        const id = m.dongle_id || m.modem_id || m.id || '?';
        console.log(`   ${status}  ${(m.name || id).padEnd(20)} رصيد: ${bal.padStart(10)}  (ID: ${id})`);
      });
    }

    // Step 2: Get API definitions
    const apis = await getApiDefinitions();
    console.log(`\n📋 الـ APIs المتوفرة في ModemGrid (${apis.length}):`);
    if (apis.length > 0) {
      apis.forEach(a => {
        const name = a.name || a.api_name || '?';
        const desc = a.description || '';
        console.log(`   • ${name.padEnd(25)} ${desc.slice(0, 40)}`);
      });
    } else {
      console.log('   ℹ️  لم يتم العثور على APIs مسجلة.');
    }

    // Step 3: Try to find & run a "get offers" API or USSD code
    const offerApiNames = apis
      .map(a => a.name || a.api_name || '')
      .filter(n => /offer|offre|sam|hay|yoo|sah/i.test(n));

    let liveOffers = [];

    if (onlineModems.length > 0) {
      const modem = onlineModems[0];
      const modemId = modem.dongle_id || modem.modem_id || modem.id;

      // Try querying a "get_offers" API if one exists
      if (offerApiNames.length > 0) {
        console.log(`\n🔍 جاري استعلام العروض عبر API: ${offerApiNames[0]}...`);
        try {
          const result = await executeAndPoll(offerApiNames[0], {
            phone_number: info.number,
            phone: info.number,
          });
          if (result.result || result.response) {
            const raw = JSON.stringify(result.result || result.response || result);
            console.log(`   📄 الرد الخام: ${raw.slice(0, 300)}`);
            liveOffers = parseOffersFromUssd(raw, info.op);
          }
        } catch (e) {
          console.log(`   ⚠️  ${e.message}`);
        }
      }

      // If no offer API, try direct USSD
      if (liveOffers.length === 0) {
        console.log(`\n🔍 جاري إرسال USSD ${info.ussd} عبر المودم ${modemId}...`);
        try {
          const ussdRes = await mgFetch(`/modems/${modemId}/ussd?ussd_code=${encodeURIComponent(info.ussd)}`, {
            method: 'POST'
          });
          if (ussdRes.status === 200 && ussdRes.data) {
            const rawUssd = ussdRes.data.response || ussdRes.data.message || ussdRes.data.result || JSON.stringify(ussdRes.data);
            console.log(`   📄 رد USSD:\n   ${rawUssd.replace(/\n/g, '\n   ')}\n`);
            liveOffers = parseOffersFromUssd(rawUssd, info.op);
          } else {
            console.log(`   ⚠️  USSD رد بـ: ${ussdRes.status} - ${ussdRes.raw.slice(0, 200)}`);
          }
        } catch (e) {
          console.log(`   ⚠️  USSD error: ${e.message}`);
        }
      }
    } else {
      console.log(`\n⚠️  لا يوجد مودم ${info.ar} متصل حالياً لاستعلام العروض الحية.`);
    }

    // Step 4: Display offers
    console.log(`\n📋 العروض المتوفرة لـ ${info.ar}:`);
    if (liveOffers.length > 0) {
      console.log('   (من الشريحة مباشرة - Live)');
      printOffers(liveOffers, info.op);
    } else {
      console.log('   (من الكتالوج المحفوظ - Catalog)');
      printOffers(KNOWN_OFFERS[info.op] || [], info.op);
    }

  } catch (err) {
    console.log(`\n❌ خطأ في الاتصال بـ ModemGrid: ${err.message}`);
    console.log('   📂 عرض كتالوج العروض المعروفة:\n');
    printOffers(KNOWN_OFFERS[info.op] || [], info.op);
  }

  console.log('\n' + '═'.repeat(65));
  console.log('🏁 اكتمل الفحص.');
  console.log('═'.repeat(65) + '\n');
}

// ─── CLI Entry ───
const phoneArg = process.argv[2];

if (phoneArg && !phoneArg.startsWith('--')) {
  run(phoneArg);
} else {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('👉 أدخل رقم الهاتف (مثال: 0699326406): ', answer => {
    rl.close();
    run(answer.trim());
  });
}
