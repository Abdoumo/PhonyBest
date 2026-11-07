import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useLanguage } from '../contexts/LanguageContext';
import {
  FiPlus, FiSearch, FiEdit, FiTrash2, FiDollarSign, FiSend,
  FiZap, FiUsers, FiUserCheck, FiTrendingUp, FiCreditCard, FiFilter
} from 'react-icons/fi';
import API from '../api/axios';
import TransferModal from '../components/TransferModal';
import SelfRechargeConfigModal from '../components/SelfRechargeConfigModal';

export default function ClientsPage() {
  const { t } = useLanguage();
  const authUser = useSelector(s => s.auth?.user);
  const isAdmin = authUser?.role === 'ADMIN';

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  // Point 10: 5 quick filter tabs: all, mine, client, gros, super_gros
  const [filterTab, setFilterTab] = useState('all');
  const [roleFilter, setRoleFilter] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedTransferClient, setSelectedTransferClient] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedConfigClient, setSelectedConfigClient] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ username: '', email: '', password: '', full_name: '', phone: '', wilaya: '', role: 'GROSIST', status: 'active', wallet: 0 });
  const [debtForm, setDebtForm] = useState({ type: 'add_debt', amount: '', notes: '' });

  const load = () => {
    setLoading(true);
    const params = { search, limit: 1000 };

    if (filterTab === 'mine') {
      params.filter_scope = 'mine';
    } else if (filterTab === 'client') {
      params.role = 'CLIENT';
    } else if (filterTab === 'gros') {
      params.role = 'GROS';
    } else if (filterTab === 'super_gros') {
      params.role = 'SUPER_GRO';
    } else if (roleFilter) {
      params.role = roleFilter;
    }

    API.get('/users', { params })
      .then(r => setUsers(r.data.users || []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [search, filterTab, roleFilter]);

  const handleCreateOrUpdate = async () => {
    try {
      if (editId) {
        await API.put(`/users/${editId}`, form);
      } else {
        await API.post('/users', form);
      }
      setShowModal(false);
      setEditId(null);
      setForm({ username: '', email: '', password: '', full_name: '', phone: '', wilaya: '', role: 'GROSIST', status: 'active', wallet: 0 });
      load();
    } catch (e) { alert(e.response?.data?.error || t('خطأ')); }
  };

  const handleEdit = (u) => {
    setEditId(u.id);
    setForm({ username: u.username || '', email: u.email || '', password: '', full_name: u.full_name || '', phone: u.phone || '', wilaya: u.wilaya || '', role: u.role || 'CLIENT', status: u.status || 'active', wallet: u.wallet || 0 });
    setShowModal(true);
  };

  const handleDebtSubmit = async () => {
    try {
      await API.post(`/users/${editId}/debt`, debtForm);
      setShowDebtModal(false);
      setDebtForm({ type: 'add_debt', amount: '', notes: '' });
      load();
      alert(t('تم تحديث الديون بنجاح'));
    } catch (e) { alert(e.response?.data?.error || t('خطأ في العملية')); }
  };

  const handleDelete = async (id) => {
    if (window.confirm(t('هل أنت متأكد من حذف هذا المستخدم؟'))) {
      try {
        await API.delete(`/users/${id}`);
        load();
      } catch (e) { alert(t('خطأ أثناء الحذف')); }
    }
  };

  const allowedRoles = {
    'ADMIN': ['ADMIN', 'SUPER_GRO', 'GROSIST', 'COMMERCANT', 'CLIENT'],
    'SUPER_GRO': ['GROSIST', 'COMMERCANT', 'CLIENT'],
    'GRO': ['COMMERCANT', 'CLIENT'],
    'GROSIST': ['COMMERCANT', 'CLIENT'],
    'COMMERCANT': ['CLIENT'],
    'CLIENT': []
  };
  const roles = authUser ? (allowedRoles[authUser.role] || []) : ['ADMIN', 'SUPER_GRO', 'GROSIST', 'COMMERCANT', 'CLIENT'];
  const statusMap = { active: 'نشط', suspended: 'موقوف' };

  const wilayasList = [
    "01 - Adrar", "02 - Chlef", "03 - Laghouat", "04 - Oum El Bouaghi", "05 - Batna", "06 - Béjaïa", "07 - Biskra", "08 - Béchar", "09 - Blida", "10 - Bouira",
    "11 - Tamanrasset", "12 - Tébessa", "13 - Tlemcen", "14 - Tiaret", "15 - Tizi Ouzou", "16 - Alger", "17 - Djelfa", "18 - Jijel", "19 - Sétif", "20 - Saïda",
    "21 - Skikda", "22 - Sidi Bel Abbès", "23 - Annaba", "24 - Guelma", "25 - Constantine", "26 - Médéa", "27 - Mostaganem", "28 - M'Sila", "29 - Mascara", "30 - Ouargla",
    "31 - Oran", "32 - El Bayadh", "33 - Illizi", "34 - Bordj Bou Arréridj", "35 - Boumerdès", "36 - El Tarf", "37 - Tindouf", "38 - Tissemsilt", "39 - El Oued", "40 - Khenchela",
    "41 - Souk Ahras", "42 - Tipaza", "43 - Mila", "44 - Aïn Defla", "45 - Naâma", "46 - Aïn Témouchent", "47 - Ghardaïa", "48 - Relizane", "49 - Timimoun", "50 - Bordj Badji Mokhtar",
    "51 - Ouled Djellal", "52 - Béni Abbès", "53 - In Salah", "54 - In Guezzam", "55 - Touggourt", "56 - Djanet", "57 - El M'Ghair", "58 - El Meniaa"
  ];

  // Point 8: Strictly calculate Solde and Bénéfices separately
  const totalWallet = users.reduce((sum, u) => sum + parseFloat(u.wallet || 0), 0);
  const totalDebt = users.reduce((sum, u) => sum + parseFloat(u.debt || 0), 0);
  const totalProfit = users.reduce((sum, u) => sum + parseFloat(u.total_profit || 0), 0);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('العملاء')}</h1>
          <p className="page-subtitle">{t('إدارة حسابات الزبائن والموزعين والجملة والتراخيص')}</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setEditId(null);
            setForm({ username: '', email: '', password: '', full_name: '', phone: '', wilaya: '', role: 'COMMERCANT', status: 'active', wallet: 0 });
            setShowModal(true);
          }}
        >
          <FiPlus size={14} style={{ marginLeft: 4 }} />
          {t('إضافة مستخدم جديد')}
        </button>
      </div>

      {/* Point 8: Separate summary cards for Solde and Bénéfices */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
        <div className="stat-card" style={{ borderLeft: '4px solid var(--primary, #3b82f6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <FiCreditCard size={15} color="var(--primary)" />
            <span className="stat-label" style={{ fontWeight: 600 }}>{t('إجمالي الرصيد (Solde)')}</span>
          </div>
          <div className="stat-value" style={{ color: 'var(--primary)', fontSize: 22 }}>
            {totalWallet.toLocaleString()} <span style={{ fontSize: 13 }}>{t('د.ج')}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {t('المبالغ المتوفرة في محافظ المستخدمين المعروضين')}
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <FiTrendingUp size={15} color="#10b981" />
            <span className="stat-label" style={{ fontWeight: 600, color: '#10b981' }}>{t('إجمالي الأرباح (Bénéfices)')}</span>
          </div>
          <div className="stat-value" style={{ color: '#10b981', fontSize: 22 }}>
            {totalProfit.toLocaleString()} <span style={{ fontSize: 13 }}>{t('د.ج')}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {t('أرباح العمليات المنجزة منفصلة تماماً عن الرصيد')}
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid var(--danger, #ef4444)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <FiDollarSign size={15} color="var(--danger)" />
            <span className="stat-label" style={{ fontWeight: 600, color: 'var(--danger)' }}>{t('إجمالي الديون (Dettes)')}</span>
          </div>
          <div className="stat-value" style={{ color: 'var(--danger)', fontSize: 22 }}>
            {totalDebt.toLocaleString()} <span style={{ fontSize: 13 }}>{t('د.ج')}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {t('مجموع الديون غير المسددة')}
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <FiUsers size={15} color="var(--text-muted)" />
            <span className="stat-label" style={{ fontWeight: 600 }}>{t('عدد الحسابات')}</span>
          </div>
          <div className="stat-value" style={{ fontSize: 22 }}>
            {users.length} <span style={{ fontSize: 13 }}>{t('حساب')}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {t('بحسب الفلتر المحدد وصلاحياتك')}
          </div>
        </div>
      </div>

      <div className="table-wrapper">
        {/* Point 10: 5 Clear Filter Tabs: Tout, Ana – Moi, Client, Gros, Super gros */}
        <div style={{
          display: 'flex',
          gap: 6,
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-color, #334155)',
          background: 'rgba(0,0,0,0.06)',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4, marginInlineEnd: 6 }}>
            <FiFilter size={14} /> {t('تصفية الحسابات')}:
          </span>

          <button
            onClick={() => { setFilterTab('all'); setRoleFilter(''); }}
            className={`btn btn-sm ${filterTab === 'all' && !roleFilter ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: 8, fontWeight: 600 }}
          >
            {t('Tout – الكل')}
          </button>

          <button
            onClick={() => { setFilterTab('mine'); setRoleFilter(''); }}
            className={`btn btn-sm ${filterTab === 'mine' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: 8, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}
          >
            <FiUserCheck size={14} />
            {t('Ana – Moi (أنا)')}
          </button>

          <button
            onClick={() => { setFilterTab('client'); setRoleFilter(''); }}
            className={`btn btn-sm ${filterTab === 'client' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: 8, fontWeight: 600 }}
          >
            {t('Client (العملاء)')}
          </button>

          <button
            onClick={() => { setFilterTab('gros'); setRoleFilter(''); }}
            className={`btn btn-sm ${filterTab === 'gros' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: 8, fontWeight: 600 }}
          >
            {t('Gros (جملة / موزعون)')}
          </button>

          {(isAdmin || authUser?.role === 'SUPER_GRO') && (
            <button
              onClick={() => { setFilterTab('super_gros'); setRoleFilter(''); }}
              className={`btn btn-sm ${filterTab === 'super_gros' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderRadius: 8, fontWeight: 600 }}
            >
              {t('Super gros (سوبر جملة)')}
            </button>
          )}
        </div>

        <div className="table-header">
          <div className="filters-responsive" style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 500 }}>
            <div className="header-search" style={{ flex: 1 }}>
              <FiSearch />
              <input placeholder={t("البحث بالاسم، اسم المستخدم، الهاتف أو الولاية...")} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {filterTab === 'all' && (
              <select className="form-select" style={{ width: 150 }} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
                <option value="">{t('جميع الأدوار')}</option>
                {roles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            )}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>{t('المستخدم')}</th>
              <th>{t('المعلومات')}</th>
              <th>{t('الدور')}</th>
              <th>{t('الرصيد المتاح (Solde)')}</th>
              <th>{t('الديون المستحقة')}</th>
              <th>{t('الأرباح (Bénéfices)')}</th>
              <th>{t('الحالة')}</th>
              <th>{t('الإجراءات')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: 30 }}><span className="spinner" style={{ margin: '0 auto' }} /></td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>{t('لا يوجد مستخدمون مطابقون')}</td></tr>
            ) : users.map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="user-avatar" style={{ width: 34, height: 34, fontSize: 13 }}>
                      {u.full_name?.charAt(0) || u.username?.charAt(0)}
                    </div>
                    <div>
                      <Link to={`/clients/${u.id}`} style={{ fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>
                        {u.full_name || u.username}
                      </Link>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>@{u.username}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{u.phone || '-'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.wilaya || '-'}</div>
                </td>
                <td><span className="badge-status info">{u.role}</span></td>
                
                {/* Column: Solde */}
                <td>
                  <div style={{ fontWeight: 700, color: 'var(--primary)' }}>
                    {u.role === 'ADMIN' ? (
                      <span style={{ fontSize: '1.1em', letterSpacing: 1 }}>{t('لا محدود')}</span>
                    ) : (
                      `${parseFloat(u.wallet || 0).toLocaleString()} ${t('د.ج')}`
                    )}
                  </div>
                  {parseFloat(u.self_recharge_limit || 0) > 0 && (
                    <div style={{ fontSize: 11, color: '#06b6d4', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <FiZap size={11} /> {t('شحن ذاتي')}: {parseFloat(u.self_recharge_limit).toLocaleString()} {t('د.ج')}
                    </div>
                  )}
                </td>

                {/* Column: Dettes */}
                <td>
                  {parseFloat(u.debt || 0) > 0 ? (
                    <div style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 700 }}>
                      {parseFloat(u.debt).toLocaleString()} {t('د.ج')}
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>0 {t('د.ج')}</span>
                  )}
                </td>

                {/* Column: Bénéfices */}
                <td>
                  <span style={{ fontWeight: 700, color: '#10b981' }}>
                    {parseFloat(u.total_profit || 0).toLocaleString()} {t('د.ج')}
                  </span>
                </td>

                <td>
                  <span className={`badge-status ${u.status === 'active' ? 'success' : 'danger'}`}>
                    {t(statusMap[u.status] || u.status)}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Link to={`/clients/${u.id}`} className="btn btn-icon btn-secondary btn-sm" title={t("عرض سجل وملف العميل")}>
                      <FiSearch size={14} />
                    </Link>
                    <button
                      className="btn btn-icon btn-secondary btn-sm"
                      style={{ color: 'var(--primary)' }}
                      onClick={() => { setSelectedTransferClient(u); setShowTransferModal(true); }}
                      title={t("تحويل رصيد (دين / نقد / دفع)")}
                    >
                      <FiSend size={14} />
                    </button>
                    <button
                      className="btn btn-icon btn-secondary btn-sm"
                      style={{ color: '#06b6d4' }}
                      onClick={() => { setSelectedConfigClient(u); setShowConfigModal(true); }}
                      title={t("ترخيص الشحن الذاتي")}
                    >
                      <FiZap size={14} />
                    </button>
                    <button
                      className="btn btn-icon btn-secondary btn-sm"
                      onClick={() => handleEdit(u)}
                      title={t("تعديل ومعلومات")}
                    >
                      <FiEdit size={14} />
                    </button>
                    <button
                      className="btn btn-icon btn-secondary btn-sm"
                      style={{ color: 'var(--warning)' }}
                      onClick={() => { setEditId(u.id); setShowDebtModal(true); }}
                      title={t("إدارة الديون")}
                    >
                      <FiDollarSign size={14} />
                    </button>
                    <button
                      className="btn btn-icon btn-secondary btn-sm"
                      style={{ color: 'var(--danger)' }}
                      onClick={() => handleDelete(u.id)}
                      title={t("حذف")}
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: 'var(--bg-card)', borderTop: '2px solid var(--border)' }}>
              <td colSpan="3" style={{ textAlign: 'start', padding: '16px', fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '13px' }}>
                {t('المجموع الكلي للحسابات المعروضة:')}
              </td>
              <td style={{ padding: '16px' }}>
                <div style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '13px' }}>
                  {t('الرصيد')}: {totalWallet.toLocaleString()} {t('د.ج')}
                </div>
              </td>
              <td style={{ padding: '16px' }}>
                <div style={{ fontWeight: 'bold', color: 'var(--danger)', fontSize: '13px' }}>
                  {t('الديون')}: {totalDebt.toLocaleString()} {t('د.ج')}
                </div>
              </td>
              <td style={{ padding: '16px' }}>
                <div style={{ fontWeight: 'bold', color: '#10b981', fontSize: '13px' }}>
                  {t('الأرباح')}: {totalProfit.toLocaleString()} {t('د.ج')}
                </div>
              </td>
              <td colSpan="2"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editId ? t('تعديل المستخدم') : t('إنشاء مستخدم')}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="form-group">
              <label className="form-label">{t('اسم المستخدم')}</label>
              <input className="form-input" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} disabled={!!editId} />
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
                <label className="form-label">{t('الولاية (Wilaya)')}</label>
                <input className="form-input" list="wilayas-list" value={form.wilaya} onChange={e => setForm({ ...form, wilaya: e.target.value })} placeholder={t("اكتب للبحث...")} />
                <datalist id="wilayas-list">
                  {wilayasList.map(w => <option key={w} value={w} />)}
                </datalist>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{t('كلمة المرور')} {editId && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('(اتركها فارغة إذا لم ترد تغييرها)')}</span>}</label>
              <input className="form-input" type="password" placeholder={editId ? "••••••••" : ""} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">{t('الدور')}</label>
                <select className="form-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  {roles.map(r => <option key={r} value={r}>{r}</option>)}
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
                <label className="form-label">{t('الرصيد الافتتاحي (د.ج)')}</label>
                <input className="form-input" type="number" value={form.wallet} onChange={e => setForm({ ...form, wallet: parseFloat(e.target.value) || 0 })} />
              </div>
            )}
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 12 }} onClick={handleCreateOrUpdate}>
              {editId ? t('حفظ التعديلات') : t('إنشاء المستخدم')}
            </button>
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
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={handleDebtSubmit} disabled={!debtForm.amount}>
              {t('تأكيد وتحديث')}
            </button>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      <TransferModal
        isOpen={showTransferModal}
        onClose={() => { setShowTransferModal(false); setSelectedTransferClient(null); }}
        defaultRecipient={selectedTransferClient}
        onSuccess={load}
      />

      {/* Self-Recharge Config Modal */}
      <SelfRechargeConfigModal
        isOpen={showConfigModal}
        onClose={() => { setShowConfigModal(false); setSelectedConfigClient(null); }}
        client={selectedConfigClient}
        onSuccess={load}
      />
    </div>
  );
}
