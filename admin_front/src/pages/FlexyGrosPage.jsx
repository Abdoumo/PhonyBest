import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import {
  FiSend, FiPhone, FiDollarSign, FiChevronDown, FiChevronUp,
  FiRefreshCw, FiCpu, FiTrendingUp, FiActivity, FiCheckCircle,
  FiAlertCircle, FiLayers, FiWifi
} from 'react-icons/fi';
import API from '../api/axios';

const operators = [
  { id: 'mobilis', name: 'موبيليس', color: '#00b140', prefix: '06' },
  { id: 'djezzy', name: 'جيزي', color: '#e4002b', prefix: '07' },
  { id: 'ooredoo', name: 'أوريدو', color: '#ed1c24', prefix: '05' },
];

const operatorOffers = {
  mobilis: [
    { value: 'sama_mix', label: 'Sama Mix' },
    { value: 'sama_net', label: 'Sama Net' },
    { value: 'pixx', label: 'PixX' },
  ],
  djezzy: [
    { value: 'hayla', label: 'Hayla' },
    { value: 'haya', label: 'Haya' },
    { value: 'legend', label: 'Legend' },
  ],
  ooredoo: [
    { value: 'yooz', label: 'Yooz' },
    { value: 'hashta', label: 'Hashta' },
    { value: 'sahla', label: 'Sahla' },
  ]
};

