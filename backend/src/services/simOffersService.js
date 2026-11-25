/**
 * SIM Offers & Profile Service
 * =============================================================
 * Combines live CreditShift offer fetching with operator catalogs
 * and transaction history to determine the customer's SIM profile
 * (e.g., Mobilis Sama vs PixX, Djezzy Hayla, Ooredoo Yooz) and
 * return available recharge offers.
 */

const creditShiftService = require('./creditShiftService');
const { query } = require('../config/database');

// ─── Known Operator Bundles Catalog ───
const OPERATOR_CATALOGS = {
  mobilis: {
    sama: {
      profile: 'sama',
      title: 'موبيليس - شريحة سَمَا (Mobilis Sama)',
      description: 'شريحة تدعم عروض Sama Mix و Sama Talk و Sama Net',
      badgeColor: '#00b140',
      categories: ['Sama Mix', 'Sama Talk', 'Sama Net'],
      offers: [
        { category: 'Sama Mix', name: 'Sama Mix 50',   code: 'Sama Mix 50',   amount: 50,   duration: '24 ساعة' },
        { category: 'Sama Mix', name: 'Sama Mix 100',  code: 'Sama Mix 100',  amount: 100,  duration: '24 ساعة' },
        { category: 'Sama Mix', name: 'Sama Mix 500',  code: 'Sama Mix 500',  amount: 500,  duration: '15 يوم' },
        { category: 'Sama Mix', name: 'Sama Mix 1000', code: 'Sama Mix 1000', amount: 1000, duration: 'شهر' },
        { category: 'Sama Mix', name: 'Sama Mix 1500', code: 'Sama Mix 1500', amount: 1500, duration: 'شهر' },
        { category: 'Sama Mix', name: 'Sama Mix 2000', code: 'Sama Mix 2000', amount: 2000, duration: 'شهر' },
        { category: 'Sama Talk', name: 'Sama Talk 500',  code: 'Sama Talk 500',  amount: 500,  duration: '15 يوم' },
        { category: 'Sama Talk', name: 'Sama Talk 1000', code: 'Sama Talk 1000', amount: 1000, duration: 'شهر' },
        { category: 'Sama Talk', name: 'Sama Talk 1500', code: 'Sama Talk 1500', amount: 1500, duration: 'شهر' },
        { category: 'Sama Talk', name: 'Sama Talk 2000', code: 'Sama Talk 2000', amount: 2000, duration: 'شهر' },
        { category: 'Sama Net', name: 'Sama Net 500',  code: 'Sama Net 500',  amount: 500,  duration: '15 يوم' },
        { category: 'Sama Net', name: 'Sama Net 1000', code: 'Sama Net 1000', amount: 1000, duration: 'شهر' },
        { category: 'Sama Net', name: 'Sama Net 1500', code: 'Sama Net 1500', amount: 1500, duration: 'شهر' },
        { category: 'Sama Net', name: 'Sama Net 2000', code: 'Sama Net 2000', amount: 2000, duration: 'شهر' },
      ]
    },
    pixx: {
      profile: 'pixx',
      title: 'موبيليس - شريحة بيكس (Mobilis PixX)',
      description: 'شريحة تدعم عروض PixX للمكالمات والإنترنت',
      badgeColor: '#00843d',
      categories: ['PixX'],
      offers: [
        { category: 'PixX', name: 'PixX 50',   code: 'PixX 50',   amount: 50,   duration: '24 ساعة' },
        { category: 'PixX', name: 'PixX 100',  code: 'PixX 100',  amount: 100,  duration: '24 ساعة' },
        { category: 'PixX', name: 'PixX 500',  code: 'PixX 500',  amount: 500,  duration: '15 يوم' },
        { category: 'PixX', name: 'PixX 1000', code: 'PixX 1000', amount: 1000, duration: 'شهر' },
        { category: 'PixX', name: 'PixX 2000', code: 'PixX 2000', amount: 2000, duration: 'شهر' },
      ]
    },
    normal: {
      profile: 'normal',
      title: 'موبيليس - رصيد عادي / فاتورة',
      description: 'هذا الخط يقبل شحن الرصيد العادي فقط (Flexy Solde Normal) ولا يدعم تفعيل العروض مباشرة.',
      badgeColor: '#6c757d',
      categories: ['Solde Normal'],
      offers: []
    }
  },
  djezzy: {
    hayla: {
      profile: 'hayla',
      title: 'جيزي - هايلة بزاف (Djezzy Hayla)',
      description: 'عروض جيزي هايلة بزاف للمكالمات والإنترنت',
      badgeColor: '#e4002b',
      categories: ['Hayla Bezzef'],
      offers: [
        { category: 'Hayla Bezzef', name: 'HAYLA BEZZEF Special 500 Da',  code: '500_DA|HAYLA BEZZEF Special 500 Da',  amount: 500,  duration: '15 يوم' },
        { category: 'Hayla Bezzef', name: 'HAYLA BEZZEF Classic 1000 Da', code: '1000_DA|HAYLA BEZZEF Classic 1000 Da', amount: 1000, duration: 'شهر' },
        { category: 'Hayla Bezzef', name: 'HAYLA BEZZEF Classic 1500 Da', code: '1500_DA|HAYLA BEZZEF Classic 1500 Da', amount: 1500, duration: 'شهر' },
        { category: 'Hayla Bezzef', name: 'HAYLA BEZZEF Classic 2000 Da', code: '2000_DA|HAYLA BEZZEF Classic 2000 Da', amount: 2000, duration: 'شهر' },
        { category: 'Hayla Bezzef', name: 'HAYLA BEZZEF Extra 3000 Da',   code: '3000_DA|HAYLA BEZZEF Extra 3000 Da',   amount: 3000, duration: 'شهر' },
      ]
    },
    normal: {
      profile: 'normal',
      title: 'جيزي - رصيد عادي / فاتورة',
      description: 'يقبل فقط شحن الرصيد العادي.',
      badgeColor: '#6c757d',
      categories: ['Solde Normal'],
      offers: []
    }
  },
  ooredoo: {
    yooz_sahla: {
      profile: 'yooz_sahla',
      title: 'أوريدو - عروض يوز وساهلة (Ooredoo Yooz / Sahla)',
      description: 'عروض أوريدو للإنترنت والمكالمات',
      badgeColor: '#ed1c24',
      categories: ['Yooz', 'Sahla'],
      offers: [
        { category: 'Yooz',  name: 'YOOZ 500 Da',      code: '500_DA|YOOZ 500 Da',      amount: 500,  duration: '15 يوم' },
        { category: 'Yooz',  name: 'YOOZ 1000 Da',     code: '1000_DA|YOOZ 1000 Da',     amount: 1000, duration: 'شهر' },
        { category: 'Yooz',  name: 'YOOZ 1500 Da',     code: '1500_DA|YOOZ 1500 Da',     amount: 1500, duration: 'شهر' },
        { category: 'Sahla', name: 'SAHLA Box 2000 Da', code: '2000_DA|SAHLA Box 2000 Da', amount: 2000, duration: 'شهر' },
      ]
    },
    normal: {
      profile: 'normal',
      title: 'أوريدو - رصيد عادي',
      description: 'يقبل فقط شحن الرصيد العادي.',
      badgeColor: '#6c757d',
      categories: ['Solde Normal'],
      offers: []
    }
  }
};

