import { useState, useEffect } from 'react';
import { FiPlus, FiSearch, FiEdit, FiTrash2 } from 'react-icons/fi';
import API from '../api/axios';

export default function ClientsPage() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ username:'', email:'', password:'', full_name:'', phone:'', wilaya: '', role:'GROSIST', status:'active', wallet:0 });
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
      setForm({ username:'', email:'', password:'', full_name:'', phone:'', wilaya: '', role:'GROSIST', status:'active', wallet:0 });
      load();
    } catch (e) { alert(e.response?.data?.error || 'خطأ'); }
  };

  const handleEdit = (u) => {
    setEditId(u.id);
    setForm({ username:u.username||'', email:u.email||'', password:'', full_name:u.full_name||'', phone:u.phone||'', wilaya:u.wilaya||'', role:u.role||'CLIENT', status:u.status||'active', wallet:u.wallet||0 });
    setShowModal(true);
  };

  const handleDebtSubmit = async () => {
    try {
      await API.post(`/users/${editId}/debt`, debtForm);
      setShowDebtModal(false);
      setDebtForm({ type: 'add_debt', amount: '', notes: '' });
      load();
      alert('تم تحديث الديون بنجاح');
    } catch (e) { alert(e.response?.data?.error || 'خطأ في العملية'); }
  };

  const handleDelete = async (id) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
      try {
        await API.delete(`/users/${id}`);
        load();
      } catch (e) { alert('خطأ أثناء الحذف'); }
    }
  };

  const roles = ['ADMIN', 'SUPER_GRO', 'GROSIST', 'COMMERCANT', 'CLIENT'];
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
          <h1 className="page-title">العملاء</h1>
          <p className="page-subtitle">إدارة المستخدمين والموزعين</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditId(null); setForm({ username:'', email:'', password:'', full_name:'', phone:'', wilaya: '', role:'COMMERCANT', status:'active', wallet:0 }); setShowModal(true); }}>
          <FiPlus size={14} style={{marginLeft:4}}/> إضافة مستخدم
        </button>
      </div>

      <div className="table-wrapper">
        <div className="table-header">
          <div style={{ display:'flex', gap:8 }}>
            <div className="header-search" style={{ minWidth:200 }}>
              <FiSearch />
              <input placeholder="البحث عن مستخدمين..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="form-select" style={{ width:150 }} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
              <option value="">جميع الأدوار</option>
              {roles.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <table>
          <thead>
            <tr><th>المستخدم</th><th>المعلومات</th><th>الدور</th><th>الرصيد/الديون</th><th>الأرباح</th><th>الحالة</th><th>الإجراءات</th></tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div className="user-avatar" style={{ width:32, height:32, fontSize:12 }}>
                      {u.full_name?.charAt(0) || u.username?.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight:600, color:'var(--text-primary)' }}>{u.full_name || u.username}</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)' }}>@{u.username}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{u.phone || '-'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.wilaya || '-'}</div>
                </td>
                <td><span className="badge-status info">{u.role}</span></td>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--primary)' }}>رصيد: {parseFloat(u.wallet || 0).toLocaleString()} د.ج</div>
                  {parseFloat(u.debt || 0) > 0 && (
                    <div style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600, marginTop: 4 }}>
                      ديون: {parseFloat(u.debt).toLocaleString()} د.ج
                    </div>
                  )}
                  {parseFloat(u.debt || 0) === 0 && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>لا توجد ديون</div>
                  )}
                </td>
                <td style={{ fontWeight: 600, color: 'var(--success)' }}>
                  {parseFloat(u.total_profit || 0).toLocaleString()} د.ج
                </td>
                <td><span className={`badge-status ${u.status==='active'?'success':'danger'}`}>{statusMap[u.status] || u.status}</span></td>
                <td>
                  <div style={{ display:'flex', gap:4 }}>
                    <button className="btn btn-icon btn-secondary btn-sm" onClick={() => handleEdit(u)} title="تعديل ومعلومات"><FiEdit size={14}/></button>
                    <button className="btn btn-icon btn-secondary btn-sm" style={{color:'var(--danger)'}} onClick={() => handleDelete(u.id)}><FiTrash2 size={14}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: 'var(--bg-card)', borderTop: '2px solid var(--border)' }}>
              <td colSpan="3" style={{ textAlign: 'left', padding: '16px', fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '14px' }}>
                إجمالي أموال الإدارة لدى المستخدمين (المجموع الكلي):
              </td>
              <td style={{ padding: '16px' }}>
                <div style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '14px' }}>
                  رصيد كلي: {totalWallet.toLocaleString()} د.ج
                </div>
                <div style={{ fontWeight: 'bold', color: 'var(--danger)', fontSize: '14px', marginTop: 4 }}>
                  ديون كلية: {totalDebt.toLocaleString()} د.ج
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
              <h3 className="modal-title">{editId ? 'تعديل المستخدم' : 'إنشاء مستخدم'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="form-group">
              <label className="form-label">اسم المستخدم</label>
              <input className="form-input" value={form.username} onChange={e => setForm({...form, username:e.target.value})} disabled={!!editId} />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">الاسم الكامل</label>
                <input className="form-input" value={form.full_name} onChange={e => setForm({...form, full_name:e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">البريد الإلكتروني</label>
                <input className="form-input" value={form.email} onChange={e => setForm({...form, email:e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">رقم الهاتف</label>
                <input className="form-input" value={form.phone} onChange={e => setForm({...form, phone:e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">الولاية (Wilaya)</label>
                <input className="form-input" list="wilayas-list" value={form.wilaya} onChange={e => setForm({...form, wilaya:e.target.value})} placeholder="اكتب للبحث..." />
                <datalist id="wilayas-list">
                  {wilayasList.map(w => <option key={w} value={w} />)}
                </datalist>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">كلمة المرور {editId && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(اتركها فارغة إذا لم ترد تغييرها)</span>}</label>
              <input className="form-input" type="password" placeholder={editId ? "••••••••" : ""} value={form.password} onChange={e => setForm({...form, password:e.target.value})} />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">الدور</label>
                <select className="form-select" value={form.role} onChange={e => setForm({...form, role:e.target.value})}>
                  {roles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">الحالة</label>
                <select className="form-select" value={form.status} onChange={e => setForm({...form, status:e.target.value})}>
                  <option value="active">نشط</option>
                  <option value="suspended">موقوف</option>
                </select>
              </div>
            </div>
            {editId && (
              <div className="form-group">
                <label className="form-label">الرصيد / المحفظة (د.ج)</label>
                <input className="form-input" type="number" value={form.wallet} onChange={e => setForm({...form, wallet: parseFloat(e.target.value) || 0})} />
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              {editId && (
                <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center', borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={() => setShowDebtModal(true)}>
                  إدارة الديون (إضافة / تسديد)
                </button>
              )}
              <button className="btn btn-primary" style={{ flex: 2, justifyContent:'center' }} onClick={handleCreateOrUpdate}>
                {editId ? 'حفظ التغييرات' : 'إنشاء مستخدم'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDebtModal && (
        <div className="modal-overlay" onClick={() => setShowDebtModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">إدارة ديون المستخدم</h3>
              <button className="modal-close" onClick={() => setShowDebtModal(false)}>×</button>
            </div>

            <div className="form-group">
              <label className="form-label">نوع العملية</label>
              <select className="form-select" value={debtForm.type} onChange={e => setDebtForm({...debtForm, type:e.target.value})}>
                <option value="add_debt">إعطاء دين للمستخدم (زيادة ديونه)</option>
                <option value="pay_debt">تسديد دين (إنقاص ديونه)</option>
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">المبلغ (د.ج)</label>
              <input className="form-input" type="number" min="0" value={debtForm.amount} onChange={e => setDebtForm({...debtForm, amount: e.target.value})} />
            </div>

            <div className="form-group">
              <label className="form-label">ملاحظات / بيان العملية</label>
              <input className="form-input" placeholder="مثال: تسديد دفعة من شهر ماي..." value={debtForm.notes} onChange={e => setDebtForm({...debtForm, notes: e.target.value})} />
            </div>

            <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center', marginTop:8 }} onClick={handleDebtSubmit} disabled={!debtForm.amount}>
              تأكيد وتحديث
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
