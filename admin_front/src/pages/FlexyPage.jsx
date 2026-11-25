import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import {
  FiSend, FiPhone, FiDollarSign, FiSearch, FiCheckCircle,
  FiAlertCircle, FiRefreshCw, FiTag, FiZap, FiInfo, FiLayers, FiCheck
} from 'react-icons/fi';
import API from '../api/axios';

const operators = [
  { id: 'mobilis', name: 'موبيليس', color: '#00b140', prefix: '06' },
  { id: 'djezzy', name: 'جيزي', color: '#e4002b', prefix: '07' },
  { id: 'ooredoo', name: 'أوريدو', color: '#ed1c24', prefix: '05' },
];

const amounts = [100, 200, 500, 1000, 1500, 2000];

export default function FlexyPage() {
  const { t } = useLanguage();
  const [number, setNumber] = useState('');
  const [operator, setOperator] = useState('mobilis');
  const [amount, setAmount] = useState(1000);
  const [offer, setOffer] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [clients, setClients] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [modems, setModems] = useState([]);
  const [selectedModem, setSelectedModem] = useState('');
  const [history, setHistory] = useState([]);

  // SIM Offers State
  const [simInfo, setSimInfo] = useState(null);
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [forcedProfile, setForcedProfile] = useState('');
  const lastCheckedPhoneRef = useRef('');

  const fetchHistory = () => {
    API.get('/transactions?type=flexy&limit=10')
      .then(res => setHistory(res.data.transactions || []))
      .catch(err => console.error(err));
  };

  const filteredClients = clients.filter(c => {
    if (!c.phone) return false;
    const term = (number || '').trim().toLowerCase();
    if (!term) return true;

    const matchesRef = c.ref_code && c.ref_code.toLowerCase().includes(term);
    const matchesName = c.full_name && c.full_name.toLowerCase().includes(term);
    const matchesUsername = c.username && c.username.toLowerCase().includes(term);

    if (matchesRef || matchesName || matchesUsername) {
      return true;
    }

    const cleanDigits = term.replace(/\D/g, '');
    if (cleanDigits) {
      return c.phone.replace(/\D/g, '').includes(cleanDigits);
    }

    return false;
  });

  useEffect(() => {
    API.get('/users', { params: { limit: 1000 } })
      .then(r => setClients(r.data.users || []))
      .catch(e => console.error(e));

    API.get('/flexy/modems')
      .then(r => setModems(r.data.modems || []))
      .catch(e => console.error(e));

    fetchHistory();
  }, []);

  // Check SIM Offers function
  const checkSimOffers = async (phoneToCheck, profileOverride = null) => {
    const cleanDigits = String(phoneToCheck || '').replace(/\D/g, '');
    let finalPhone = cleanDigits.startsWith('213') ? '0' + cleanDigits.slice(3) : cleanDigits;

    if (finalPhone.length !== 10) return;

    setSimLoading(true);
    setSimError(null);
    lastCheckedPhoneRef.current = finalPhone;

    try {
      const params = { phone: finalPhone };
      if (profileOverride) {
        params.profile = profileOverride;
      }

      const { data } = await API.get('/flexy/sim-offers', { params });
      if (data.success) {
        setSimInfo(data);
        if (data.operator) {
          setOperator(data.operator);
        }
        setSelectedCategory('ALL');
      } else {
        setSimError(data.error || 'تعذر جلب عروض الشريحة');
        setSimInfo(null);
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'خطأ في الاتصال بخدمة العروض';
      setSimError(msg);
      setSimInfo(null);
    } finally {
      setSimLoading(false);
    }
  };

  // Trigger auto-check when 10 digits are typed
  const handlePhoneChange = (val) => {
    setNumber(val);
    setShowDropdown(true);

    const cleanDigits = val.replace(/\D/g, '');
    let resolvedOp = operator;

    if (cleanDigits.startsWith('05')) resolvedOp = 'ooredoo';
    else if (cleanDigits.startsWith('06')) resolvedOp = 'mobilis';
    else if (cleanDigits.startsWith('07')) resolvedOp = 'djezzy';

    if (resolvedOp !== operator) {
      setOperator(resolvedOp);
      setOffer('');
      setSelectedModem('');
      setSimInfo(null);
    }

    if (cleanDigits.length === 10 && cleanDigits !== lastCheckedPhoneRef.current) {
      checkSimOffers(cleanDigits, forcedProfile || null);
    }
  };

  // Select client from autocomplete
  const handleSelectClient = (c) => {
    const cleanPhone = c.phone.replace(/\D/g, '').substring(0, 10);
    setNumber(cleanPhone);
    setShowDropdown(false);

    let resolvedOp = operator;
    if (cleanPhone.startsWith('05')) resolvedOp = 'ooredoo';
    else if (cleanPhone.startsWith('06')) resolvedOp = 'mobilis';
    else if (cleanPhone.startsWith('07')) resolvedOp = 'djezzy';

    setOperator(resolvedOp);
    setOffer('');
    setSelectedModem('');
    checkSimOffers(cleanPhone, forcedProfile || null);
  };

  // Handle offer selection
  const handleSelectOffer = (offerItem) => {
    if (offer === offerItem.code) {
      // Toggle off
      setOffer('');
    } else {
      setOffer(offerItem.code);
      if (offerItem.amount) {
        setAmount(offerItem.amount);
      }
    }
  };

  // Handle Send Flexy
  const handleSend = async () => {
    let cleanPhone = number.replace(/\D/g, '');
    let resolvedOp = operator;

    if (cleanPhone.length !== 10) {
      const term = number.trim().toLowerCase();
      const matched = clients.find(c =>
        (c.ref_code && c.ref_code.toLowerCase() === term) ||
        (c.username && c.username.toLowerCase() === term) ||
        (c.full_name && c.full_name.toLowerCase() === term)
      );
      if (matched && matched.phone) {
        cleanPhone = matched.phone.replace(/\D/g, '').substring(0, 10);
        if (cleanPhone.startsWith('05')) resolvedOp = 'ooredoo';
        else if (cleanPhone.startsWith('06')) resolvedOp = 'mobilis';
        else if (cleanPhone.startsWith('07')) resolvedOp = 'djezzy';
      }
    }

    if (!cleanPhone || cleanPhone.length !== 10) {
      setResult({ success: false, msg: 'الرجاء إدخال رقم هاتف صحيح مكون من 10 أرقام أو اختيار عميل بالرمز المرجعي' });
      return;
    }
    if (!amount) return;

    setLoading(true);
    setResult(null);

    try {
      const payload = { number: cleanPhone, operator: resolvedOp, amount, offer };
      if (selectedModem) {
        payload.dongle_id = selectedModem;
      }
      const { data } = await API.post('/flexy/send', payload);
      if (data.success) {
        setResult({ success: true, msg: `تم إرسال فليكسي بنجاح! معاملة #${data.transaction?.id || ''}` });
        fetchHistory();
      } else {
        const errorDetail = data.error || data.transaction?.error_message || 'فشلت العملية';
        setResult({ success: false, msg: `فشل: ${errorDetail}` });
      }
    } catch (err) {
      const errorDetail = err.response?.data?.error || err.response?.data?.message || err.message || 'فشلت العملية';
      setResult({ success: false, msg: `فشل: ${errorDetail}` });
    }
    setLoading(false);
  };

  // Filter offers by selected category
  const displayedOffers = simInfo?.offers ? (
    selectedCategory === 'ALL'
      ? simInfo.offers
      : simInfo.offers.filter(o => o.category === selectedCategory)
  ) : [];

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('تعبئة فليكسي')}</h1>
          <p className="page-subtitle">{t('إرسال تعبئة فليكسي وتفعيل عروض الشرائح (سما، بيكس، هايلة، يوز)')}</p>
        </div>
      </div>

      <div>
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-title">{t('إرسال تعبئة')}</span>
            {number.replace(/\D/g, '').length === 10 && (
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => checkSimOffers(number, forcedProfile || null)}
                disabled={simLoading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
                title="إعادة فحص عروض هذه الشريحة"
              >
                <FiRefreshCw className={simLoading ? 'spinner' : ''} size={13} />
                <span>{simLoading ? t('جاري الفحص...') : t('فحص عروض الشريحة')}</span>
              </button>
            )}
          </div>

          {/* Operator Buttons */}
          <div className="operator-btns" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {operators.map(op => (
              <button
                key={op.id}
                className={`btn ${operator === op.id ? 'btn-primary' : 'btn-secondary'}`}
                style={operator === op.id ? { background: op.color } : {}}
                onClick={() => {
                  setOperator(op.id);
                  setOffer('');
                  setForcedProfile('');
                  if (number.replace(/\D/g, '').length === 10) {
                    checkSimOffers(number);
                  } else {
                    setSimInfo(null);
                  }
                }}
              >
                {t(op.name)}
              </button>
            ))}
          </div>

          {/* Phone Input with Autocomplete */}
          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label">
              <FiPhone style={{ marginLeft: 4 }} />
              {t('رقم الهاتف، كود العميل المرجعي (Ref) أو الاسم')}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-input phone-input-large"
                placeholder="0699000000 / 0770... / mh01"
                value={number}
                autoComplete="off"
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                style={{
                  fontSize: '2.4rem',
                  letterSpacing: '3px',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  height: '70px',
                  borderRadius: '12px'
                }}
                onChange={e => handlePhoneChange(e.target.value)}
              />
              {simLoading && (
                <div style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)' }}>
                  <span className="spinner" style={{ width: 22, height: 22 }} />
                </div>
              )}
            </div>

            {showDropdown && filteredClients.length > 0 && (
              <div
                style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: '12px', marginTop: '8px', maxHeight: '250px',
                  overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
                }}
              >
                {filteredClients.map(c => (
                  <div
                    key={c.id}
                    style={{
                      padding: '16px', borderBottom: '1px solid var(--border)',
                      cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => handleSelectClient(c)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1.1rem' }}>
                        {c.full_name || c.username}
                      </span>
                      {c.ref_code && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            fontFamily: 'monospace',
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: 'rgba(99, 102, 241, 0.15)',
                            color: '#6366f1',
                            border: '1px solid rgba(99, 102, 241, 0.3)'
                          }}
                          title={t('كود العميل المرجعي')}
                        >
                          {c.ref_code}
                        </span>
                      )}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '1.2rem', letterSpacing: '2px', fontFamily: 'monospace' }}>
                      {c.phone}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SIM Profile Badge & Intelligence Bar */}
          {simInfo && (
            <div
              style={{
                marginBottom: 20,
                padding: '14px 18px',
                borderRadius: '12px',
                border: `1px solid ${simInfo.badgeColor ? simInfo.badgeColor + '55' : 'var(--border)'}`,
                background: 'var(--bg-hover)',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 12, height: 12, borderRadius: '50%',
                      background: simInfo.badgeColor || '#00b140',
                      boxShadow: `0 0 10px ${simInfo.badgeColor || '#00b140'}`
                    }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                      {simInfo.profileTitle}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {simInfo.profileDescription}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {simInfo.source && (
                    <span
                      style={{
                        fontSize: 11,
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: simInfo.source === 'creditshift' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                        color: simInfo.source === 'creditshift' ? '#10b981' : '#6366f1',
                        border: '1px solid currentColor',
                        fontWeight: 600
                      }}
                    >
                      {simInfo.source === 'creditshift' ? '✓ فحص مباشر (CreditShift)' : (simInfo.source === 'history' ? 'سجل العمليات' : 'عروض قياسية')}
                    </span>
                  )}

                  {/* Profile switcher for Mobilis Sama vs PixX */}
                  {simInfo.availableProfiles && simInfo.availableProfiles.length > 1 && (
                    <select
                      className="form-select"
                      style={{ padding: '4px 8px', fontSize: '0.85rem', height: 'auto', minWidth: '130px' }}
                      value={simInfo.profile}
                      onChange={e => {
                        const val = e.target.value;
                        setForcedProfile(val);
                        checkSimOffers(number, val);
                      }}
                    >
                      {simInfo.availableProfiles.map(p => (
                        <option key={p.key} value={p.key}>{p.title}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {simInfo.notice && (
                <div style={{ marginTop: 8, fontSize: '0.85rem', color: '#6366f1' }}>
                  ℹ️ {simInfo.notice}
                </div>
              )}
            </div>
          )}

          {/* Available Offers Grid (Cards) */}
          {simInfo && simInfo.offers && simInfo.offers.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FiZap color="#f59e0b" />
                  <span>{t('العروض المتاحة لهذه الشريحة')}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>({displayedOffers.length} {t('عرض')})</span>
                </label>

                {offer && (
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => setOffer('')}
                    style={{ fontSize: '0.8rem', padding: '2px 8px' }}
                  >
                    {t('إلغاء اختيار العرض (شحن رصيد عادي)')}
                  </button>
                )}
              </div>

              {/* Category Filter Tabs */}
              {simInfo.categories && simInfo.categories.length > 1 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${selectedCategory === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.8rem', padding: '4px 10px', borderRadius: '8px' }}
                    onClick={() => setSelectedCategory('ALL')}
                  >
                    {t('الكل')}
                  </button>
                  {simInfo.categories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.8rem', padding: '4px 10px', borderRadius: '8px' }}
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}

              {/* Offer Cards Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: 10,
                  maxHeight: '280px',
                  overflowY: 'auto',
                  padding: '4px'
                }}
              >
                {displayedOffers.map((item, idx) => {
                  const isSelected = offer === item.code;
                  return (
                    <div
                      key={idx}
                      onClick={() => handleSelectOffer(item)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        border: isSelected ? '2px solid #6366f1' : '1px solid var(--border)',
                        background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-card)',
                        boxShadow: isSelected ? '0 0 12px rgba(99, 102, 241, 0.25)' : 'none',
                        transition: 'all 0.18s ease-in-out',
                        position: 'relative'
                      }}
                      onMouseEnter={e => {
                        if (!isSelected) e.currentTarget.style.borderColor = 'var(--text-muted)';
                      }}
                      onMouseLeave={e => {
                        if (!isSelected) e.currentTarget.style.borderColor = 'var(--border)';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span
                          style={{
                            fontSize: 10,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: 'var(--bg-hover)',
                            color: 'var(--text-muted)',
                            fontWeight: 600
                          }}
                        >
                          {item.category}
                        </span>
                        {isSelected && (
                          <span
                            style={{
                              width: 18, height: 18, borderRadius: '50%',
                              background: '#6366f1', color: '#fff',
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                            }}
                          >
                            <FiCheck size={12} />
                          </span>
                        )}
                      </div>

                      <div style={{ fontWeight: 700, fontSize: '0.98rem', marginTop: 8, color: 'var(--text-primary)' }}>
                        {item.name}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981' }}>
                          {item.amount} <small style={{ fontSize: '0.75rem' }}>{t('د.ج')}</small>
                        </span>
                        {item.duration && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {item.duration}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notice if SIM is not eligible for bundle offers (Normal solde only) */}
          {simInfo && !simInfo.isEligibleForOffers && (
            <div
              style={{
                marginBottom: 20,
                padding: '12px 16px',
                borderRadius: '10px',
                background: 'rgba(234, 179, 8, 0.1)',
                border: '1px solid rgba(234, 179, 8, 0.3)',
                color: '#eab308',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: '0.9rem'
              }}
            >
              <FiInfo size={18} />
              <span>{simInfo.message || t('هذا الخط لا يدعم تفعيل العروض مباشرة، يقبل فقط شحن الرصيد العادي (Flexy Solde).')}</span>
            </div>
          )}

          {/* Amount Section */}
          <div className="form-group">
            <label className="form-label">
              <FiDollarSign style={{ marginLeft: 4 }} />
              {t('المبلغ')}
            </label>
            <div className="amount-btns" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              {amounts.map(a => (
                <button
                  key={a}
                  className={`btn btn-sm ${amount === a ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setAmount(a)}
                >
                  {a} {t('د.ج')}
                </button>
              ))}
            </div>
            <input
              className="form-input"
              type="number"
              min="1"
              value={amount}
              style={{
                fontSize: '2.5rem',
                letterSpacing: '4px',
                textAlign: 'center',
                height: '70px',
                borderRadius: '12px'
              }}
              onKeyDown={e => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
              onChange={e => setAmount(Number(e.target.value))}
              placeholder={t("مبلغ مخصص")}
            />
          </div>

          {/* Dropdown Offer & Modem Selector */}
          <div className="form-group" style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <label className="form-label">{t('العرض المحدد')}</label>
              <select
                className="form-select"
                value={offer}
                onChange={e => {
                  const val = e.target.value;
                  setOffer(val);
                  if (val && simInfo?.offers) {
                    const matched = simInfo.offers.find(o => o.code === val);
                    if (matched && matched.amount) setAmount(matched.amount);
                  }
                }}
              >
                <option value="">{t('بدون عرض (رصيد عادي Flexy Solde)')}</option>
                {simInfo?.offers?.map(o => (
                  <option key={o.code} value={o.code}>
                    {o.name} ({o.amount} د.ج)
                  </option>
                ))}
              </select>
            </div>

            {modems.some(m => m.operator.toLowerCase().includes(operator)) && (
              <div style={{ flex: 1 }}>
                <label className="form-label">{t('اختيار المودم (اختياري)')}</label>
                <select
                  className="form-select"
                  value={selectedModem}
                  onChange={e => setSelectedModem(e.target.value)}
                >
                  <option value="">{t('تحديد تلقائي (الأفضل رصيداً)')}</option>
                  {modems.filter(m => m.operator.toLowerCase().includes(operator)).map(m => (
                    <option key={m.dongle_id} value={m.dongle_id}>
                      {m.name} ({m.balance != null ? m.balance + ' د.ج' : 'غير معروف'})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Result Alert */}
          {result && (
            <div
              className="login-error"
              style={result.success ? {
                background: 'var(--success-bg)',
                borderColor: 'var(--success)',
                color: 'var(--success)'
              } : {}}
            >
              {result.msg}
            </div>
          )}

          {/* Submit Button */}
          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: 12, fontSize: 23, marginTop: 8 }}
            onClick={handleSend}
            disabled={loading}
          >
            {loading ? (
              <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
            ) : (
              <>
                <FiSend size={14} style={{ marginLeft: 4 }} />
                {offer ? `${t('تفعيل عرض')} ${offer.replace(/^\d+_DA\|/, '')}` : t('إرسال فليكسي')}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Flexy Transaction History */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-header">
          <span className="card-title">{t('سجل فليكسي')}</span>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>{t('الرقم')}</th>
                <th>{t('النوع / العرض')}</th>
                <th>{t('المبلغ')}</th>
                <th>{t('الحالة')}</th>
              </tr>
            </thead>
            <tbody>
              {history.map((tx, i) => (
                <tr key={i}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{tx.phone_number}</td>
                  <td style={{ textTransform: 'capitalize' }}>
                    {tx.offer ? (
                      <span style={{
                        fontSize: 12,
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: 'rgba(99, 102, 241, 0.15)',
                        color: '#6366f1',
                        fontWeight: 600
                      }}>
                        {tx.offer.replace(/^\d+_DA\|/, '')}
                      </span>
                    ) : (
                      t('فليكسي عادي')
                    )}
                  </td>
                  <td style={{ fontWeight: 600 }}>{tx.amount} {t('د.ج')}</td>
                  <td>
                    <span className={`badge-status ${tx.status === 'success' ? 'success' : tx.status === 'failed' ? 'danger' : 'warning'}`}>
                      {tx.status === 'success' ? t('ناجح') : tx.status === 'failed' ? t('فاشل') : t('قيد المعالجة')}
                    </span>
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>{t('لا توجد معاملات بعد')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
