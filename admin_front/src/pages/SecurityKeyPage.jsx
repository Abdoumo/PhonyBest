import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import API from '../api/axios';
import {
  FiShield, FiDownload, FiRefreshCw, FiTrash2, FiKey, FiHardDrive,
  FiCheckCircle, FiXCircle, FiActivity, FiAlertTriangle,
  FiUser, FiLock
} from 'react-icons/fi';
import { useLanguage } from '../contexts/LanguageContext';

export default function SecurityKeyPage() {
  const { t } = useLanguage();
  const { user } = useSelector(s => s.auth);
  const isAdmin = user?.role === 'ADMIN';

  const [keys, setKeys] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [myKey, setMyKey] = useState(null);
  const [mySessions, setMySessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [users, setUsers] = useState([]);
  const [toast, setToast] = useState(null);
  const [tab, setTab] = useState('my-key');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        const [keysRes, sessionsRes, usersRes, myKeyRes, mySessRes] = await Promise.all([
          API.get('/usb-auth/keys'),
          API.get('/usb-auth/sessions'),
          API.get('/users'),
          API.get('/usb-auth/my-key'),
          API.get('/usb-auth/my-session'),
        ]);
        setKeys(keysRes.data.keys || []);
        setSessions(sessionsRes.data.sessions || []);
        setUsers(usersRes.data.users || []);
        setMyKey(myKeyRes.data.key);
        setMySessions(mySessRes.data.sessions || []);
      } else {
        const [keyRes, sessRes] = await Promise.all([
          API.get('/usb-auth/my-key'),
          API.get('/usb-auth/my-session'),
        ]);
        setMyKey(keyRes.data.key);
        setMySessions(sessRes.data.sessions || []);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        if (isAdmin) {
          const [resGlob, resMy] = await Promise.all([
            API.get('/usb-auth/sessions'),
            API.get('/usb-auth/my-session')
          ]);
          setSessions(resGlob.data.sessions || []);
          setMySessions(resMy.data.sessions || []);
        } else {
          const res = await API.get('/usb-auth/my-session');
          setMySessions(res.data.sessions || []);
        }
      } catch (err) { /* silent */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  const downloadFile = (fileContent) => {
    const blob = new Blob([fileContent], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'security.auth';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Admin: generate for selected user
  const handleAdminGenerate = async () => {
    if (!selectedUser) return;
    setGenerating(true);
    try {
      const res = await API.post('/usb-auth/generate-key', { user_id: parseInt(selectedUser) });
      if (res.data.success) {
        downloadFile(res.data.file_content);
        showToast(t('تم إنشاء مفتاح الأمان بنجاح'));
        fetchData();
      }
    } catch (err) {
      showToast(err.response?.data?.error || t('فشل في إنشاء المفتاح'), 'error');
    } finally {
      setGenerating(false);
    }
  };

  // Self: generate for own profile
  const handleSelfGenerate = async () => {
    setGenerating(true);
    try {
      const res = await API.post('/usb-auth/generate-my-key');
      if (res.data.success) {
        downloadFile(res.data.file_content);
        showToast(t('تم إنشاء مفتاح الأمان بنجاح'));
        fetchData();
      }
    } catch (err) {
      showToast(err.response?.data?.error || t('فشل في إنشاء المفتاح'), 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleSelfRevoke = async () => {
    if (!window.confirm(t('هل أنت متأكد من إلغاء مفتاح الأمان الخاص بك؟ (سيعطل المصادقة الثنائية)'))) return;
    try {
      await API.post('/usb-auth/revoke-my-key');
      showToast(t('تم إلغاء المفتاح بنجاح'));
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.error || t('فشل في الإلغاء'), 'error');
    }
  };

  const handleSelfResetSerial = async () => {
    if (!window.confirm(t('هل أنت متأكد من إعادة تعيين الرقم التسلسلي لـ USB الخاص بك؟'))) return;
    try {
      await API.post('/usb-auth/reset-my-serial');
      showToast(t('تم إعادة تعيين الرقم التسلسلي'));
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.error || t('فشل في إعادة التعيين'), 'error');
    }
  };

  const handleRevoke = async (userId) => {
    if (!window.confirm(t('هل أنت متأكد من إلغاء هذا المفتاح؟'))) return;
    try {
      await API.post('/usb-auth/revoke', { user_id: userId });
      showToast(t('تم إلغاء المفتاح بنجاح'));
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.error || t('فشل في الإلغاء'), 'error');
    }
  };

  const handleResetSerial = async (userId) => {
    if (!window.confirm(t('هل أنت متأكد من إعادة تعيين الرقم التسلسلي؟'))) return;
    try {
      await API.post('/usb-auth/reset-serial', { user_id: userId });
      showToast(t('تم إعادة تعيين الرقم التسلسلي'));
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.error || t('فشل في إعادة التعيين'), 'error');
    }
  };

  const activeSessionCount = isAdmin ? sessions.filter(s => s.status === 'active').length : mySessions.filter(s => s.status === 'active').length;
  const activeKeyCount = isAdmin ? keys.filter(k => k.status === 'active').length : (myKey?.status === 'active' ? 1 : 0);

  return (
    <div className="usb-auth-page">
      {toast && (
        <div className={`usb-toast ${toast.type}`}>
          {toast.type === 'success' ? <FiCheckCircle /> : <FiAlertTriangle />}
          <span>{toast.msg}</span>
        </div>
      )}

      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiShield size={22} color="#fff" />
            </div>
            {t('مفتاح أمان USB')}
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>
            {isAdmin ? t('إدارة مفاتيح المصادقة المادية عبر USB') : t('إدارة مفتاح المصادقة المادية الخاص بك')}
          </p>
        </div>
      </div>

      {isAdmin && (
        <div className="usb-stats-grid" style={{ marginBottom: 24 }}>
          <div className="usb-stat-card"><div className="usb-stat-icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}><FiKey size={20} /></div><div className="usb-stat-info"><span className="usb-stat-value">{activeKeyCount}</span><span className="usb-stat-label">{t('مفاتيح نشطة')}</span></div></div>
          <div className="usb-stat-card"><div className="usb-stat-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}><FiActivity size={20} /></div><div className="usb-stat-info"><span className="usb-stat-value">{activeSessionCount}</span><span className="usb-stat-label">{t('جلسات نشطة')}</span></div></div>
          <div className="usb-stat-card"><div className="usb-stat-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}><FiHardDrive size={20} /></div><div className="usb-stat-info"><span className="usb-stat-value">{keys.filter(k => k.usb_serial).length}</span><span className="usb-stat-label">{t('أجهزة مربوطة')}</span></div></div>
        </div>
      )}

      {/* Tabs Menu */}
      <div className="usb-tabs" style={{ marginBottom: 24 }}>
        <button className={`usb-tab ${tab === 'my-key' ? 'active' : ''}`} onClick={() => setTab('my-key')}><FiKey size={16} /> {t('مفتاحي')}</button>
        <button className={`usb-tab ${tab === 'my-sessions' ? 'active' : ''}`} onClick={() => setTab('my-sessions')}><FiActivity size={16} /> {t('سجل الجلسات')} ({mySessions.length})</button>
        {isAdmin && (
          <>
            <button className={`usb-tab ${tab === 'keys' ? 'active' : ''}`} onClick={() => setTab('keys')}><FiShield size={16} /> {t('إدارة المفاتيح')} ({keys.length})</button>
            <button className={`usb-tab ${tab === 'sessions' ? 'active' : ''}`} onClick={() => setTab('sessions')}><FiHardDrive size={16} /> {t('إدارة الجلسات')} ({sessions.length})</button>
          </>
        )}
        <button className="usb-tab-refresh" onClick={fetchData} title={t('تحديث')}><FiRefreshCw size={16} className={loading ? 'spin' : ''} /></button>
      </div>

      {/* Tab: My Key */}
      {tab === 'my-key' && (
        <>
          <div className="usb-generate-section">
            <div className="usb-generate-header">
              <FiKey size={18} />
              <h3>{t('مفتاح الأمان الخاص بي')}</h3>
            </div>
          {myKey ? (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
                <div><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t('الحالة')}: </span>
                  <span className={`usb-status-badge ${myKey.status}`}>
                    {myKey.status === 'active' ? <><FiCheckCircle size={12} /> {t('نشط')}</> : <><FiXCircle size={12} /> {t('ملغى')}</>}
                  </span>
                </div>
                <div><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t('USB')}: </span>
                  {myKey.usb_serial ? <code className="usb-serial-code">{myKey.usb_serial}</code> : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t('غير مربوط')}</span>}
                </div>
                <div><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t('تاريخ')}: </span>
                  <span style={{ fontSize: 12 }}>{new Date(myKey.created_at).toLocaleString('ar-DZ')}</span>
                </div>
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>{t('لم يتم إنشاء مفتاح بعد. انقر على الزر أدناه لإنشاء مفتاح أمان USB.')}</p>
          )}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button className="btn btn-primary" onClick={handleSelfGenerate} disabled={generating} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {generating ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <FiDownload size={16} />}
              {myKey ? t('إعادة إنشاء وتنزيل') : t('إنشاء وتنزيل')}
            </button>
            {myKey && myKey.status === 'active' && (
              <>
                {myKey.usb_serial && (
                  <button className="btn btn-warning" onClick={handleSelfResetSerial} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FiRefreshCw size={16} /> {t('إعادة تعيين USB')}
                  </button>
                )}
                <button className="btn btn-danger" onClick={handleSelfRevoke} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FiTrash2 size={16} /> {t('إلغاء الأمان')}
                </button>
              </>
            )}
          </div>
          </div>

          {/* Instructions */}
          <div className="usb-instructions" style={{ marginTop: 24 }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}><FiLock size={18} /> {t('كيفية الاستخدام')}</h3>
            <div className="usb-steps">
              <div className="usb-step"><div className="usb-step-number">1</div><div><strong>{t('إنشاء المفتاح')}</strong><p>{t('انقر على "إنشاء وتنزيل" لتحميل ملف security.auth')}</p></div></div>
              <div className="usb-step"><div className="usb-step-number">2</div><div><strong>{t('نقل إلى USB')}</strong><p>{t('ضع ملف security.auth في المجلد الرئيسي لذاكرة USB')}</p></div></div>
              <div className="usb-step"><div className="usb-step-number">3</div><div><strong>{t('تشغيل العميل')}</strong><p>{t('قم بتشغيل usb_auth_client.py على الحاسوب')}</p></div></div>
              <div className="usb-step"><div className="usb-step-number">4</div><div><strong>{t('إدخال USB')}</strong><p>{t('أدخل USB وسيتم المصادقة تلقائيًا')}</p></div></div>
            </div>
          </div>
        </>
      )}

      {/* Tab: My Sessions */}
      {tab === 'my-sessions' && (
      <div className="usb-table-wrapper" style={{ borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: 24 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <FiActivity size={16} /> {t('سجل الجلسات')}
        </div>
        <table className="data-table">
          <thead><tr><th>{t('معرف الجلسة')}</th><th>{t('USB')}</th><th>{t('الحالة')}</th><th>{t('آخر نبضة')}</th><th>{t('بدأت في')}</th></tr></thead>
          <tbody>
            {mySessions.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>{t('لا توجد جلسات')}</td></tr>
            ) : mySessions.map((s, i) => (
              <tr key={s.session_id || i}>
                <td><code style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.session_id?.substring(0, 16)}...</code></td>
                <td><code className="usb-serial-code">{s.usb_serial}</code></td>
                <td><span className={`usb-status-badge ${s.status === 'active' ? 'active' : 'expired'}`}>{s.status === 'active' ? <><FiCheckCircle size={12} /> {t('نشط')}</> : <><FiXCircle size={12} /> {t('منتهي')}</>}</span></td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.last_heartbeat ? new Date(s.last_heartbeat).toLocaleTimeString('ar-DZ') : '—'}</td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(s.created_at).toLocaleString('ar-DZ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {/* Admin Tabs Content */}
      {
    isAdmin && tab === 'keys' && (
      <>
        {/* Generate for any user (admin) */}
        <div className="usb-generate-section">
          <div className="usb-generate-header"><FiDownload size={18} /><h3>{t('إنشاء مفتاح أمان جديد')}</h3></div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>{t('اختر مستخدمًا لإنشاء ملف security.auth. يجب وضع الملف في ذاكرة USB.')}</p>
          <div className="usb-generate-controls">
            <select className="form-input" value={selectedUser} onChange={e => setSelectedUser(e.target.value)} style={{ flex: 1, maxWidth: 350 }}>
              <option value="">{t('اختر مستخدمًا...')}</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.username} ({u.role}) — ID: {u.id}</option>)}
            </select>
            <button className="btn btn-primary" onClick={handleAdminGenerate} disabled={!selectedUser || generating} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {generating ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <FiDownload size={16} />}
              {t('إنشاء وتنزيل')}
            </button>
          </div>
        </div>

        <div className="usb-table-wrapper" style={{ marginTop: 24 }}>
            <table className="data-table">
              <thead><tr><th>{t('المستخدم')}</th><th>{t('الدور')}</th><th>{t('USB')}</th><th>{t('الحالة')}</th><th>{t('تاريخ')}</th><th>{t('إجراءات')}</th></tr></thead>
              <tbody>
                {keys.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}><FiKey size={32} style={{ opacity: 0.3, display: 'block', margin: '0 auto 8px' }} />{t('لا توجد مفاتيح مسجلة')}</td></tr>
                ) : keys.map(key => (
                  <tr key={key.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-card-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600 }}>{key.username?.charAt(0).toUpperCase()}</div>
                        <div><div style={{ fontWeight: 500 }}>{key.full_name || key.username}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>@{key.username}</div></div>
                      </div>
                    </td>
                    <td><span className={`usb-role-badge role-${key.role?.toLowerCase()}`}>{key.role}</span></td>
                    <td>{key.usb_serial ? <code className="usb-serial-code">{key.usb_serial}</code> : <span style={{ color: 'var(--text-muted)', fontSize: 12, fontStyle: 'italic' }}>{t('غير مربوط')}</span>}</td>
                    <td><span className={`usb-status-badge ${key.status}`}>{key.status === 'active' ? <><FiCheckCircle size={12} /> {t('نشط')}</> : <><FiXCircle size={12} /> {t('ملغى')}</>}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(key.created_at).toLocaleString('ar-DZ')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {key.usb_serial && <button className="usb-action-btn reset" onClick={() => handleResetSerial(key.user_id)} title={t('إعادة تعيين')}><FiRefreshCw size={14} /></button>}
                        {key.status === 'active' && <button className="usb-action-btn danger" onClick={() => handleRevoke(key.user_id)} title={t('إلغاء')}><FiTrash2 size={14} /></button>}
                        <button className="usb-action-btn download" onClick={async () => { try { const res = await API.post('/usb-auth/generate-key', { user_id: key.user_id }); if (res.data.success) { downloadFile(res.data.file_content); showToast(t('تم تنزيل المفتاح')); fetchData(); } } catch (err) { showToast(err.response?.data?.error || t('فشل'), 'error'); } }} title={t('تنزيل')}><FiDownload size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {isAdmin && tab === 'sessions' && (
        <div className="usb-table-wrapper">
            <table className="data-table">
              <thead><tr><th>{t('المستخدم')}</th><th>{t('الجلسة')}</th><th>{t('USB')}</th><th>{t('الحالة')}</th><th>{t('نبضة')}</th><th>{t('بدأت')}</th></tr></thead>
              <tbody>
                {sessions.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>{t('لا توجد جلسات')}</td></tr>
                ) : sessions.map((s, i) => (
                  <tr key={s.session_id || i}>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FiUser size={14} /><span style={{ fontWeight: 500 }}>{s.full_name || s.username}</span></div></td>
                    <td><code style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.session_id?.substring(0, 16)}...</code></td>
                    <td><code className="usb-serial-code">{s.usb_serial}</code></td>
                    <td><span className={`usb-status-badge ${s.status === 'active' ? 'active' : 'expired'}`}>{s.status === 'active' ? <><FiCheckCircle size={12} /> {t('نشط')}</> : <><FiXCircle size={12} /> {t('منتهي')}</>}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.last_heartbeat ? new Date(s.last_heartbeat).toLocaleTimeString('ar-DZ') : '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(s.created_at).toLocaleString('ar-DZ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

    </div>
  );
}