/**
 * Identify operator from phone number prefix
 */
function parsePhoneNumber(phone) {
  const cleaned = String(phone || '').replace(/\D/g, '');
  let n = cleaned.startsWith('213') ? '0' + cleaned.slice(3) : cleaned;

  if (n.length !== 10) {
    return { isValid: false, error: 'رقم الهاتف يجب أن يتكون من 10 أرقام (مثال: 0699326406)' };
  }

  const prefix = n.slice(0, 2);
  let operator = '';
  let operatorName = '';

  if (prefix === '06') {
    operator = 'mobilis';
    operatorName = 'موبيليس (Mobilis)';
  } else if (prefix === '07') {
    operator = 'djezzy';
    operatorName = 'جيزي (Djezzy)';
  } else if (prefix === '05') {
    operator = 'ooredoo';
    operatorName = 'أوريدو (Ooredoo)';
  } else {
    return { isValid: false, error: `المتعامل غير معروف للبادئة ${prefix}` };
  }

  return { isValid: true, number: n, operator, operatorName };
}

/**
 * Infer SIM profile key from offer strings
 */
function inferProfileFromOffers(offersList, operator) {
  if (!offersList || offersList.length === 0) return 'normal';

  const combined = offersList.map(o => (typeof o === 'string' ? o : o.offerName || '')).join(' ').toLowerCase();

  if (operator === 'mobilis') {
    if (combined.includes('sama') || combined.includes('mix') || combined.includes('talk') || combined.includes('net')) {
      return 'sama';
    }
    if (combined.includes('pixx') || combined.includes('pix')) {
      return 'pixx';
    }
    return 'normal';
  } else if (operator === 'djezzy') {
    if (combined.includes('hayla') || combined.includes('bezzef') || combined.includes('special')) {
      return 'hayla';
    }
    return 'normal';
  } else if (operator === 'ooredoo') {
    if (combined.includes('yooz') || combined.includes('sahla') || combined.includes('dima')) {
      return 'yooz_sahla';
    }
    return 'normal';
  }

  return 'normal';
}

