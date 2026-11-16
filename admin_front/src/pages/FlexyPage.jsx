import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { FiSend, FiPhone, FiDollarSign } from 'react-icons/fi';
import API from '../api/axios';

const operators = [
  { id: 'mobilis', name: 'موبيليس', color: '#00b140', prefix: '06' },
  { id: 'djezzy', name: 'جيزي', color: '#e4002b', prefix: '07' },
  { id: 'ooredoo', name: 'أوريدو', color: '#ed1c24', prefix: '05' },
];

const amounts = [100, 200, 500, 1000, 1500, 2000];

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
      
    // Fetch online modems for the admin to select from
    API.get('/flexy/modems')
      .then(r => setModems(r.data.modems || []))
      .catch(e => console.error(e));
      
    fetchHistory();
  }, []);

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
      setResult({ success: true, msg: `تم إرسال فليكسي! معاملة #${data.transaction.id}` });
      fetchHistory();
    } catch (err) {
      setResult({ success: false, msg: err.response?.data?.error || 'فشل' });
    }
    setLoading(false);
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('تعبئة فليكسي')}</h1>
          <p className="page-subtitle">{t('إرسال تعبئة فليكسي لأي رقم')}</p>
        </div>
      </div>

      <div className="">
        <div className="card">
          <div className="card-header"><span className="card-title">{t('إرسال تعبئة')}</span></div>

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
            <label className="form-label"><FiPhone style={{ marginLeft: 4 }} />{t('رقم الهاتف، كود العميل المرجعي (Ref) أو الاسم')}</label>
            <input className="form-input phone-input-large" placeholder="0550000000 / mh01" value={number}
              autoComplete="off"
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              style={{ fontSize: '2.5rem', letterSpacing: '3px', textAlign: 'center', fontWeight: 'bold', height: '70px', borderRadius: '12px' }}
              onChange={e => {
                const val = e.target.value;
                setNumber(val);
                setShowDropdown(true);

                // Auto-detect operator based on digits if starting with prefix
                const cleanDigits = val.replace(/\D/g, '');
                if (cleanDigits.startsWith('05')) { setOperator('ooredoo'); setOffer(''); setSelectedModem(''); }
                else if (cleanDigits.startsWith('06')) { setOperator('mobilis'); setOffer(''); setSelectedModem(''); }
                else if (cleanDigits.startsWith('07')) { setOperator('djezzy'); setOffer(''); setSelectedModem(''); }
              }} />
            
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1.1rem' }}>{c.full_name || c.username}</span>
                      {c.ref_code && (
                        <span style={{
                          fontSize: 11,
                          fontWeight: 800,
                          fontFamily: 'monospace',
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: 'rgba(99, 102, 241, 0.15)',
                          color: '#6366f1',
                          border: '1px solid rgba(99, 102, 241, 0.3)'
                        }} title={t('كود العميل المرجعي')}>
                          {c.ref_code}
                        </span>
                      )}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '1.2rem', letterSpacing: '2px', fontFamily: 'monospace' }}>{c.phone}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label"><FiDollarSign style={{ marginLeft: 4 }} />{t('المبلغ')}</label>
            <div className="amount-btns" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              {amounts.map(a => (
                <button key={a}
                  className={`btn btn-sm ${amount === a ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setAmount(a)}>
                  {a} {t('د.ج')}
                </button>
              ))}
            </div>
            <input className="form-input" type="number" min="1" value={amount}
                 style={{ fontSize: '2.5rem', letterSpacing: '4px', textAlign: 'center',  height: '70px', borderRadius: '12px' }} 
              onKeyDown={e => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
              onChange={e => setAmount(Number(e.target.value))} placeholder={t("مبلغ مخصص")} />
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

          <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center', padding: 12, fontSize: 23 }}
            onClick={handleSend} disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <><FiSend size={14} style={{ marginLeft: 4 }} />{t('إرسال فليكسي')}</>}
          </button>
        </div>


      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-header">
          <span className="card-title">{t('سجل فليكسي')}</span>
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
                  <td style={{ textTransform:'capitalize' }}>{t('فليكسي')}</td>
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
