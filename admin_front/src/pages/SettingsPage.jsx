import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { FiSettings, FiSave, FiLock, FiDatabase } from 'react-icons/fi';
import API from '../api/axios';

export default function SettingsPage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const [settings, setSettings] = useState({
    siteName: 'منصة فليكسي GSM',
    maintenanceMode: false,
    autoApproveTransactions: true,
    maxDailyLimit: 500000,
  });

  const [roles] = useState(['SUPER_GRO', 'GROSIST', 'COMMERCANT']);
  const [selectedRole, setSelectedRole] = useState('');
  const [rolePerms, setRolePerms] = useState({});
  const [globalSettings, setGlobalSettings] = useState({});

  const availableRoutes = [
    { id: 'dashboard', name: 'لوحة القيادة' },
    { id: 'flexy', name: 'فليكسي' },
    { id: 'idoom', name: 'أيدوم' },
    { id: 'cards', name: 'البطاقات' },
    { id: 'card-orders', name: 'طلبات البطاقات' },
    { id: 'clients', name: 'العملاء' },
    { id: 'commissions', name: 'العمولات' },
    { id: 'transfers', name: 'التحويلات' },
    { id: 'stock', name: 'المخزون' },
    { id: 'analytics', name: 'التحليلات' },
    { id: 'ads', name: 'الإعلانات' },
    { id: 'settings', name: 'الإعدادات' }
  ];

  const defaultRolePerms = {
    'SUPER_GRO': ['dashboard', 'flexy', 'idoom', 'cards', 'card-orders', 'clients', 'transfers', 'stock'],
    'GROSIST': ['dashboard', 'flexy', 'idoom', 'cards', 'transfers'],
    'COMMERCANT': ['dashboard', 'flexy', 'idoom', 'cards']
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await API.get('/settings');
      setGlobalSettings(res.data.settings || {});
      if (res.data.settings?.siteName) {
        setSettings({
          siteName: res.data.settings.siteName,
          maintenanceMode: res.data.settings.maintenanceMode === 'true',
          autoApproveTransactions: res.data.settings.autoApproveTransactions === 'true',
          maxDailyLimit: Number(res.data.settings.maxDailyLimit) || 500000,
        });
      }
    } catch (e) {
      console.error(e);
    }
    setTimeout(() => setLoading(false), 300);
  };

  useEffect(() => { load(); }, []);

  const handleRoleSelect = (e) => {
    const role = e.target.value;
    setSelectedRole(role);
    if (role) {
      const savedPerms = globalSettings[`role_perms_${role}`];
      const permsArray = savedPerms ? (Array.isArray(savedPerms) ? savedPerms : JSON.parse(savedPerms)) : defaultRolePerms[role] || [];
      const pMap = {};
      availableRoutes.forEach(r => pMap[r.id] = permsArray.includes(r.id));
      setRolePerms(pMap);
    }
  };

  const handleSavePerms = async () => {
    if (!selectedRole) return;
    setSaving(true);
    const permsArray = Object.keys(rolePerms).filter(k => rolePerms[k]);
    try {
      await API.post('/settings', { [`role_perms_${selectedRole}`]: permsArray });
      setMsg({ type: 'success', text: `تم حفظ صلاحيات دور ${selectedRole} بنجاح` });
      load(); // Reload settings
    } catch (e) {
      setMsg({ type: 'error', text: 'حدث خطأ أثناء حفظ الصلاحيات' });
    }
    setSaving(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await API.post('/settings', {
        siteName: settings.siteName,
        maintenanceMode: settings.maintenanceMode.toString(),
        autoApproveTransactions: settings.autoApproveTransactions.toString(),
        maxDailyLimit: settings.maxDailyLimit.toString()
      });
      setMsg({ type: 'success', text: 'تم حفظ إعدادات النظام بنجاح' });
    } catch (e) {
      setMsg({ type: 'error', text: 'حدث خطأ أثناء حفظ الإعدادات' });
    }
    setSaving(false);
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('إعدادات النظام')}</h1>
          <p className="page-subtitle">{t('إدارة الإعدادات العامة للمنصة وقواعد البيانات')}</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-title">{t('الإعدادات العامة')}</span>
            <FiSettings color="var(--text-muted)" />
          </div>

          {msg && (
            <div className={`login-error`} style={msg.type === 'success' ? { background:'var(--success-bg)', borderColor:'var(--success)', color:'var(--success)' } : {}}>
              {msg.text}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">{t('اسم المنصة')}</label>
            <input className="form-input" value={settings.siteName} 
              onChange={e => setSettings({...settings, siteName: e.target.value})} />
          </div>

          <div className="form-group">
            <label className="form-label">{t('الحد الأقصى للتحويل اليومي (د.ج)')}</label>
            <input className="form-input" type="number" value={settings.maxDailyLimit} 
              onChange={e => setSettings({...settings, maxDailyLimit: Number(e.target.value)})} />
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', margin: '20px 0' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{t('وضع الصيانة')}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('إيقاف جميع العمليات للمستخدمين')}</div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" checked={settings.maintenanceMode} onChange={e => setSettings({...settings, maintenanceMode: e.target.checked})} style={{ marginRight: 8 }} />
              <span style={{ fontSize: 14 }}>{settings.maintenanceMode ? 'مفعل' : 'معطل'}</span>
            </label>
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0 12px 0', borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{t('الموافقة التلقائية')}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('قبول التحويلات تلقائياً دون مراجعة')}</div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" checked={settings.autoApproveTransactions} onChange={e => setSettings({...settings, autoApproveTransactions: e.target.checked})} style={{ marginRight: 8 }} />
              <span style={{ fontSize: 14 }}>{settings.autoApproveTransactions ? 'مفعل' : 'معطل'}</span>
            </label>
          </div>

          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner" style={{width:16,height:16,borderWidth:2}} /> : <><FiSave size={14} style={{marginLeft:4}}/>{t('حفظ الإعدادات')}</>}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card">
            <div className="card-header">
              <span className="card-title">{t('قاعدة البيانات')}</span>
              <FiDatabase color="var(--text-muted)" />
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>{t('النسخ الاحتياطي لقاعدة البيانات واستعادة البيانات السابقة.')}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>{t('إنشاء نسخة احتياطية')}</button>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">{t('صلاحيات المستخدمين')}</span>
              <FiLock color="var(--text-muted)" />
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>{t('تحديد الصفحات التي يمكن لكل دور الوصول إليها (يطبق على كل المستخدمين من نفس الدور).')}</p>
            
            <div className="form-group">
              <label className="form-label">{t('اختر الدور')}</label>
              <select className="form-select" value={selectedRole} onChange={handleRoleSelect}>
                <option value="">-- اختر دوراً --</option>
                {roles.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {selectedRole && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16, background: 'var(--bg-input)', padding: 12, borderRadius: 8 }}>
                  {availableRoutes.map(r => (
                    <label key={r.id} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: 13 }}>
                      <input type="checkbox" checked={rolePerms[r.id] || false} 
                        onChange={e => setRolePerms({...rolePerms, [r.id]: e.target.checked})} 
                        style={{ marginRight: 8 }} />
                      <span>{r.name}</span>
                    </label>
                  ))}
                </div>
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleSavePerms} disabled={saving}>{t('حفظ الصلاحيات')}</button>
              </>
            )}
          </div>

          <div className="card" style={{ borderColor: 'var(--danger)' }}>
            <div className="card-header">
              <span className="card-title" style={{ color: 'var(--danger)' }}>{t('المنطقة الخطرة')}</span>
              <FiLock color="var(--danger)" />
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>{t('هذه الإجراءات لا يمكن التراجع عنها، يرجى الحذر.')}</p>
            <button className="btn btn-danger" style={{ width: '100%', justifyContent: 'center' }}>
              مسح جميع السجلات (Reset)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