/**
 * Format raw CreditShift offer item into standard object
 */
function formatOfferItem(rawOffer, operator) {
  const rawName = rawOffer.offerName || rawOffer.name || '';
  const cleanName = rawName.replace(/^\d+_DA\|/, '').trim();
  const amount = parseInt(rawOffer.offerAmount || rawOffer.amount || 0, 10);

  // Determine category
  let category = 'عروض';
  let duration = 'شهر';

  if (cleanName.toLowerCase().includes('mix')) category = 'Sama Mix';
  else if (cleanName.toLowerCase().includes('talk')) category = 'Sama Talk';
  else if (cleanName.toLowerCase().includes('net')) category = 'Sama Net';
  else if (cleanName.toLowerCase().includes('pixx')) category = 'PixX';
  else if (cleanName.toLowerCase().includes('hayla')) category = 'Hayla Bezzef';
  else if (cleanName.toLowerCase().includes('yooz')) category = 'Yooz';
  else if (cleanName.toLowerCase().includes('sahla')) category = 'Sahla';

  if (amount <= 100) duration = '24 ساعة';
  else if (amount <= 500) duration = '15 يوم';
  else duration = 'شهر';

  return {
    code: rawName,
    name: cleanName,
    rawName,
    amount,
    category,
    duration,
  };
}

/**
 * Query customer transaction history in PhonyBest database
 */
async function queryHistoryProfile(phone, operator) {
  try {
    const res = await query(
      `SELECT offer, amount, type FROM transactions 
       WHERE phone_number = $1 AND offer IS NOT NULL 
       ORDER BY created_at DESC LIMIT 3`,
      [phone]
    );

    if (res.rows && res.rows.length > 0) {
      for (const row of res.rows) {
        if (row.offer) {
          const prof = inferProfileFromOffers([row.offer], operator);
          if (prof && prof !== 'normal') {
            return { profile: prof, lastOffer: row.offer, amount: row.amount };
          }
        }
      }
    }
  } catch (e) {
    // DB query error
  }
  return null;
}

/**
 * Primary function to check SIM offers
 * @param {string} phone - Target phone number
 * @param {string} [forcedProfile] - Optional profile override
 */
