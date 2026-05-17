import { useState } from 'react';
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

  const handleSend = async () => {
    if (!phone || !amount) return;
    setLoading(true);
    setResult(null);
    try {
      const { data } = await API.post('/idoom/recharge', { phone_number: phone, amount, type });
      setResult({ success: true, msg: `تمت تعبئة أيدوم بنجاح! معاملة #${data.transaction.id}` });
      setPhone('');
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

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><span className="card-title">{t('تنفيذ تعبئة أيدوم')}</span></div>

          <div style={{ display:'flex', gap:8, marginBottom:16 }}>
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
            <input className="form-input" style={{ fontSize: '2.5rem', letterSpacing: '4px', textAlign: 'center', fontWeight: 'bold', height: '70px', borderRadius: '12px' }} 
              placeholder={type === 'lte' ? '023000000' : '021000000'} value={phone}
              maxLength={10}
              onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} />
          </div>

          <div className="form-group">
            <label className="form-label"><FiDollarSign style={{marginLeft:4}} />{t('المبلغ')}</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:8 }}>
              {predefinedAmounts.map(a => (
                <button key={a}
                  className={`btn btn-sm ${amount === a ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setAmount(a)}>
                  {a} {t('د.ج')}
                </button>
              ))}
            </div>
            <input className="form-input" type="number" value={amount}
              onChange={e => setAmount(Number(e.target.value))} placeholder={t("أدخل مبلغاً مخصصاً")} />
          </div>

          {result && (
            <div className={`login-error`} style={result.success ? { background:'var(--success-bg)', borderColor:'var(--success)', color:'var(--success)', marginBottom: 16 } : { marginBottom: 16 }}>
              {result.msg}
            </div>
          )}

          <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center', padding: 12, fontSize: 15 }}
            onClick={handleSend} disabled={loading || !phone || !amount}>
            {loading ? <span className="spinner" style={{width:16,height:16,borderWidth:2}} /> : <><FiSend size={16} style={{marginLeft:6}}/>{t('تعبئة الآن')}</>}
          </button>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">{t('معلومات الباقات')}</span></div>
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, padding:16, background:'var(--bg-input)', borderRadius:8 }}>
              <div style={{ width:40, height:40, borderRadius:'8px', background: 'var(--info-bg)', color: 'var(--info)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FiWifi size={20} />
              </div>
              <div>
                <div style={{ fontWeight:600, fontSize:15, marginBottom: 4 }}>أيدوم ADSL / Fibre</div>
                <div style={{ fontSize:13, color:'var(--text-muted)' }}>{t('يتم التفعيل فوراً عند إدخال رقم الهاتف الثابت.')}</div>
              </div>
            </div>
            
            <div style={{ display:'flex', alignItems:'center', gap:12, padding:16, background:'var(--bg-input)', borderRadius:8 }}>
              <div style={{ width:40, height:40, borderRadius:'8px', background: 'var(--accent-glow)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FiWifi size={20} />
              </div>
              <div>
                <div style={{ fontWeight:600, fontSize:15, marginBottom: 4 }}>أيدوم 4G LTE</div>
                <div style={{ fontSize:13, color:'var(--text-muted)' }}>تأكد من إدخال رقم الـ MSISDN الخاص بشريحة الجيل الرابع.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
