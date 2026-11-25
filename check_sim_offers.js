/**
 * 📱 Check SIM Offers & Profile (Standalone Tool)
 * =============================================================
 * Checks whether a customer's SIM card is SAMA, PIXX, HAYLA, etc.
 * and displays only the REALLY available offers for that SIM type,
 * exactly like CreditShift does.
 *
 * Usage:
 *   node check_sim_offers.js <PHONE_NUMBER>
 *
 * Examples:
 *   node check_sim_offers.js 0699326406   (Mobilis -> Checks Sama vs PixX)
 *   node check_sim_offers.js 0775512407   (Djezzy -> Checks Hayla Bezzef)
 *   node check_sim_offers.js 0550123456   (Ooredoo -> Checks Yooz / Sahla + Sabbaqli)
 */

const readline = require('readline');
const https = require('https');
const http = require('http');
const path = require('path');
const fs = require('fs');

// ─── Load Environment Configuration ───
let MODEM_GRID_API_URL = '';
let MODEM_GRID_API_KEY = '';
let DATABASE_URL = '';

try {
  const envPath = path.join(__dirname, 'backend', '.env');
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
      const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (!m) return;
      const key = m[1];
      let val = (m[2] || '').replace(/^["']|["']$/g, '').trim();
      if (key === 'MODEM_GRID_API_URL') MODEM_GRID_API_URL = val;
      if (key === 'MODEM_GRID_API_KEY') MODEM_GRID_API_KEY = val;
      if (key === 'DATABASE_URL') DATABASE_URL = val;
    });
  }
} catch (e) {}

// ─── Operator & Profile Definitions ───

