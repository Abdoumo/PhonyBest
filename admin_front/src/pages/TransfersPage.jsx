import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { FiArrowUpRight, FiSearch, FiSend, FiUser } from 'react-icons/fi';
import API from '../api/axios';

export default function TransfersPage() {
  const { t } = useLanguage();
  const [transfers, setTransfers] = useState([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    from_user: '',
    to_user: '',
    type: '',
    status: '',
    min_amount: '',
    max_amount: '',
    date_from: '',
    date_to: ''
  });
  const [loading, setLoading] = useState(false);
  
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ username: '', amount: '' });
  const [sending, setSending] = useState(false);

  const load = () => {
    setLoading(true);
    API.get('/wallet/history', { params: { search, ...filters } })
      .then(r => setTransfers(r.data.transactions || []))
      .catch(() => setTransfers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search, filters]);

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
          <h1 className="page-title">{t('التحويلات المالية')}</h1>
          <p className="page-subtitle">{t('إدارة ومراقبة تحويلات الأرصدة بين المستخدمين')}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <FiSend size={14} style={{marginLeft:4}}/>{t('تحويل رصيد')}</button>
      </div>

      <div className="table-wrapper">
        <div className="table-header" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <div className="filters-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{t('المرسل')}</label>
              <input className="form-input" placeholder={t("اسم المرسل")} value={filters.from_user} onChange={e => setFilters({ ...filters, from_user: e.target.value })} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{t('المستلم')}</label>
              <input className="form-input" placeholder={t("اسم المستلم")} value={filters.to_user} onChange={e => setFilters({ ...filters, to_user: e.target.value })} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{t('المبلغ (من - إلى)')}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="form-input" style={{ width: '50%' }} type="number" placeholder="من" value={filters.min_amount} onChange={e => setFilters({ ...filters, min_amount: e.target.value })} />
                <input className="form-input" style={{ width: '50%' }} type="number" placeholder="إلى" value={filters.max_amount} onChange={e => setFilters({ ...filters, max_amount: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{t('التاريخ (من - إلى)')}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="form-input" style={{ width: '50%' }} type="date" value={filters.date_from} onChange={e => setFilters({ ...filters, date_from: e.target.value })} />
                <input className="form-input" style={{ width: '50%' }} type="date" value={filters.date_to} onChange={e => setFilters({ ...filters, date_to: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{t('النوع')}</label>
              <select className="form-select" value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value })}>
                <option value="">{t('الكل')}</option>
                <option value="transfer">{t('تحويل')}</option>
                <option value="deposit">{t('إيداع')}</option>
                <option value="withdrawal">{t('سحب')}</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{t('الحالة')}</label>
              <select className="form-select" value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
                <option value="">{t('الكل')}</option>
                <option value="completed">{t('مكتمل')}</option>
                <option value="pending">{t('قيد المعالجة')}</option>
                <option value="failed">{t('فشل')}</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignSelf: 'flex-start', width: '100%', maxWidth: 300 }}>
            <div className="header-search" style={{ width: '100%' }}>
              <FiSearch />
              <input placeholder={t("البحث برقم المعاملة...")} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>{t('رقم المعاملة')}</th>
              <th>{t('التاريخ')}</th>
              <th>{t('المرسل')}</th>
              <th>{t('المستلم')}</th>
              <th>{t('المبلغ')}</th>
              <th>{t('النوع')}</th>
              <th>{t('الحالة')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{textAlign:'center', padding:24}}><span className="spinner" style={{margin:'0 auto'}}/></td></tr>
            ) : transfers.length === 0 ? (
              <tr><td colSpan="7" style={{textAlign:'center', padding:24}}>{t('لا توجد تحويلات')}</td></tr>
            ) : transfers.map(trx => (
              <tr key={trx.id}>
                <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{trx.id}</td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(trx.date).toLocaleString('ar-DZ')}</td>
                <td><span className="badge-status info">@{trx.from_user}</span></td>
                <td><span className="badge-status info">@{trx.to_user}</span></td>
                <td style={{ fontWeight: 600, color: 'var(--success)' }}>+{parseFloat(trx.amount).toLocaleString()} {t('د.ج')}</td>
                <td>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:12 }}>
                    <FiArrowUpRight color="var(--accent)" />{t(trx.type === 'transfer' ? 'تحويل' : trx.type === 'deposit' ? 'إيداع' : trx.type === 'withdrawal' ? 'سحب' : trx.type)}</span>
                </td>
                <td>
                  <span className={`badge-status ${trx.status === 'completed' ? 'success' : 'warning'}`}>
                    {trx.status === 'completed' ? 'مكتمل' : 'قيد المعالجة'}
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
              <h3 className="modal-title">{t('تحويل رصيد جديد')}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="form-group">
              <label className="form-label">{t('اسم مستخدم المستلم')}</label>
              <div style={{ position:'relative' }}>
                <FiUser style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
                <input className="form-input" style={{ paddingRight:36 }} placeholder={t("مثال: gro_ahmed")} 
                  value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{t('المبلغ (د.ج)')}</label>
              <input className="form-input" type="number" placeholder={t("أدخل المبلغ المراد تحويله")} 
                value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
            </div>
            <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center', marginTop:16 }} 
              onClick={handleTransfer} disabled={sending || !form.username || !form.amount}>
              {sending ? <span className="spinner" style={{width:16,height:16,borderWidth:2}} /> : <><FiSend size={14} style={{marginLeft:4}}/>{t('تأكيد التحويل')}</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
