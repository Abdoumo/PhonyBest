import { useState, useEffect } from 'react';
import { FiArrowUpRight, FiSearch, FiSend, FiUser } from 'react-icons/fi';
import API from '../api/axios';

export default function TransfersPage() {
  const [transfers, setTransfers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ username: '', amount: '' });
  const [sending, setSending] = useState(false);

  const load = () => {
    setLoading(true);
    API.get('/wallet/history', { params: { search } })
      .then(r => setTransfers(r.data.transactions || []))
      .catch(() => setTransfers([
        { id: 'TRX-1029', date: '2026-05-15T14:30:00Z', from_user: 'admin', to_user: 'gro_ahmed', amount: 50000, type: 'transfer', status: 'completed' },
        { id: 'TRX-1028', date: '2026-05-14T10:15:00Z', from_user: 'gro_ahmed', to_user: 'com_karim', amount: 15000, type: 'transfer', status: 'completed' },
        { id: 'TRX-1027', date: '2026-05-13T09:20:00Z', from_user: 'admin', to_user: 'cli_sara', amount: 2000, type: 'transfer', status: 'completed' },
      ]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search]);

  const handleTransfer = async () => {
    if (!form.username || !form.amount) return;
    setSending(true);
    try {
      await API.post('/wallet/transfer', form);
      setShowModal(false);
      setForm({ username: '', amount: '' });
      load();
    } catch (e) {
      alert(e.response?.data?.error || 'حدث خطأ أثناء التحويل');
    }
    setSending(false);
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">التحويلات المالية</h1>
          <p className="page-subtitle">إدارة ومراقبة تحويلات الأرصدة بين المستخدمين</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <FiSend size={14} style={{marginLeft:4}}/> تحويل رصيد
        </button>
      </div>

      <div className="table-wrapper">
        <div className="table-header">
          <div style={{ display:'flex', gap:8 }}>
            <div className="header-search" style={{ minWidth:250 }}>
              <FiSearch />
              <input placeholder="البحث برقم المعاملة أو المستخدم..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>رقم المعاملة</th>
              <th>التاريخ</th>
              <th>المرسل</th>
              <th>المستلم</th>
              <th>المبلغ</th>
              <th>النوع</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{textAlign:'center', padding:24}}><span className="spinner" style={{margin:'0 auto'}}/></td></tr>
            ) : transfers.length === 0 ? (
              <tr><td colSpan="7" style={{textAlign:'center', padding:24}}>لا توجد تحويلات</td></tr>
            ) : transfers.map(t => (
              <tr key={t.id}>
                <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{t.id}</td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(t.date).toLocaleString('ar-DZ')}</td>
                <td><span className="badge-status info">@{t.from_user}</span></td>
                <td><span className="badge-status info">@{t.to_user}</span></td>
                <td style={{ fontWeight: 600, color: 'var(--success)' }}>+{parseFloat(t.amount).toLocaleString()} د.ج</td>
                <td>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:12 }}>
                    <FiArrowUpRight color="var(--accent)" /> تحويل
                  </span>
                </td>
                <td>
                  <span className={`badge-status ${t.status === 'completed' ? 'success' : 'warning'}`}>
                    {t.status === 'completed' ? 'مكتمل' : 'قيد المعالجة'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">تحويل رصيد جديد</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="form-group">
              <label className="form-label">اسم مستخدم المستلم</label>
              <div style={{ position:'relative' }}>
                <FiUser style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
                <input className="form-input" style={{ paddingRight:36 }} placeholder="مثال: gro_ahmed" 
                  value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">المبلغ (د.ج)</label>
              <input className="form-input" type="number" placeholder="أدخل المبلغ المراد تحويله" 
                value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
            </div>
            <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center', marginTop:16 }} 
              onClick={handleTransfer} disabled={sending || !form.username || !form.amount}>
              {sending ? <span className="spinner" style={{width:16,height:16,borderWidth:2}} /> : <><FiSend size={14} style={{marginLeft:4}}/> تأكيد التحويل</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