const PROFILES = {
  mobilis: {
    sama: {
      title: 'موبيليس - شريحة سَمَا (Sama)',
      description: 'شريحة تدعم عروض Sama Mix و Sama Talk و Sama Net',
      offers: [
        { category: 'Sama Mix', name: 'Sama Mix 50',   amount: 50,   duration: '24 ساعة', code: 'Sama Mix 50' },
        { category: 'Sama Mix', name: 'Sama Mix 100',  amount: 100,  duration: '24 ساعة', code: 'Sama Mix 100' },
        { category: 'Sama Mix', name: 'Sama Mix 500',  amount: 500,  duration: '15 يوم',  code: 'Sama Mix 500' },
        { category: 'Sama Mix', name: 'Sama Mix 1000', amount: 1000, duration: 'شهر',    code: 'Sama Mix 1000' },
        { category: 'Sama Mix', name: 'Sama Mix 1500', amount: 1500, duration: 'شهر',    code: 'Sama Mix 1500' },
        { category: 'Sama Mix', name: 'Sama Mix 2000', amount: 2000, duration: 'شهر',    code: 'Sama Mix 2000' },
        { category: 'Sama Talk', name: 'Sama Talk 500',  amount: 500,  duration: '15 يوم', code: 'Sama Talk 500' },
        { category: 'Sama Talk', name: 'Sama Talk 1000', amount: 1000, duration: 'شهر',   code: 'Sama Talk 1000' },
        { category: 'Sama Talk', name: 'Sama Talk 1500', amount: 1500, duration: 'شهر',   code: 'Sama Talk 1500' },
        { category: 'Sama Talk', name: 'Sama Talk 2000', amount: 2000, duration: 'شهر',   code: 'Sama Talk 2000' },
        { category: 'Sama Net', name: 'Sama Net 500',  amount: 500,  duration: '15 يوم',  code: 'Sama Net 500' },
        { category: 'Sama Net', name: 'Sama Net 1000', amount: 1000, duration: 'شهر',    code: 'Sama Net 1000' },
        { category: 'Sama Net', name: 'Sama Net 1500', amount: 1500, duration: 'شهر',    code: 'Sama Net 1500' },
        { category: 'Sama Net', name: 'Sama Net 2000', amount: 2000, duration: 'شهر',    code: 'Sama Net 2000' },
      ]
    },
    pixx: {
      title: 'موبيليس - شريحة بيكس (PixX)',
      description: 'شريحة تدعم عروض PixX للمكالمات والإنترنت',
      offers: [
        { category: 'PixX', name: 'PixX 50',   amount: 50,   duration: '24 ساعة', code: 'PixX 50' },
        { category: 'PixX', name: 'PixX 100',  amount: 100,  duration: '24 ساعة', code: 'PixX 100' },
        { category: 'PixX', name: 'PixX 500',  amount: 500,  duration: '15 يوم',  code: 'PixX 500' },
        { category: 'PixX', name: 'PixX 1000', amount: 1000, duration: 'شهر',    code: 'PixX 1000' },
        { category: 'PixX', name: 'PixX 2000', amount: 2000, duration: 'شهر',    code: 'PixX 2000' },
      ]
    },
    normal: {
      title: 'موبيليس - رصيد عادي / فاتورة (Normal / Facture)',
      description: 'هذا الخط لا يدعم تفعيل العروض مباشرة، يقبل فقط شحن الرصيد العادي (Flexy Solde)',
      offers: []
    }
  },
  djezzy: {
    hayla: {
      title: 'جيزي - هايلة بزاف (Hayla Bezzef / Special)',
      description: 'عروض جيزي هايلة بزاف للمكالمات والإنترنت',
      offers: [
        { category: 'Hayla', name: 'HAYLA BEZZEF Special 500 Da',  amount: 500,  duration: '15 يوم', code: '500_DA|HAYLA BEZZEF Special 500 Da' },
        { category: 'Hayla', name: 'HAYLA BEZZEF Classic 1000 Da', amount: 1000, duration: 'شهر',   code: '1000_DA|HAYLA BEZZEF Classic 1000 Da' },
        { category: 'Hayla', name: 'HAYLA BEZZEF Classic 1500 Da', amount: 1500, duration: 'شهر',   code: '1500_DA|HAYLA BEZZEF Classic 1500 Da' },
        { category: 'Hayla', name: 'HAYLA BEZZEF Classic 2000 Da', amount: 2000, duration: 'شهر',   code: '2000_DA|HAYLA BEZZEF Classic 2000 Da' },
        { category: 'Hayla', name: 'HAYLA BEZZEF Extra 3000 Da',   amount: 3000, duration: 'شهر',   code: '3000_DA|HAYLA BEZZEF Extra 3000 Da' },
      ]
    },
    normal: {
      title: 'جيزي - رصيد عادي / فاتورة',
      description: 'يقبل فقط شحن الرصيد العادي',
      offers: []
    }
  },
  ooredoo: {
    yooz_sahla: {
      title: 'أوريدو - عروض يوز وساهلة (Yooz / Sahla)',
      description: 'عروض أوريدو للإنترنت والمكالمات (مع فحص ديون سبقلي)',
      offers: [
        { category: 'Yooz',  name: 'YOOZ 500 Da',      amount: 500,  duration: '15 يوم', code: '500_DA|YOOZ 500 Da' },
        { category: 'Yooz',  name: 'YOOZ 1000 Da',     amount: 1000, duration: 'شهر',   code: '1000_DA|YOOZ 1000 Da' },
        { category: 'Yooz',  name: 'YOOZ 1500 Da',     amount: 1500, duration: 'شهر',   code: '1500_DA|YOOZ 1500 Da' },
        { category: 'Sahla', name: 'SAHLA Box 2000 Da', amount: 2000, duration: 'شهر',  code: '2000_DA|SAHLA Box 2000 Da' },
      ]
    },
    normal: {
      title: 'أوريدو - رصيد عادي',
      description: 'يقبل فقط شحن الرصيد العادي',
      offers: []
    }
  }
};

// ─── Number Analysis ───

function parseNumber(raw) {
  if (!raw) return { isValid: false, error: 'يرجى إدخال رقم الهاتف' };
  const cleaned = raw.replace(/[^0-9]/g, '');
  let n = cleaned.startsWith('213') ? '0' + cleaned.slice(3) : cleaned;

  if (n.length !== 10) {
    return { isValid: false, error: `رقم غير صحيح: الطول ${n.length} أرقام (المطلوب 10 أرقام)` };
  }

  const prefix = n.slice(0, 2);
  let op = '';
  let opName = '';
  let dealerUssd = '';

  if (prefix === '06') {
    op = 'mobilis';
    opName = 'موبيليس (Mobilis)';
    dealerUssd = '*630# (أرسلي عروض)';
  } else if (prefix === '07') {
    op = 'djezzy';
    opName = 'جيزي (Djezzy)';
    dealerUssd = '*707# / *720# (عروض جيزي)';
  } else if (prefix === '05') {
    op = 'ooredoo';
    opName = 'أوريدو (Ooredoo)';
    dealerUssd = '*707# / *229# (عروض أوريدو)';
  } else {
    return { isValid: false, error: `المتعامل غير معروف للبادئة: ${prefix}` };
  }

  return { isValid: true, number: n, op, opName, dealerUssd };
}

