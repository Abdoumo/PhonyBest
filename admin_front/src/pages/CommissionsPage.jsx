import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { FiPercent, FiSave, FiRefreshCw, FiPlus, FiTrash2, FiEdit2 } from 'react-icons/fi';
import API from '../api/axios';

const roles = [
  { id: 'SUPER_GRO', name: 'سوبر غرو (SUPER_GRO)' },
  { id: 'GRO', name: 'جملة (GRO)' },
  { id: 'COMMERCANT', name: 'عادي (COMMERCANT)' },
  { id: 'CLIENT', name: 'زبون (CLIENT)' }
];

const services = [
  { id: 'flexy', name: 'فليكسي' },
  { id: 'idoom', name: 'أيدوم' },
  { id: 'card', name: 'بطاقات' }
];

const operators = {
  flexy: ['ooredoo', 'djezzy', 'mobilis'],
  idoom: ['idoom'],
  card: ['ooredoo', 'djezzy', 'mobilis', 'idoom', 'freefire', 'pubg', '4g']
};

export default function CommissionsPage() {
  const { t } = useLanguage();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    role: 'COMMERCANT',
    service: 'flexy',
    operator: 'ooredoo',
    base_amount: 10000,
    admin_cost: 9500,
    client_price: 9800
  });

  const load = () => {
    setLoading(true);
    API.get('/commissions')
      .then(r => setOffers(r.data.offers || []))
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    try {
      await API.post('/commissions', { ...form, id: editingId });
      setShowModal(false);
      load();
    } catch (e) {
      alert(t('حدث خطأ أثناء الحفظ'));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('هل أنت متأكد من الحذف؟'))) return;
    try {
      await API.delete(`/commissions/${id}`);
      load();
    } catch (e) {
      alert(t('حدث خطأ أثناء الحذف'));
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setForm({ role: 'COMMERCANT', service: 'flexy', operator: 'ooredoo', base_amount: 10000, admin_cost: 9500, client_price: 9800 });
    setShowModal(true);
  };

  const openEdit = (offer) => {
    setEditingId(offer.id);
    setForm({
      role: offer.role,
      service: offer.service,
      operator: offer.operator,
      base_amount: offer.base_amount,
      admin_cost: offer.admin_cost,
      client_price: offer.client_price
    });
    setShowModal(true);
  };

  const getPercentage = (profit, base) => {
    if (!base || base == 0) return 0;
    return ((profit / base) * 100).toFixed(2);
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('عروض العمولات')}</h1>
          <p className="page-subtitle">{t('تكوين أسعار التكلفة وأسعار البيع ونسب الأرباح لكل خدمة ومستوى')}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={load} disabled={loading}>
            <FiRefreshCw size={14} style={{marginLeft:4}}/>{t('تحديث')}</button>
          <button className="btn btn-primary" onClick={openAdd}>
            <FiPlus size={14} style={{marginLeft:4}}/>{t('إضافة عرض جديد')}</button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">{t('قائمة العروض المخصصة')}</span>
        </div>
        
        <div style={{ overflow: 'auto' }}>
          {loading ? (
            <div style={{ textAlign:'center', padding: 40 }}><span className="spinner" style={{ margin:'0 auto' }}/></div>
          ) : offers.length === 0 ? (
            <div style={{ textAlign:'center', padding: 40, color: 'var(--text-muted)' }}>{t('لا توجد عروض عمولات معرفة. قم بإضافة عرض جديد.')}</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>{t('الخدمة')}</th>
                  <th>{t('المتعامل')}</th>
                  <th>{t('مستوى المستخدم')}</th>
                  <th>{t('المبلغ الأساسي (Base)')}</th>
                  <th>{t('سعر التكلفة (أنا)')}</th>
                  <th>{t('سعر البيع (للزبون)')}</th>
                  <th>{t('ربحي (Admin)')}</th>
                  <th>{t('ربح الزبون')}</th>
                  <th>{t('إجراءات')}</th>
                </tr>
              </thead>
              <tbody>
                {offers.map(o => {
                  const adminProfit = o.client_price - o.admin_cost;
                  const clientProfit = o.base_amount - o.client_price;
                  return (
                    <tr key={o.id}>
                      <td style={{ fontWeight: 600 }}>{t(services.find(s => s.id === o.service)?.name || o.service)}</td>
                      <td style={{ textTransform: 'capitalize' }}>{t(o.operator)}</td>
                      <td>
                        <span className="badge-status" style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}>
                          {t(roles.find(r => r.id === o.role)?.name || o.role)}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{o.base_amount} {t('د.ج')}</td>
                      <td style={{ color: 'var(--danger)' }}>{o.admin_cost} {t('د.ج')}</td>
                      <td style={{ color: 'var(--primary)' }}>{o.client_price} {t('د.ج')}</td>
                      <td>
                        <div style={{ color: 'var(--success)', fontWeight: 600 }}>{adminProfit} {t('د.ج')}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{getPercentage(adminProfit, o.base_amount)}%</div>
                      </td>
                      <td>
                        <div style={{ color: 'var(--success)', fontWeight: 600 }}>{clientProfit} {t('د.ج')}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{getPercentage(clientProfit, o.base_amount)}%</div>
                      </td>
                      <td style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-sm btn-secondary" onClick={() => openEdit(o)}><FiEdit2 /></button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(o.id)}><FiTrash2 /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 className="modal-title">{editingId ? t('تعديل عرض عمولة') : t('إضافة عرض عمولة')}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">{t('الخدمة')}</label>
                <select className="form-select" value={form.service} onChange={e => setForm({...form, service: e.target.value, operator: operators[e.target.value][0]})}>
                  {services.map(s => <option key={s.id} value={s.id}>{t(s.name)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{t('المتعامل')}</label>
                <select className="form-select" value={form.operator} onChange={e => setForm({...form, operator: e.target.value})}>
                  {operators[form.service]?.map(op => <option key={op} value={op}>{op}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t('مستوى المستخدم (Role)')}</label>
              <select className="form-select" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                {roles.map(r => <option key={r.id} value={r.id}>{t(r.name)}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">{t('المبلغ الأساسي كمثال (Base Amount)')}</label>
              <input className="form-input" type="number" value={form.base_amount} onChange={e => setForm({...form, base_amount: Number(e.target.value)})} />
              <small style={{ color: 'var(--text-muted)' }}>{t('مثال:')} 10000 {t('د.ج')}</small>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">{t('سعر التكلفة (سعر شرائك)')}</label>
                <input className="form-input" type="number" value={form.admin_cost} onChange={e => setForm({...form, admin_cost: Number(e.target.value)})} />
                <small style={{ color: 'var(--danger)' }}>{t('أنت تدفع')}: {form.admin_cost}</small>
              </div>
              <div className="form-group">
                <label className="form-label">{t('سعر البيع (للزبون)')}</label>
                <input className="form-input" type="number" value={form.client_price} onChange={e => setForm({...form, client_price: Number(e.target.value)})} />
                <small style={{ color: 'var(--primary)' }}>{t('الزبون يدفع')}: {form.client_price}</small>
              </div>
            </div>

            <div style={{ padding: 12, background: 'var(--bg-sidebar)', borderRadius: 8, marginTop: 8, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>{t('ربحي أنا (Admin)')}:</span>
                <strong style={{ color: 'var(--success)' }}>{form.client_price - form.admin_cost} {t('د.ج')} ({getPercentage(form.client_price - form.admin_cost, form.base_amount)}%)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{t('ربح الزبون')}:</span>
                <strong style={{ color: 'var(--success)' }}>{form.base_amount - form.client_price} {t('د.ج')} ({getPercentage(form.base_amount - form.client_price, form.base_amount)}%)</strong>
              </div>
            </div>

            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleSave}>
              <FiSave size={16} style={{ marginLeft: 6 }} />{t('حفظ العرض')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
