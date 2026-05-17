import { useState } from 'react';
import { FiSend, FiPhone, FiDollarSign } from 'react-icons/fi';
import API from '../api/axios';

const operators = [
  { id: 'mobilis', name: 'موبيليس', color: '#00b140', prefix: '06' },
  { id: 'djezzy', name: 'جيزي', color: '#e4002b', prefix: '07' },
  { id: 'ooredoo', name: 'أوريدو', color: '#ed1c24', prefix: '05' },
];

const amounts = [100, 200, 500, 1000, 1500, 2000, 5000, 10000];

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
  const [number, setNumber] = useState('');
  const [operator, setOperator] = useState('mobilis');
  const [amount, setAmount] = useState(1000);
  const [offer, setOffer] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSend = async () => {
    if (!number || !amount) return;
    setLoading(true);
    setResult(null);
    try {
      const { data } = await API.post('/flexy/send', { number, operator, amount, offer });
      setResult({ success: true, msg: `تم إرسال فليكسي! معاملة #${data.transaction.id}` });
    } catch (err) {
      setResult({ success: false, msg: err.response?.data?.error || 'فشل' });
    }
    setLoading(false);
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">تعبئة فليكسي</h1>
          <p className="page-subtitle">إرسال تعبئة فليكسي لأي رقم</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><span className="card-title">إرسال تعبئة</span></div>

          <div style={{ display:'flex', gap:8, marginBottom:16 }}>
            {operators.map(op => (
              <button key={op.id}
                className={`btn ${operator === op.id ? 'btn-primary' : 'btn-secondary'}`}
                style={operator === op.id ? { background: op.color } : {}}
                onClick={() => setOperator(op.id)}>
                {op.name}
              </button>
            ))}
          </div>

          <div className="form-group">
            <label className="form-label"><FiPhone style={{marginLeft:4}} /> رقم الهاتف</label>
            <input className="form-input" placeholder="0550000000" value={number}
              onChange={e => {
                const val = e.target.value;
                setNumber(val);
                if (val.startsWith('05')) { setOperator('ooredoo'); setOffer(''); }
                else if (val.startsWith('06')) { setOperator('mobilis'); setOffer(''); }
                else if (val.startsWith('07')) { setOperator('djezzy'); setOffer(''); }
              }} />
          </div>

          <div className="form-group">
            <label className="form-label"><FiDollarSign style={{marginLeft:4}} /> المبلغ</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:8 }}>
              {amounts.map(a => (
                <button key={a}
                  className={`btn btn-sm ${amount === a ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setAmount(a)}>
                  {a} د.ج
                </button>
              ))}
            </div>
            <input className="form-input" type="number" value={amount}
              onChange={e => setAmount(Number(e.target.value))} placeholder="مبلغ مخصص" />
          </div>

          <div className="form-group">
            <label className="form-label">العرض (اختياري)</label>
            <select className="form-select" value={offer} onChange={e => setOffer(e.target.value)}>
              <option value="">بدون عرض</option>
              {operatorOffers[operator]?.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {result && (
            <div className={`login-error`} style={result.success ? { background:'var(--success-bg)', borderColor:'var(--success)', color:'var(--success)' } : {}}>
              {result.msg}
            </div>
          )}

          <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }}
            onClick={handleSend} disabled={loading}>
            {loading ? <span className="spinner" style={{width:16,height:16,borderWidth:2}} /> : <><FiSend size={14} style={{marginLeft:4}}/> إرسال فليكسي</>}
          </button>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">معلومات سريعة</span></div>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {operators.map(op => (
              <div key={op.id} style={{ display:'flex', alignItems:'center', gap:12, padding:12, background:'var(--bg-input)', borderRadius:8 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background: op.color }} />
                <div>
                  <div style={{ fontWeight:600, fontSize:14 }}>{op.name}</div>
                  <div style={{ fontSize:12, color:'var(--text-muted)' }}>البادئة: {op.prefix}x</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