// ─── Network Helper ───

function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const u = new URL(url);
      const client = u.protocol === 'https:' ? https : http;
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(options.headers || {})
      };
      const req = client.request(u, {
        method: options.method || 'GET',
        headers,
        timeout: 10000
      }, res => {
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
    } catch (err) {
      reject(err);
    }
  });
}

// ─── Step 1: Check Database History (PhonyBest Transactions) ───

async function checkLocalDatabaseHistory(phone) {
  if (!DATABASE_URL) return null;
  try {
    const { Client } = require('pg');
    const client = new Client({ connectionString: DATABASE_URL, connectionTimeoutMillis: 3000 });
    await client.connect();
    const res = await client.query(
      `SELECT offer, amount, status, type, created_at 
       FROM transactions 
       WHERE phone_number = $1 AND offer IS NOT NULL 
       ORDER BY created_at DESC LIMIT 3`,
      [phone]
    );
    await client.end();
    if (res.rows.length > 0) {
      return res.rows;
    }
  } catch (e) {
    // Database connection failed or pg not installed
  }
  return null;
}

// ─── Step 2: Check Live via ModemGrid PRO Dealer SIM ───

async function queryModemGridDealerSim(phoneInfo) {
  if (!MODEM_GRID_API_URL || !MODEM_GRID_API_KEY) {
    return { checked: false, reason: 'ModemGrid credentials not set in backend/.env' };
  }

  try {
    const url = MODEM_GRID_API_URL.replace(/\/$/, '') + '/modems';
    const res = await httpRequest(url, {
      headers: { 'X-API-Key': MODEM_GRID_API_KEY }
    });

    if (res.status !== 200 || !res.data) {
      return { checked: false, reason: `ModemGrid returned ${res.status}` };
    }

    const modems = Array.isArray(res.data) ? res.data : (res.data?.modems || []);
    const matchingModems = modems.filter(m => {
      const mop = (m.operator || m.name || '').toLowerCase();
      return mop.includes(phoneInfo.op);
    });

    if (matchingModems.length === 0) {
      return { checked: false, reason: `لا يوجد مودم ${phoneInfo.opName} متصل حالياً` };
    }

    const onlineModem = matchingModems.find(m =>
      m.online === true || m.connected === true ||
      ['online', 'idle', 'ready', 'active', 'connected'].includes(String(m.status || '').toLowerCase())
    ) || matchingModems[0];

    const modemId = onlineModem.dongle_id || onlineModem.modem_id || onlineModem.id;
    console.log(`   📡 مودم ${phoneInfo.opName} المستخدم للاستعلام: [${modemId}]`);

    // In Mobilis dealer SIM: query offers using Arsselli code
    // Depending on dealer setup: *630*<number>*04# or *630#
    let ussdQuery = '';
    if (phoneInfo.op === 'mobilis') {
      ussdQuery = `*630*${phoneInfo.number}*04#`;
    } else if (phoneInfo.op === 'djezzy') {
      ussdQuery = `*707#`;
    } else if (phoneInfo.op === 'ooredoo') {
      ussdQuery = `*707#`;
    }

    console.log(`   ⏳ جاري إرسال استعلام الشريحة عبر USSD (${ussdQuery})...`);
    const ussdUrl = `${MODEM_GRID_API_URL.replace(/\/$/, '')}/modems/${modemId}/ussd?ussd_code=${encodeURIComponent(ussdQuery)}`;
    const ussdRes = await httpRequest(ussdUrl, {
      method: 'POST',
      headers: { 'X-API-Key': MODEM_GRID_API_KEY }
    });

    if (ussdRes.status === 200 && ussdRes.data) {
      const reply = ussdRes.data.response || ussdRes.data.message || ussdRes.data.result || JSON.stringify(ussdRes.data);
      return { checked: true, modemId, ussdReply: reply };
    } else {
      return { checked: false, reason: `USSD error (${ussdRes.status}): ${ussdRes.raw?.slice(0, 150)}` };
    }
  } catch (err) {
    return { checked: false, reason: err.message };
  }
}

