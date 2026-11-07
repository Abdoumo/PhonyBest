import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useSelector } from 'react-redux';
import {
  FiArrowRight, FiEdit, FiDollarSign, FiSearch, FiUser, FiMail, FiPhone,
  FiMapPin, FiCalendar, FiClock, FiSend, FiZap, FiCreditCard, FiTrendingUp,
  FiFilter, FiRotateCcw, FiCheck
} from 'react-icons/fi';
import API from '../api/axios';
import TransferModal from '../components/TransferModal';
import SelfRechargeConfigModal from '../components/SelfRechargeConfigModal';

export default function ClientDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user: authUser } = useSelector(s => s.auth);
  const isAdmin = authUser?.role === 'ADMIN';

  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);

  // Transactions state & filters (Point 9)
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [txSearch, setTxSearch] = useState('');
  const [txType, setTxType] = useState('');
  const [txDateFrom, setTxDateFrom] = useState('');
  const [txDateTo, setTxDateTo] = useState('');

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [form, setForm] = useState({});
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [debtForm, setDebtForm] = useState({ type: 'add_debt', amount: '', notes: '' });
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);

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
      const params = {
        client_id: id,
        page,
        limit: 15,
      };
      if (txSearch) params.search = txSearch;
      if (txType) params.type = txType;
      if (txDateFrom) params.date_from = txDateFrom;
      if (txDateTo) params.date_to = txDateTo;

      const { data } = await API.get('/transactions', { params });
      setTransactions(data.transactions || []);
      if (data.pagination) setPagination(data.pagination);
    } catch (err) {
      console.error(err);
      setTransactions([]);
    } finally {
      setTxLoading(false);
    }
  };

  useEffect(() => {
    loadClient();
  }, [id]);

  useEffect(() => {
    loadTransactions();
  }, [id, page, txType, txDateFrom, txDateTo]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadTransactions();
  };

  const resetFilters = () => {
    setTxSearch('');
    setTxType('');
    setTxDateFrom('');
    setTxDateTo('');
    setPage(1);
  };

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

  const translateType = (type, meta) => {
    // If metadata contains specific transfer type
    const subType = meta?.transfer_type;
    if (subType === 'debt') return t('دين – Dette');
    if (subType === 'cash') return t('نقد – Espèces');
    if (subType === 'payment') return t('دفع – Paiement');
    if (subType === 'self_recharge') return t('شحن ذاتي');
    if (subType === 'profit_transfer') return t('تحويل الأرباح');
    if (subType === 'debt_recovery') return t('استرداد دين');
    if (subType === 'cash_recovery') return t('استرداد نقد');
    if (subType === 'payment_recovery') return t('استرداد دفع');

    switch (type) {
      case 'flexy': return t('فليكسي');
      case 'idoom': return t('أيدوم 4G/ADSL');
      case 'card': return t('بطاقة تعبئة');
      case 'buy_cards': return t('شراء بطاقات');
      case 'transfer_cards': return t('تحويل بطاقات');
      case 'wallet_add': return t('إيداع رصيد');
      case 'wallet_remove': return t('سحب رصيد');
      case 'transfer': return t('تحويل رصيد');
      case 'debt': return t('دين – Dette');
      case 'cash': return t('نقد – Espèces');
      case 'payment': return t('دفع – Paiement');
      case 'debt_recovery': return t('استرداد دين');
      case 'cash_recovery': return t('استرداد نقد');
      case 'payment_recovery': return t('استرداد دفع');
      case 'self_recharge': return t('شحن ذاتي');
      case 'profit_transfer': return t('تحويل أرباح');
      default: return type;
    }
  };

  const translateStatus = (status) => {
    switch (status) {
      case 'pending': return t('قيد الانتظار');
      case 'processing': return t('جاري المعالجة');
      case 'success': return t('ناجح');
      case 'failed': return t('فشل');
      case 'cancelled': return t('ملغى');
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
      {/* Page Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-icon btn-secondary" onClick={() => navigate(-1)}><FiArrowRight /></button>
          <div>
            <h1 className="page-title">{client.full_name || client.username}</h1>
            <p className="page-subtitle">
              @{client.username} • <span className={`badge-status ${client.status === 'active' ? 'success' : 'danger'}`} style={{ fontSize: 11, padding: '2px 6px' }}>{client.status === 'active' ? t('نشط') : t('موقوف')}</span>
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => setShowTransferModal(true)}>
            <FiSend size={14} style={{ marginLeft: 4 }} /> {t('تحويل رصيد (دين/نقد/دفع)')}
          </button>
          <button className="btn btn-secondary" style={{ color: '#06b6d4', borderColor: 'rgba(6, 182, 212, 0.4)' }} onClick={() => setShowConfigModal(true)}>
            <FiZap size={14} style={{ marginLeft: 4 }} /> {t('ترخيص الشحن الذاتي')}
          </button>
          <button className="btn btn-secondary" onClick={() => setShowEditModal(true)}>
            <FiEdit size={14} style={{ marginLeft: 4 }} /> {t('تعديل البيانات')}
          </button>
          <button className="btn btn-danger" onClick={() => setShowDebtModal(true)}>
            <FiDollarSign size={14} style={{ marginLeft: 4 }} /> {t('إدارة الديون')}
          </button>
        </div>
      </div>

      {/* Point 8: Strict separation of Solde and Bénéfices in distinct cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16, marginBottom: 24 }}>
        {/* Case 1: Solde (الرصيد) */}
        <div className="stat-card" style={{ borderLeft: '4px solid var(--primary, #3b82f6)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <FiCreditCard size={16} color="var(--primary)" />
              <p className="stat-label" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{t('الرصيد المتاح (Solde)')}</p>
            </div>
            <p className="stat-value" style={{ color: 'var(--primary)' }}>
              {parseFloat(client.wallet || 0).toLocaleString()} <span style={{ fontSize: 14 }}>{t('د.ج')}</span>
            </p>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              {t('الأموال الجاهزة للعمليات والتحويلات')}
            </div>
          </div>
        </div>

        {/* Case 2: Bénéfices (الأرباح) */}
        <div className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <FiTrendingUp size={16} color="#10b981" />
              <p className="stat-label" style={{ fontWeight: 700, color: '#10b981' }}>{t('الأرباح (Bénéfices)')}</p>
            </div>
            <p className="stat-value" style={{ color: '#10b981' }}>
              {parseFloat(client.total_profit || 0).toLocaleString()} <span style={{ fontSize: 14 }}>{t('د.ج')}</span>
            </p>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              {t('إجمالي العائدات والعمولات المحققة')}
            </div>
          </div>
        </div>

        {/* Dettes */}
        <div className="stat-card" style={{ borderLeft: '4px solid var(--danger, #ef4444)' }}>
          <div>
            <p className="stat-label">{t('الديون المستحقة')}</p>
            <p className="stat-value" style={{ color: 'var(--danger)' }}>
              {parseFloat(client.debt || 0).toLocaleString()} <span style={{ fontSize: 14 }}>{t('د.ج')}</span>
            </p>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              {t('المبالغ الواجب استردادها')}
            </div>
          </div>
        </div>

        {/* Self Recharge Limit */}
        <div className="stat-card" style={{ borderLeft: '4px solid #06b6d4' }}>
          <div>
            <p className="stat-label">{t('شحن ذاتي مصرح به (المتبقي)')}</p>
            <p className="stat-value" style={{ color: '#06b6d4' }}>
              {parseFloat(client.self_recharge_limit || 0).toLocaleString()} <span style={{ fontSize: 14 }}>{t('د.ج')}</span>
            </p>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              {client.self_recharge_rule === 'total' ? t('رصيد تنازلي تراكمي') : t('حد أقصى لكل عملية')}
              {client.self_recharge_enabled === false && <span style={{ color: 'var(--danger)', marginRight: 4 }}>({t('معطل')})</span>}
            </div>
          </div>
        </div>

        {/* Role */}
        <div className="stat-card">
          <div>
            <p className="stat-label">{t('نوع الحساب والرتبة')}</p>
            <p className="stat-value" style={{ fontSize: 20, marginTop: 4 }}>
              <span className="badge-status info" style={{ fontSize: 14 }}>{client.role}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: 24 }}>
        {/* Client Personal Info Card */}
        <div className="card" style={{ gridColumn: 'span 1' }}>
          <div className="card-header"><span className="card-title">{t('المعلومات الشخصية')}</span></div>
          <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}><FiUser size={16} /></div>
              <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('الاسم')}</div><div style={{ fontWeight: 600 }}>{client.full_name || '-'}</div></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}><FiPhone size={16} /></div>
              <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('رقم الهاتف')}</div><div style={{ fontWeight: 600, fontFamily: 'monospace', letterSpacing: 1 }}>{client.phone || '-'}</div></div>
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

        {/* Point 9: Dedicated Per-Client History Section */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <span className="card-title">{t('سجل عمليات العميل')} : {client.full_name || client.username}</span>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {t('عرض جميع العمليات، المبالغ، التواريخ، والملاحظات')}
              </div>
            </div>
            {pagination.total > 0 && (
              <span className="badge-status info">
                {pagination.total} {t('معاملة')}
              </span>
            )}
          </div>

          {/* Filter Bar for Client History */}
          <div style={{ padding: '14px 16px', background: 'rgba(0,0,0,0.04)', borderBottom: '1px solid var(--border-color, #334155)' }}>
            <form onSubmit={handleSearchSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
              <div>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%', fontSize: 12 }}
                  placeholder={t('بحث برقم هاتف أو بيان...')}
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                />
              </div>
              <div>
                <select
                  className="form-select"
                  style={{ width: '100%', fontSize: 12 }}
                  value={txType}
                  onChange={(e) => { setTxType(e.target.value); setPage(1); }}
                >
                  <option value="">{t('جميع أنواع العمليات')}</option>
                  <option value="flexy">{t('فليكسي (Mobilis / Djezzy / Ooredoo)')}</option>
                  <option value="idoom">{t('أيدوم 4G / ADSL')}</option>
                  <option value="card">{t('شراء وشحن بطاقات')}</option>
                  <option value="transfer">{t('تحويلات رصيد')}</option>
                  <option value="wallet_add">{t('شحن رصيد')}</option>
                  <option value="wallet_remove">{t('سحب رصيد')}</option>
                </select>
              </div>
              <div>
                <input
                  type="date"
                  className="form-input"
                  style={{ width: '100%', fontSize: 12 }}
                  value={txDateFrom}
                  onChange={(e) => { setTxDateFrom(e.target.value); setPage(1); }}
                  placeholder={t('من تاريخ')}
                />
              </div>
              <div>
                <input
                  type="date"
                  className="form-input"
                  style={{ width: '100%', fontSize: 12 }}
                  value={txDateTo}
                  onChange={(e) => { setTxDateTo(e.target.value); setPage(1); }}
                  placeholder={t('إلى تاريخ')}
                />
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="submit" className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                  <FiFilter size={12} /> {t('تصفية')}
                </button>
                {(txSearch || txType || txDateFrom || txDateTo) && (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={resetFilters} title={t('إعادة ضبط')}>
                    <FiRotateCcw size={12} />
                  </button>
                )}
              </div>
            </form>
          </div>

          <div style={{ overflow: 'auto', maxHeight: 440 }}>
            {txLoading ? (
              <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" style={{ margin: '0 auto' }} /></div>
            ) : transactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                {t('لا توجد عمليات مطابقة لهذا المستخدم.')}
              </div>
            ) : (
              <table style={{ width: '100%', fontSize: 12 }}>
                <thead>
                  <tr>
                    <th>{t('رقم')}</th>
                    <th>{t('التاريخ والوقت')}</th>
                    <th>{t('النوع')}</th>
                    <th>{t('المبلغ')}</th>
                    <th>{t('اسم العميل')}</th>
                    <th>{t('المرسل / المنفّذ')}</th>
                    <th>{t('المستلم / الرقم')}</th>
                    <th>{t('البيان / ملاحظة')}</th>
                    {isAdmin && <th>{t('الربح')}</th>}
                    <th>{t('الحالة')}</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => (
                    <tr key={tx.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'monospace' }}>#{tx.id}</td>
                      <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(tx.created_at).toLocaleString('ar-DZ')}
                      </td>
                      <td>
                        <span className="badge-status" style={{ fontSize: 11 }}>
                          {translateType(tx.type, tx.metadata)}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                        {parseFloat(tx.amount || 0).toLocaleString()} {t('د.ج')}
                      </td>
                      <td>
                        <strong style={{ color: 'var(--text-primary)' }}>
                          {tx.client_full_name || tx.client_name || `@${client.username}`}
                        </strong>
                      </td>
                      <td>
                        <span style={{ color: 'var(--text-muted)' }}>
                          {tx.processed_by_name ? `@${tx.processed_by_name}` : (tx.processed_by ? `#${tx.processed_by}` : '-')}
                        </span>
                      </td>
                      <td>
                        {tx.phone_number ? (
                          <span style={{ fontFamily: 'monospace', fontWeight: 600, direction: 'ltr', display: 'inline-block' }}>
                            {tx.phone_number} {tx.operator && <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'capitalize' }}>({tx.operator})</span>}
                          </span>
                        ) : tx.metadata?.recipient ? (
                          <span>{tx.metadata.recipient}</span>
                        ) : '-'}
                      </td>
                      <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: tx.notes_text ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {tx.notes_text || tx.metadata?.notes || '-'}
                      </td>
                      {isAdmin && (
                        <td style={{ color: '#10b981', fontWeight: 600 }}>
                          {tx.profit ? `${parseFloat(tx.profit).toLocaleString()} د.ج` : '-'}
                        </td>
                      )}
                      <td>
                        <span className={`badge-status ${getStatusClass(tx.status)}`} style={{ fontSize: 11 }}>
                          {translateStatus(tx.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {pagination.pages > 1 && !txLoading && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', padding: 14, borderTop: '1px solid var(--border-color, #334155)' }}>
              <button className="btn btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>{t('السابق')}</button>
              <span style={{ padding: '4px 12px', background: 'var(--bg-input)', borderRadius: 4, fontSize: 12 }}>
                {page} / {pagination.pages}
              </span>
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

      {/* Transfer Modal */}
      <TransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        defaultRecipient={client}
        onSuccess={() => { loadClient(); loadTransactions(); }}
      />

      {/* Self-Recharge Config Modal */}
      <SelfRechargeConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        client={client}
        onSuccess={loadClient}
      />
    </div>
  );
}
