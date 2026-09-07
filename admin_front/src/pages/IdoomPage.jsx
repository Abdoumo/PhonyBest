import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { FiWifi, FiSend, FiPhone, FiDollarSign } from 'react-icons/fi';
import API from '../api/axios';

const idoomTypes = [
  { id: 'adsl', name: 'ADSL' },
  { id: 'fibre', name: 'Fibre' },
  { id: 'lte', name: '4G LTE' },
];

const predefinedAmounts = [500, 1000, 1500, 2000, 3000, 5000];

export default function IdoomPage() {
  const { t } = useLanguage();
  const [type, setType] = useState('adsl');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState(1000);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  const fetchHistory = () => {
    API.get('/transactions?type=idoom&limit=10')
      .then(res => setHistory(res.data.transactions || []))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSend = async () => {
    if (!phone || !amount) return;
    setLoading(true);
    setResult(null);
    try {
      const { data } = await API.post('/idoom/recharge', { phone_number: phone, amount, type });
      setResult({ success: true, msg: `تمت تعبئة أيدوم بنجاح! معاملة #${data.transaction.id}` });
      setPhone('');
      fetchHistory();
    } catch (err) {
      setResult({ success: false, msg: err.response?.data?.error || 'حدث خطأ أثناء التعبئة' });
    }
    setLoading(false);
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('تعبئة أيدوم')}</h1>
          <p className="page-subtitle">خدمات تعبئة ADSL و Fibre و LTE</p>
        </div>
      </div>

      <div className="">
        <div className="card">
          <div className="card-header"><span className="card-title">{t('تنفيذ تعبئة أيدوم')}</span></div>

          <div className="operator-btns" style={{ display:'flex', gap:8, marginBottom:16 }}>
            {idoomTypes.map(t => (
              <button key={t.id}
                className={`btn ${type === t.id ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setType(t.id)}>
                {t.name}
              </button>
            ))}
          </div>

          <div className="form-group">
            <label className="form-label"><FiPhone style={{marginLeft:4}} />{t('رقم الهاتف (أو رقم الحساب)')}</label>
            <input className="form-input phone-input-large" style={{ fontSize: '2.5rem', letterSpacing: '4px', textAlign: 'center', fontWeight: 'bold', height: '70px', borderRadius: '12px' }} 
              placeholder={type === 'lte' ? '023000000' : '021000000'} value={phone}
              maxLength={10}
              onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} />
          </div>

          <div className="form-group">
            <label className="form-label"><FiDollarSign style={{marginLeft:4}} />{t('المبلغ')}</label>
            <div className="amount-btns" style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:8 }}>
              {predefinedAmounts.map(a => (
                <button key={a}
                 style={{ fontSize: '20px'}} 
                  className={`btn btn-sm ${amount === a ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setAmount(a)}>
                  {a} {t('د.ج')}
                </button>
              ))}
            </div>
            <input className="form-input" type="number" min="1" value={amount}
            style={{ fontSize: '2.5rem', letterSpacing: '4px', textAlign: 'center',  height: '70px', borderRadius: '12px' }} 
              onKeyDown={e => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
              onChange={e => setAmount(Number(e.target.value))} placeholder={t("أدخل مبلغاً مخصصاً")} />
          </div>

          {result && (
            <div className={`login-error`} style={result.success ? { background:'var(--success-bg)', borderColor:'var(--success)', color:'var(--success)', marginBottom: 16 } : { marginBottom: 16 }}>
              {result.msg}
            </div>
          )}

          <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center', padding: 12, fontSize: 23 }}
            onClick={handleSend} disabled={loading || !phone || !amount}>
            {loading ? <span className="spinner" style={{width:16,height:16,borderWidth:2}} /> : <><FiSend size={16} style={{marginLeft:6}}/>{t('تعبئة الآن')}</>}
          </button>
        </div>

      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-header">
          <span className="card-title">{t('سجل أيدوم')}</span>
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
                  <td style={{ textTransform:'capitalize' }}>{t('أيدوم')}</td>
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