// ─── Step 3: Determine SIM Profile from USSD / History ───

function detectSimTypeFromText(text, operator) {
  if (!text) return null;
  const lower = text.toLowerCase();

  if (operator === 'mobilis') {
    if (lower.includes('sama') || lower.includes('mix') || lower.includes('talk')) {
      return 'sama';
    }
    if (lower.includes('pixx') || lower.includes('pix')) {
      return 'pixx';
    }
    if (lower.includes('non eligible') || lower.includes('non éligible') || lower.includes('invalide') || lower.includes('non autoris')) {
      return 'normal';
    }
  } else if (operator === 'djezzy') {
    if (lower.includes('hayla') || lower.includes('bezzef') || lower.includes('special')) {
      return 'hayla';
    }
    if (lower.includes('non eligible') || lower.includes('non éligible')) {
      return 'normal';
    }
  } else if (operator === 'ooredoo') {
    if (lower.includes('yooz') || lower.includes('sahla') || lower.includes('dima')) {
      return 'yooz_sahla';
    }
  }

  return null;
}

// ─── Display Helper ───

function displayProfileOffers(operator, profileKey, phone) {
  const opProfiles = PROFILES[operator];
  if (!opProfiles) return;

  const profile = opProfiles[profileKey];
  if (!profile) return;

  console.log(`\n📌 ${'─'.repeat(55)}`);
  console.log(`🏷️  نوع الشريحة المحدد : ${profile.title}`);
  console.log(`📝 الوصف             : ${profile.description}`);
  console.log(`${'─'.repeat(55)}\n`);

  if (!profile.offers || profile.offers.length === 0) {
    console.log(`   ⚠️  هذه الشريحة لا تدعم تعبئة العروض المباشرة.`);
    console.log(`   💡 الزبون يقبل فقط تعبئة الرصيد العادي (Flexy Solde Normal).\n`);
    return;
  }

  console.log(`   العروض المتاحة فقط لهذا النوع من الشريحة (${profile.offers.length} عرض):\n`);

  // Group by category if Mobilis Sama
  if (operator === 'mobilis' && profileKey === 'sama') {
    const cats = ['Sama Mix', 'Sama Talk', 'Sama Net'];
    cats.forEach(cat => {
      const items = profile.offers.filter(o => o.category === cat);
      if (items.length > 0) {
        console.log(`   📂 [${cat}]:`);
        items.forEach(o => {
          console.log(`      ⚡ ${o.name.padEnd(16)} 💰 ${String(o.amount).padStart(5)} د.ج  (المدة: ${o.duration})`);
        });
        console.log('');
      }
    });
  } else {
    profile.offers.forEach((o, idx) => {
      console.log(`   [${idx + 1}] 🏷️  ${o.name.padEnd(30)} 💰 ${String(o.amount).padStart(5)} د.ج  (المدة: ${o.duration})`);
    });
    console.log('');
  }
}

// ─── Main Program ───