async function checkSimOffers(phone, forcedProfile = null) {
  const parsed = parsePhoneNumber(phone);
  if (!parsed.isValid) {
    return {
      success: false,
      error: parsed.error,
    };
  }

  const { number, operator, operatorName } = parsed;
  const catalog = OPERATOR_CATALOGS[operator] || {};

  // If user forced a specific profile (e.g. user toggles between Sama and PixX)
  if (forcedProfile && catalog[forcedProfile]) {
    const selected = catalog[forcedProfile];
    return {
      success: true,
      operator,
      operatorName,
      phone: number,
      profile: selected.profile,
      profileTitle: selected.title,
      profileDescription: selected.description,
      badgeColor: selected.badgeColor,
      isEligibleForOffers: selected.offers.length > 0,
      categories: selected.categories,
      offers: selected.offers,
      source: 'forced_profile',
      availableProfiles: Object.keys(catalog).map(k => ({
        key: k,
        title: catalog[k].title,
      })),
    };
  }

  // Step 1: Try Live Query via CreditShift
  let creditShiftResult = null;
  let creditShiftError = null;

  try {
    creditShiftResult = await creditShiftService.getFlexyOffers(number);
  } catch (err) {
    creditShiftError = err.message;
    console.warn(`[SIM Offers] Live CreditShift query failed for ${number}:`, err.message);
  }

  // If CreditShift returned live data
  if (creditShiftResult && !creditShiftResult.error) {
    const rawOffers = creditShiftResult.offers || [];

    if (rawOffers.length > 0) {
      const detectedProfileKey = inferProfileFromOffers(rawOffers, operator);
      const profileInfo = catalog[detectedProfileKey] || {
        profile: detectedProfileKey,
        title: `${operatorName} - ${detectedProfileKey.toUpperCase()}`,
        description: 'عروض الشريحة المتاحة للرقم',
        badgeColor: '#00b140',
        categories: [],
      };

      const formattedOffers = rawOffers.map(o => formatOfferItem(o, operator));
      const categories = [...new Set(formattedOffers.map(o => o.category))];

      return {
        success: true,
        operator,
        operatorName,
        phone: number,
        profile: detectedProfileKey,
        profileTitle: profileInfo.title,
        profileDescription: profileInfo.description,
        badgeColor: profileInfo.badgeColor,
        isEligibleForOffers: true,
        categories,
        offers: formattedOffers,
        source: 'creditshift',
        availableProfiles: Object.keys(catalog).map(k => ({
          key: k,
          title: catalog[k].title,
        })),
      };
    } else {
      // Returned empty array => SIM is not eligible for direct offer recharge (solde only)
      const normalProfile = catalog['normal'] || {
        profile: 'normal',
        title: `${operatorName} - رصيد عادي فقط`,
        description: 'هذا الخط لا يدعم تفعيل العروض مباشرة، يقبل فقط شحن الرصيد العادي.',
        badgeColor: '#6c757d',
        categories: [],
      };

      return {
        success: true,
        operator,
        operatorName,
        phone: number,
        profile: 'normal',
        profileTitle: normalProfile.title,
        profileDescription: normalProfile.description,
        badgeColor: normalProfile.badgeColor,
        isEligibleForOffers: false,
        categories: [],
        offers: [],
        source: 'creditshift',
        message: 'هذا الخط لا يدعم تفعيل العروض مباشرة، يقبل فقط شحن الرصيد العادي (Flexy Solde).',
        availableProfiles: Object.keys(catalog).map(k => ({
          key: k,
          title: catalog[k].title,
        })),
      };
    }
  }

  // Step 2: Fallback to Transaction History
  const historyInfo = await queryHistoryProfile(number, operator);
  if (historyInfo && catalog[historyInfo.profile]) {
    const matched = catalog[historyInfo.profile];
    return {
      success: true,
      operator,
      operatorName,
      phone: number,
      profile: matched.profile,
      profileTitle: matched.title,
      profileDescription: matched.description,
      badgeColor: matched.badgeColor,
      isEligibleForOffers: matched.offers.length > 0,
      categories: matched.categories,
      offers: matched.offers,
      source: 'history',
      notice: `تم التعرف على الشريحة من آخر عملية سابقة بالمنصة (${historyInfo.lastOffer})`,
      availableProfiles: Object.keys(catalog).map(k => ({
        key: k,
        title: catalog[k].title,
      })),
    };
  }

  // Step 3: Default Catalog Fallback (e.g. if external network unreachable or first-time number)
  const defaultProfileKey = operator === 'mobilis' ? 'sama' : (operator === 'djezzy' ? 'hayla' : 'yooz_sahla');
  const defaultProfile = catalog[defaultProfileKey] || {
    profile: defaultProfileKey,
    title: operatorName,
    description: 'العروض الشائعة لهذا المشغل',
    badgeColor: '#00b140',
    categories: [],
    offers: [],
  };

  return {
    success: true,
    operator,
    operatorName,
    phone: number,
    profile: defaultProfileKey,
    profileTitle: defaultProfile.title,
    profileDescription: defaultProfile.description,
    badgeColor: defaultProfile.badgeColor,
    isEligibleForOffers: true,
    categories: defaultProfile.categories,
    offers: defaultProfile.offers,
    source: 'catalog',
    warning: creditShiftError ? `تعذر الاستعلام المباشر (${creditShiftError}). يتم عرض العروض القياسية للشريحة.` : null,
    availableProfiles: Object.keys(catalog).map(k => ({
      key: k,
      title: catalog[k].title,
    })),
  };
}

module.exports = {
  checkSimOffers,
  parsePhoneNumber,
  OPERATOR_CATALOGS,
};