export default function FlexyGrosPage() {
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

  // Détails Flexy gros state
  const [grosDetails, setGrosDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(true);

  const fetchGrosDetails = () => {
    setDetailsLoading(true);
    API.get('/flexy/gros-details')
      .then(res => setGrosDetails(res.data.details || null))
      .catch(err => console.error('Error fetching gros details:', err))
      .finally(() => setDetailsLoading(false));
  };

  const fetchHistory = () => {
    API.get('/transactions?type=flexy_gros&limit=10')
      .then(res => setHistory(res.data.transactions || []))
      .catch(err => console.error(err));
  };

  const filteredClients = clients.filter(c => {
    if (!c.phone) return false;
    const selectedOp = operators.find(o => o.id === operator);
    if (selectedOp && !c.phone.startsWith(selectedOp.prefix)) return false;
    
    return (
      c.phone.includes(number) || 
      (c.full_name && c.full_name.toLowerCase().includes(number.toLowerCase())) || 
      (c.username && c.username.toLowerCase().includes(number.toLowerCase()))
    );
  });

  useEffect(() => {
    API.get('/users', { params: { limit: 1000 } })
      .then(r => setClients(r.data.users || []))
      .catch(e => console.error(e));
      
    API.get('/flexy/modems')
      .then(r => setModems(r.data.modems || []))
      .catch(e => console.error(e));
      
    fetchHistory();
    fetchGrosDetails();
  }, []);

  const handleSend = async () => {
    if (!number || number.length !== 10) {
      setResult({ success: false, msg: 'الرجاء إدخال رقم هاتف صحيح مكون من 10 أرقام' });
      return;
    }
    if (!amount || amount <= 0) {
      setResult({ success: false, msg: 'الرجاء إدخال مبلغ صالح أكبر من الصفر' });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const payload = { number, operator, amount, offer, isGros: true };
      if (selectedModem) {
        payload.dongle_id = selectedModem;
      }
      const { data } = await API.post('/flexy/send', payload);
      setResult({ success: true, msg: `تم إرسال فليكسي! معاملة #${data.transaction.id}` });
      fetchHistory();
      fetchGrosDetails();
    } catch (err) {
      setResult({ success: false, msg: err.response?.data?.error || 'فشل في العملية' });
    }
    setLoading(false);
  };

  const todayStats = grosDetails?.todayStats || {};
  const operatorBalances = grosDetails?.operatorBalances || { mobilis: 0, djezzy: 0, ooredoo: 0 };
  const allModems = grosDetails?.modems || [];

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('فليكسي جملة')}</h1>
          <p className="page-subtitle">{t('إرسال فليكسي جملة وإدارة حساب ومودمات الجملة')}</p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => setIsDetailsOpen(!isDetailsOpen)}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <FiLayers size={15} />
          <span>{isDetailsOpen ? t('إخفاء تفاصيل فليكسي جملة') : t('عرض تفاصيل فليكسي جملة')}</span>
          {isDetailsOpen ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
        </button>
      </div>

      {/* SECTION: Détails Flexy gros (Collapsible Card) */}
      {isDetailsOpen && (
        <div className="card" style={{ marginBottom: 24, border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 8,
                background: 'rgba(99, 102, 241, 0.12)', color: 'var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <FiActivity size={18} />
              </div>
              <div>
                <span className="card-title" style={{ fontSize: 16 }}>{t('تفاصيل فليكسي جملة – Détails Flexy gros')}</span>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                  {t('الأرصدة المتوفرة حسب المتعامل، الشريحات المتصلة وإحصائيات اليوم')}
                </p>
              </div>
            </div>
            <button
              className="btn btn-sm btn-secondary"
              onClick={fetchGrosDetails}
              disabled={detailsLoading}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              title={t("تحديث البيانات")}
            >
              <FiRefreshCw size={13} className={detailsLoading ? 'spinner' : ''} />
              <span>{t('تحديث')}</span>
            </button>
          </div>

          <div style={{ padding: '0 20px 20px' }}>
            {/* 1. Soldes par opérateur (Mobilis, Djezzy, Ooredoo) */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <FiDollarSign size={14} />
                <span>{t('رصيد الشريحات المتاح حسب المتعامل:')}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                {/* Mobilis */}
                <div style={{
                  background: 'rgba(0, 177, 64, 0.08)',
                  border: '1px solid rgba(0, 177, 64, 0.3)',
                  borderRadius: 10,
                  padding: '14px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#00b140', fontSize: 14 }}>{t('موبيليس (Mobilis)')}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4, color: 'var(--text-primary)' }}>
                      {(operatorBalances.mobilis || 0).toLocaleString()} <span style={{ fontSize: 13, fontWeight: 500 }}>{t('د.ج')}</span>
                    </div>
                  </div>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', background: '#00b140', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11
                  }}>
                    06
                  </div>
                </div>

                {/* Djezzy */}
                <div style={{
                  background: 'rgba(228, 0, 43, 0.08)',
                  border: '1px solid rgba(228, 0, 43, 0.3)',
                  borderRadius: 10,
                  padding: '14px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#e4002b', fontSize: 14 }}>{t('جيزي (Djezzy)')}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4, color: 'var(--text-primary)' }}>
                      {(operatorBalances.djezzy || 0).toLocaleString()} <span style={{ fontSize: 13, fontWeight: 500 }}>{t('د.ج')}</span>
                    </div>
                  </div>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', background: '#e4002b', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11
                  }}>
                    07
                  </div>
                </div>

                {/* Ooredoo */}
                <div style={{
                  background: 'rgba(237, 28, 36, 0.08)',
                  border: '1px solid rgba(237, 28, 36, 0.3)',
                  borderRadius: 10,
                  padding: '14px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#ed1c24', fontSize: 14 }}>{t('أوريدو (Ooredoo)')}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4, color: 'var(--text-primary)' }}>
                      {(operatorBalances.ooredoo || 0).toLocaleString()} <span style={{ fontSize: 13, fontWeight: 500 }}>{t('د.ج')}</span>
                    </div>
                  </div>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', background: '#ed1c24', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11
                  }}>
                    05
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Statistiques globales & volume du jour */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <FiTrendingUp size={14} />
                <span>{t('إحصائيات وحجم فليكسي جملة لليوم:')}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
                <div className="stat-card" style={{ padding: '12px 14px' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('حجم الجملة اليوم')}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--success)', marginTop: 4 }}>
                    {(todayStats.totalAmount || 0).toLocaleString()} <span style={{ fontSize: 12 }}>{t('د.ج')}</span>
                  </div>
                </div>
                <div className="stat-card" style={{ padding: '12px 14px' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('إجمالي عمليات اليوم')}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)', marginTop: 4 }}>
                    {(todayStats.totalCount || 0)} <span style={{ fontSize: 12 }}>{t('عملية')}</span>
                  </div>
                </div>
                <div className="stat-card" style={{ padding: '12px 14px' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('ناجحة / فاشلة')}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4, display: 'flex', gap: 6 }}>
                    <span style={{ color: 'var(--success)' }}>✓ {todayStats.successCount || 0}</span>
                    <span style={{ color: 'var(--danger)' }}>✗ {todayStats.failedCount || 0}</span>
                  </div>
                </div>
                <div className="stat-card" style={{ padding: '12px 14px' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('نسبة النجاح')}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)', marginTop: 4 }}>
                    {todayStats.successRate != null ? todayStats.successRate : 100}%
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Statut des puces / modems en ligne */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FiCpu size={14} />
                  <span>{t('الشريحات والمودمات المتصلة حالياً')} ({allModems.length}):</span>
                </div>
              </div>

              {allModems.length === 0 ? (
                <div style={{ padding: 14, textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-input)', borderRadius: 8, fontSize: 12 }}>
                  {t('لا توجد شريحات أو مودمات متصلة حالياً بالفليكسي')}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                  {allModems.map((m, idx) => {
                    const opLower = m.operator?.toLowerCase() || '';
                    const opColor = opLower.includes('mobilis') ? '#00b140' : opLower.includes('djezzy') ? '#e4002b' : '#ed1c24';
                    return (
                      <div
                        key={idx}
                        style={{
                          background: 'var(--bg-input)',
                          border: '1px solid var(--border)',
                          borderRadius: 8,
                          padding: '10px 12px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} />
                            <span>{m.name || m.dongle_id}</span>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                            {m.node_name} • <span style={{ color: opColor, fontWeight: 600 }}>{m.operator}</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'left' }}>
                          <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: 13 }}>
                            {parseFloat(m.balance || 0).toLocaleString()} {t('د.ج')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Main Flexy Gros Form */}
      <div>
        <div className="card">
          <div className="card-header"><span className="card-title">{t('إرسال تعبئة فليكسي جملة')}</span></div>

          <div className="operator-btns" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {operators.map(op => (
              <button key={op.id}
                className={`btn ${operator === op.id ? 'btn-primary' : 'btn-secondary'}`}
                style={operator === op.id ? { background: op.color } : {}}
                onClick={() => setOperator(op.id)}>
                {t(op.name)}
              </button>
            ))}
          </div>

          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label"><FiPhone style={{ marginLeft: 4 }} />{t('رقم الهاتف أو اسم العميل')}</label>
            <input
              className="form-input phone-input-large"
              placeholder="0550000000"
              value={number}
              maxLength={10}
              autoComplete="off"
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              style={{ fontSize: '2.5rem', letterSpacing: '4px', textAlign: 'center', fontWeight: 'bold', height: '70px', borderRadius: '12px' }}
              onChange={e => {
                let val = e.target.value.replace(/\D/g, '');
                setNumber(val);
                setShowDropdown(true);

                if (val.startsWith('05')) { setOperator('ooredoo'); setOffer(''); setSelectedModem(''); }
                else if (val.startsWith('06')) { setOperator('mobilis'); setOffer(''); setSelectedModem(''); }
                else if (val.startsWith('07')) { setOperator('djezzy'); setOffer(''); setSelectedModem(''); }
              }}
            />
            
            {showDropdown && filteredClients.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: '12px', marginTop: '8px', maxHeight: '250px',
                overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
              }}>
                {filteredClients.map(c => (
                  <div key={c.id} 
                    style={{ padding: '16px', borderBottom: '1px solid var(--border)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => {
                      const cleanPhone = c.phone.replace(/\D/g, '').substring(0, 10);
                      setNumber(cleanPhone);
                      setShowDropdown(false);
                      if (cleanPhone.startsWith('05')) { setOperator('ooredoo'); setOffer(''); setSelectedModem(''); }
                      else if (cleanPhone.startsWith('06')) { setOperator('mobilis'); setOffer(''); setSelectedModem(''); }
                      else if (cleanPhone.startsWith('07')) { setOperator('djezzy'); setOffer(''); setSelectedModem(''); }
                    }}
                  >
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1.1rem' }}>{c.full_name || c.username}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '1.2rem', letterSpacing: '2px', fontFamily: 'monospace' }}>{c.phone}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Amount input without predefined buttons (as requested by user) */}
          <div className="form-group">
            <label className="form-label"><FiDollarSign style={{ marginLeft: 4 }} />{t('المبلغ (د.ج)')}</label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-input"
                type="number"
                min="1"
                value={amount}
                style={{ fontSize: '2.5rem', letterSpacing: '4px', textAlign: 'center', fontWeight: 'bold', height: '70px', borderRadius: '12px' }} 
                onKeyDown={e => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                onChange={e => setAmount(Number(e.target.value))}
                placeholder={t("أدخل المبلغ")}
              />
            </div>
          </div>

          <div className="form-group" style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <label className="form-label">{t('العرض (اختياري)')}</label>
              <select className="form-select" value={offer} onChange={e => setOffer(e.target.value)}>
                <option value="">{t('بدون عرض')}</option>
                {operatorOffers[operator]?.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            {modems.some(m => m.operator.toLowerCase().includes(operator)) && (
              <div style={{ flex: 1 }}>
                <label className="form-label">{t('اختيار المودم (اختياري)')}</label>
                <select className="form-select" value={selectedModem} onChange={e => setSelectedModem(e.target.value)}>
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

          {result && (
            <div className={`login-error`} style={result.success ? { background: 'var(--success-bg)', borderColor: 'var(--success)', color: 'var(--success)' } : {}}>
              {result.msg}
            </div>
          )}

          <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center', padding: 12, fontSize: 22, fontWeight: 700 }}
            onClick={handleSend} disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <><FiSend size={15} style={{ marginLeft: 6 }} />{t('إرسال فليكسي جملة')}</>}
          </button>
        </div>
      </div>

      {/* History table */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-header">
          <span className="card-title">{t('سجل فليكسي جملة')}</span>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>{t('الرقم')}</th>
                <th>{t('النوع')}</th>
                <th>{t('المبلغ')}</th>
                <th>{t('الحالة')}</th>
              </tr>
            </thead>
            <tbody>
              {history.map((tx, i) => (
                <tr key={i}>
                  <td style={{ fontFamily:'monospace', fontWeight:600 }}>{tx.phone_number}</td>
                  <td style={{ textTransform:'capitalize' }}>{t('فليكسي جملة')}</td>
                  <td style={{ fontWeight:600 }}>{tx.amount} {t('د.ج')}</td>
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