async function run(inputPhone, presetType = '') {
  console.log('═'.repeat(65));
  console.log('       🔍 أداة التحقق من نوع الشريحة وعروضها (SIM Profile Checker)');
  console.log('═'.repeat(65));

  const info = parseNumber(inputPhone);
  if (!info.isValid) {
    console.log(`\n❌ ${info.error}\n`);
    return;
  }

  console.log(`\n📋 الرقم المراد شحنه:`);
  console.log(`   • رقم الزبون   : ${info.number}`);
  console.log(`   • المتعامل     : ${info.opName}`);
  console.log(`   • كود الموزع   : ${info.dealerUssd}`);

  let detectedProfile = presetType ? detectSimTypeFromText(presetType, info.op) : null;
  let detectionSource = presetType ? `محدد مسبقاً (${presetType})` : '';

  // 1. Try checking database transactions history
  console.log(`\n[1/3] فحص سجل العمليات السابقة لهذا الرقم في المنصة...`);
  const history = await checkLocalDatabaseHistory(info.number);
  if (history && history.length > 0) {
    const last = history[0];
    console.log(`   ✅ تم العثور على سجل سابق لهذا الرقم:`);
    console.log(`      آخر عملية: [${last.offer || last.type}] بمبلغ ${last.amount} د.ج (${last.status})`);
    const historyProfile = detectSimTypeFromText(last.offer, info.op);
    if (historyProfile) {
      detectedProfile = historyProfile;
      detectionSource = 'سجل المنصة السابق';
    }
  } else {
    console.log(`   ℹ️  لا يوجد سجل تعبئة عروض سابق لهذا الرقم.`);
  }

  // 2. Try Live USSD query via ModemGrid dealer SIM
  console.log(`\n[2/3] فحص نوع الشريحة والعروض الحية عبر المودم (ModemGrid)...`);
  const mgCheck = await queryModemGridDealerSim(info);

  if (mgCheck.checked) {
    console.log(`   📄 رد الشريحة من شبكة ${info.opName}:\n      "${mgCheck.ussdReply}"`);
    const simProfile = detectSimTypeFromText(mgCheck.ussdReply, info.op);
    if (simProfile) {
      detectedProfile = simProfile;
      detectionSource = `شبكة ${info.opName} الحية عبر المودم`;
    }
  } else {
    console.log(`   ⚠️  تعذر الاستعلام الحي عبر المودم: ${mgCheck.reason}`);
  }

  // 3. Display Result based on detected profile
  console.log(`\n[3/3] نتيجة تحديد نوع الشريحة:`);

  if (detectedProfile) {
    console.log(`   🎯 تم تأكيد نوع الشريحة بنجاح عبر: [${detectionSource}]`);
    displayProfileOffers(info.op, detectedProfile, info.number);
  } else {
    // If not auto-detected, show options to select between Mobilis Sama or PixX
    if (info.op === 'mobilis') {
      console.log(`   ⚠️  لم يتم اكتشاف نوع الشريحة تلقائياً (الرقم جديد أو المودم غير متاح).`);
      console.log(`   💡 شرائح موبيليس تنقسم إلى نوعين رئيسيين:`);
      console.log(`      [1] شريحة سَمَا (Sama) -> تدعم Sama Mix/Talk/Net`);
      console.log(`      [2] شريحة بيكس (PixX) -> تدعم عروض PixX`);
      console.log(`      [3] شريحة عادية / فاتورة -> رصيد فقط بدون عروض`);

      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      rl.question('\n👉 اختر نوع الشريحة لعرض عروضها فقط (1 أو 2 أو 3): ', choice => {
        rl.close();
        const ch = choice.trim();
        if (ch === '1' || ch.toLowerCase() === 'sama') {
          displayProfileOffers('mobilis', 'sama', info.number);
        } else if (ch === '2' || ch.toLowerCase() === 'pixx' || ch.toLowerCase() === 'pix') {
          displayProfileOffers('mobilis', 'pixx', info.number);
        } else {
          displayProfileOffers('mobilis', 'normal', info.number);
        }
        console.log('═'.repeat(65) + '\n');
      });
      return;
    } else if (info.op === 'djezzy') {
      displayProfileOffers('djezzy', 'hayla', info.number);
    } else if (info.op === 'ooredoo') {
      displayProfileOffers('ooredoo', 'yooz_sahla', info.number);
    }
  }

  console.log('═'.repeat(65));
  console.log('🏁 اكتمل الفحص.');
  console.log('═'.repeat(65) + '\n');
}

// ─── CLI Entrypoint ───
let phoneArg = '';
let typeArg = '';

for (const a of process.argv.slice(2)) {
  if (a.startsWith('--type=')) {
    typeArg = a.split('=')[1].toLowerCase().trim();
  } else if (!a.startsWith('--') && !phoneArg) {
    phoneArg = a;
  }
}

async function start() {
  if (phoneArg) {
    await run(phoneArg, typeArg);
  } else {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('👉 أدخل رقم هاتف الزبون للتأكد من نوع شريحته: ', async ans => {
      rl.close();
      await run(ans.trim(), typeArg);
    });
  }
}

start();
