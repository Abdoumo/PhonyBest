import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useSelector } from 'react-redux';
import { FiArrowRight, FiEdit, FiDollarSign, FiSearch, FiUser, FiMail, FiPhone, FiMapPin, FiCalendar, FiClock } from 'react-icons/fi';
import API from '../api/axios';

export default function ClientDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user: authUser } = useSelector(s => s.auth);
  const isAdmin = authUser?.role === 'ADMIN';

  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);

  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [form, setForm] = useState({});
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [debtForm, setDebtForm] = useState({ type: 'add_debt', amount: '', notes: '' });

  const loadClient = async () => {
    try {
      const { data } = await API.get(`/users/${id}`);
      setClient(data.user);
      setForm({
        username: data.user.username || '',
        email: data.user.email || '',
        password: '',
        full_name: data.user.full_name || '',
        phone: data.user.phone || '',
        wilaya: data.user.wilaya || '',
        role: data.user.role || 'CLIENT',
        status: data.user.status || 'active',
        wallet: data.user.wallet || 0
      });
    } catch (e) {
      console.error(e);
      alert(t('خطأ في تحميل بيانات المستخدم'));
      navigate('/clients');
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    setTxLoading(true);
    try {
      const { data } = await API.get(`/transactions?client_id=${id}&page=${page}&limit=10`);
      setTransactions(data.transactions || []);
      if (data.pagination) setPagination(data.pagination);
    } catch (err) {
      console.error(err);
      setTransactions([]);
    }
    setTxLoading(false);
  };

  useEffect(() => {
    loadClient();
  }, [id]);

  useEffect(() => {
    loadTransactions();
  }, [id, page]);

  const handleEditSubmit = async () => {
    try {
      await API.put(`/users/${id}`, form);
      setShowEditModal(false);
      loadClient();
      alert(t('تم تحديث البيانات بنجاح'));
    } catch (e) { alert(e.response?.data?.error || t('خطأ')); }
  };

  const handleDebtSubmit = async () => {
    try {
      await API.post(`/users/${id}/debt`, debtForm);
      setShowDebtModal(false);
      setDebtForm({ type: 'add_debt', amount: '', notes: '' });
      loadClient();
      loadTransactions();
      alert(t('تم تحديث الديون بنجاح'));
    } catch (e) { alert(e.response?.data?.error || t('خطأ في العملية')); }
  };

  const translateType = (type) => {
    switch (type) {
      case 'flexy': return 'فليكسي';
      case 'idoom': return 'أيدوم';
      case 'card': return 'بطاقة';
      case 'buy_cards': return 'شراء بطاقات';
      case 'transfer_cards': return 'تحويل بطاقات';
      case 'wallet_add': return 'شحن رصيد';
      case 'wallet_remove': return 'سحب رصيد';
      case 'transfer': return 'تحويل رصيد';
      case 'debt': return 'دين';
      default: return type;
    }
  };

  const translateStatus = (status) => {
    switch (status) {
      case 'pending': return 'قيد الانتظار';
      case 'processing': return 'جاري المعالجة';
      case 'success': return 'ناجح';
      case 'failed': return 'فشل';
      case 'cancelled': return 'ملغى';
      default: return status;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'success': return 'success';
      case 'failed': return 'danger';
      case 'pending':
      case 'processing': return 'warning';
      default: return 'secondary';
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!client) return null;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-icon btn-secondary" onClick={() => navigate(-1)}><FiArrowRight /></button>
          <div>
            <h1 className="page-title">{client.full_name || client.username}</h1>
            <p className="page-subtitle">@{client.username} • <span className={`badge-status ${client.status === 'active' ? 'success' : 'danger'}`} style={{fontSize:11, padding:'2px 6px'}}>{client.status === 'active' ? t('نشط') : t('موقوف')}</span></p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setShowEditModal(true)}>
            <FiEdit size={14} style={{marginLeft: 4}} /> {t('تعديل البيانات')}
          </button>
          <button className="btn btn-danger" onClick={() => setShowDebtModal(true)}>
            <FiDollarSign size={14} style={{marginLeft: 4}} /> {t('إدارة الديون')}
          </button>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div>
            <p className="stat-label">{t('الرصيد الحالي (Wallet)')}</p>
            <p className="stat-value" style={{ color: 'var(--primary)' }}>{parseFloat(client.wallet || 0).toLocaleString()} <span style={{fontSize:14}}>{t('د.ج')}</span></p>
          </div>
        </div>
        <div className="stat-card">
          <div>
            <p className="stat-label">{t('الديون المستحقة')}</p>
            <p className="stat-value" style={{ color: 'var(--danger)' }}>{parseFloat(client.debt || 0).toLocaleString()} <span style={{fontSize:14}}>{t('د.ج')}</span></p>
          </div>
        </div>
        <div className="stat-card">
          <div>
            <p className="stat-label">{t('إجمالي أرباح المنصة منه')}</p>
            <p className="stat-value" style={{ color: 'var(--success)' }}>{parseFloat(client.total_profit || 0).toLocaleString()} <span style={{fontSize:14}}>{t('د.ج')}</span></p>
          </div>
        </div>
        <div className="stat-card">
          <div>
            <p className="stat-label">{t('الدور')}</p>
            <p className="stat-value" style={{ fontSize: 20, marginTop: 4 }}>
              <span className="badge-status info" style={{ fontSize: 14 }}>{client.role}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="card" style={{ gridColumn: 'span 1' }}>
          <div className="card-header"><span className="card-title">{t('المعلومات الشخصية')}</span></div>
          <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}><FiUser size={16} /></div>
              <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('الاسم')}</div><div style={{ fontWeight: 600 }}>{client.full_name || '-'}</div></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}><FiPhone size={16} /></div>
              <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('رقم الهاتف')}</div><div style={{ fontWeight: 600, fontFamily:'monospace', letterSpacing:1 }}>{client.phone || '-'}</div></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}><FiMail size={16} /></div>
              <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('البريد')}</div><div style={{ fontWeight: 600 }}>{client.email || '-'}</div></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}><FiMapPin size={16} /></div>
              <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('الولاية')}</div><div style={{ fontWeight: 600 }}>{client.wilaya || '-'}</div></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}><FiCalendar size={16} /></div>
              <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('تاريخ التسجيل')}</div><div style={{ fontWeight: 600 }}>{new Date(client.created_at).toLocaleDateString('ar-DZ')}</div></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}><FiClock size={16} /></div>
              <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('آخر تسجيل دخول')}</div><div style={{ fontWeight: 600 }}>{client.last_login ? new Date(client.last_login).toLocaleString('ar-DZ') : '-'}</div></div>
            </div>
          </div>
        </div>

        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-header"><span className="card-title">{t('سجل العمليات')}</span></div>
          <div style={{ overflow: 'auto', maxHeight: 400 }}>
            {txLoading ? (
              <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" style={{ margin: '0 auto' }} /></div>
            ) : transactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>{t('لا توجد عمليات لهذا المستخدم.')}</div>
            ) : (
              <table style={{ width: '100%', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th>{t('رقم')}</th>
                    <th>{t('النوع')}</th>
                    <th>{t('المبلغ')}</th>
                    {isAdmin && <th>{t('ربح المنصة')}</th>}
                    <th>{t('الحالة')}</th>
                    <th>{t('التاريخ')}</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => (
                    <tr key={tx.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>#{tx.id}</td>
                      <td>
                        <span className="badge-status">{translateType(tx.type)}</span>
                        {tx.operator && <div style={{ fontSize: 11, marginTop: 4, color: 'var(--text-muted)', textTransform:'capitalize' }}>{tx.operator} {tx.phone_number ? `(${tx.phone_number})` : ''}</div>}
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{tx.amount} د.ج</td>
                      {isAdmin && <td style={{ color: 'var(--success)' }}>{tx.profit ? `${tx.profit} د.ج` : '-'}</td>}
                      <td>
                        <span className={`badge-status ${getStatusClass(tx.status)}`}>
                          {translateStatus(tx.status)}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{new Date(tx.created_at).toLocaleString('ar-DZ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {pagination.pages > 1 && !txLoading && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>{t('السابق')}</button>
              <span style={{ padding: '4px 12px', background: 'var(--bg-input)', borderRadius: 4, fontSize: 13 }}>{page} / {pagination.pages}</span>
              <button className="btn btn-sm" disabled={page === pagination.pages} onClick={() => setPage(p => p + 1)}>{t('التالي')}</button>
            </div>
          )}
        </div>
      </div>

      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{t('تعديل المستخدم')}</h3>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <div className="form-group">
              <label className="form-label">{t('اسم المستخدم')}</label>
              <input className="form-input" value={form.username} disabled />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">{t('الاسم الكامل')}</label>
                <input className="form-input" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('البريد الإلكتروني')}</label>
                <input className="form-input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('رقم الهاتف')}</label>
                <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('الولاية')}</label>
                <input className="form-input" value={form.wilaya} onChange={e => setForm({ ...form, wilaya: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{t('كلمة المرور')} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('(اتركها فارغة إذا لم ترد تغييرها)')}</span></label>
              <input className="form-input" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">{t('الدور')}</label>
                <select className="form-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  {['ADMIN', 'SUPER_GRO', 'GROSIST', 'COMMERCANT', 'CLIENT'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{t('الحالة')}</label>
                <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="active">{t('نشط')}</option>
                  <option value="suspended">{t('موقوف')}</option>
                </select>
              </div>
            </div>
            {isAdmin && (
              <div className="form-group">
                <label className="form-label">{t('الرصيد / المحفظة (د.ج)')}</label>
                <input className="form-input" type="number" value={form.wallet} onChange={e => setForm({ ...form, wallet: parseFloat(e.target.value) || 0 })} />
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleEditSubmit}>
                {t('حفظ التغييرات')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDebtModal && (
        <div className="modal-overlay" onClick={() => setShowDebtModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{t('إدارة ديون المستخدم')}</h3>
              <button className="modal-close" onClick={() => setShowDebtModal(false)}>×</button>
            </div>

            <div className="form-group">
              <label className="form-label">{t('نوع العملية')}</label>
              <select className="form-select" value={debtForm.type} onChange={e => setDebtForm({ ...debtForm, type: e.target.value })}>
                <option value="add_debt">{t('إعطاء دين للمستخدم (زيادة ديونه)')}</option>
                <option value="pay_debt">{t('تسديد دين (إنقاص ديونه)')}</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">{t('المبلغ (د.ج)')}</label>
              <input className="form-input" type="number" min="0" value={debtForm.amount} onChange={e => setDebtForm({ ...debtForm, amount: e.target.value })} />
            </div>

            <div className="form-group">
              <label className="form-label">{t('ملاحظات / بيان العملية')}</label>
              <input className="form-input" placeholder={t("مثال: تسديد دفعة من شهر ماي...")} value={debtForm.notes} onChange={e => setDebtForm({ ...debtForm, notes: e.target.value })} />
            </div>

            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={handleDebtSubmit} disabled={!debtForm.amount}>{t('تأكيد وتحديث')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
