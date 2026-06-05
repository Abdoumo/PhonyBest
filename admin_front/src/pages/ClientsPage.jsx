import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useLanguage } from '../contexts/LanguageContext';
import { FiPlus, FiSearch, FiEdit, FiTrash2 } from 'react-icons/fi';
import API from '../api/axios';

export default function ClientsPage() {
  const { t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ username: '', email: '', password: '', full_name: '', phone: '', wilaya: '', role: 'GROSIST', status: 'active', wallet: 0 });
  const [debtForm, setDebtForm] = useState({ type: 'add_debt', amount: '', notes: '' });

  const load = () => {
    API.get('/users', { params: { search, role: roleFilter || undefined, limit: 1000 } })
      .then(r => setUsers(r.data.users || []))
      .catch(() => setUsers([]));
  };

  useEffect(() => { load(); }, [search, roleFilter]);

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

  const authUser = useSelector(s => s.auth?.user);
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
  const totalWallet = users.reduce((sum, u) => sum + parseFloat(u.wallet || 0), 0);
  const totalDebt = users.reduce((sum, u) => sum + parseFloat(u.debt || 0), 0);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('العملاء')}</h1>
          <p className="page-subtitle">{t('إدارة المستخدمين والموزعين')}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditId(null); setForm({ username: '', email: '', password: '', full_name: '', phone: '', wilaya: '', role: 'COMMERCANT', status: 'active', wallet: 0 }); setShowModal(true); }}>
          <FiPlus size={14} style={{ marginLeft: 4 }} />{t('إضافة مستخدم')}</button>
      </div>

      <div className="table-wrapper">
        <div className="table-header">
          <div className="filters-responsive" style={{ display: 'flex', gap: 8 }}>
            <div className="header-search" style={{ minWidth: 200 }}>
              <FiSearch />
              <input placeholder={t("البحث عن مستخدمين...")} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="form-select" style={{ width: 150 }} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
              <option value="">{t('جميع الأدوار')}</option>
              {roles.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <table>
          <thead>
            <tr><th>{t('المستخدم')}</th><th>{t('المعلومات')}</th><th>{t('الدور')}</th><th>{t('الرصيد/الديون')}</th><th>{t('الأرباح')}</th><th>{t('الحالة')}</th><th>{t('الإجراءات')}</th></tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="user-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                      {u.full_name?.charAt(0) || u.username?.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.full_name || u.username}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>@{u.username}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{u.phone || '-'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.wilaya || '-'}</div>
                </td>
                <td><span className="badge-status info">{u.role}</span></td>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{t('رصيد')}: {u.role === 'ADMIN' ? <span style={{ fontSize: '1.1em', letterSpacing: 1 }}>{t('لا محدود')}</span> : `${parseFloat(u.wallet || 0).toLocaleString()} ${t('د.ج')}`}</div>
                  {parseFloat(u.debt || 0) > 0 && (
                    <div style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600, marginTop: 4 }}>
                      {t('ديون')}: {parseFloat(u.debt).toLocaleString()} {t('د.ج')}
                    </div>
                  )}
                  {parseFloat(u.debt || 0) === 0 && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{t('لا توجد ديون')}</div>
                  )}
                </td>
                <td style={{ fontWeight: 600, color: 'var(--success)' }}>
                  {parseFloat(u.total_profit || 0).toLocaleString()} {t('د.ج')}
                </td>
                <td><span className={`badge-status ${u.status === 'active' ? 'success' : 'danger'}`}>{t(statusMap[u.status] || u.status)}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-icon btn-secondary btn-sm" onClick={() => handleEdit(u)} title={t("تعديل ومعلومات")}><FiEdit size={14} /></button>
                    <button className="btn btn-icon btn-secondary btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(u.id)}><FiTrash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: 'var(--bg-card)', borderTop: '2px solid var(--border)' }}>
              <td colSpan="3" style={{ textAlign: 'left', padding: '16px', fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '14px' }}>
                {t('إجمالي أموال الإدارة لدى المستخدمين (المجموع الكلي):')}
              </td>
              <td style={{ padding: '16px' }}>
                <div style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '14px' }}>
                  {t('رصيد كلي')}: {totalWallet.toLocaleString()} {t('د.ج')}
                </div>
                <div style={{ fontWeight: 'bold', color: 'var(--danger)', fontSize: '14px', marginTop: 4 }}>
                  {t('ديون كلية')}: {totalDebt.toLocaleString()} {t('د.ج')}
                </div>
              </td>
              <td colSpan="3"></td>
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
            {editId && (
              <div className="form-group">
                <label className="form-label">{t('الرصيد / المحفظة (د.ج)')}</label>
                <input className="form-input" type="number" value={form.wallet} onChange={e => setForm({ ...form, wallet: parseFloat(e.target.value) || 0 })} />
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              {editId && (
                <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center', borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={() => setShowDebtModal(true)}>
                  {t('إدارة الديون (إضافة / تسديد)')}
                </button>
              )}
              <button className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }} onClick={handleCreateOrUpdate}>
                {editId ? t('حفظ التغييرات') : t('إنشاء مستخدم')}
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
