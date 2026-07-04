import { useState, useEffect, useCallback } from 'react';
import API from '../api/axios';
import { useLanguage } from '../contexts/LanguageContext';
import {
  FiServer, FiCpu, FiDollarSign, FiClock, FiPlus, FiTrash2,
  FiRefreshCw, FiWifi, FiWifiOff, FiCopy, FiX, FiActivity,
  FiAlertCircle, FiCheckCircle, FiInfo, FiKey
} from 'react-icons/fi';
import { io as socketIO } from 'socket.io-client';

const balanceClass = (b) => {
  if (b == null) return '';
  if (b >= 50) return 'high';
  if (b >= 20) return 'medium';
  return 'low';
};

const operatorClass = (op) => {
  if (!op) return 'unknown';
  const o = op.toLowerCase();
  if (o.includes('mobilis')) return 'mobilis';
  if (o.includes('djezzy')) return 'djezzy';
  if (o.includes('ooredoo')) return 'ooredoo';
  if (o.includes('idoom')) return 'idoom';
  return 'unknown';
};

const eventIcon = (type) => {
  switch (type) {
    case 'connected': return { icon: FiWifi, cls: 'connected' };
    case 'disconnected': return { icon: FiWifiOff, cls: 'disconnected' };
    case 'created': return { icon: FiPlus, cls: 'created' };
    case 'deleted': return { icon: FiTrash2, cls: 'disconnected' };
    default: return { icon: FiInfo, cls: 'default' };
  }
};

const formatTime = (dateStr) => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffMins < 1) return 'الآن';
  if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  return date.toLocaleDateString('ar-DZ') + ' ' + date.toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' });
};

export default function ModemGridPage() {
  const { t } = useLanguage();
  const [tab, setTab] = useState('nodes');
  const [stats, setStats] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [dongles, setDongles] = useState([]);
  const [pools, setPools] = useState([]);
  const [events, setEvents] = useState([]);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(null);
  const [newNodeName, setNewNodeName] = useState('');
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, nodesRes, donglesRes, poolsRes, eventsRes, queueRes] = await Promise.all([
        API.get('/wss/stats'),
        API.get('/wss/nodes'),
        API.get('/wss/dongles'),
        API.get('/wss/pools'),
        API.get('/wss/events?limit=50'),
        API.get('/wss/queue'),
      ]);
      setStats(statsRes.data.stats);
      setNodes(nodesRes.data.nodes || []);
      setDongles(donglesRes.data.dongles || []);
      setPools(poolsRes.data.pools || []);
      setEvents(eventsRes.data.events || []);
      setQueue(queueRes.data.queue || []);
    } catch (e) {
      console.error('ModemGrid fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [fetchData]);

  // Real-time Socket.IO updates
  useEffect(() => {
    const socket = socketIO(import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000', { transports: ['websocket', 'polling'] });
    socket.on('connect', () => socket.emit('join_admin'));

    socket.on('wss_node_connected', () => fetchData());
    socket.on('wss_node_disconnected', () => fetchData());
    socket.on('wss_node_status', () => fetchData());
    socket.on('wss_request_result', () => fetchData());

    return () => socket.disconnect();
  }, [fetchData]);

  const handleCreateNode = async () => {
    if (!newNodeName.trim()) return;
    setCreating(true);
    try {
      const res = await API.post('/wss/nodes', { name: newNodeName.trim() });
      setShowAddModal(false);
      setNewNodeName('');
      setShowTokenModal(res.data);
      fetchData();
    } catch (e) {
      alert(e.response?.data?.error || 'Error creating node');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteNode = async (id) => {
    if (!window.confirm(t('هل تريد حذف هذا الجهاز؟'))) return;
    try {
      await API.delete(`/wss/nodes/${id}`);
      fetchData();
    } catch (e) {
      alert('Error deleting node');
    }
  };

  const handleRegenerateToken = async (id) => {
    if (!window.confirm(t('هل تريد تجديد التوكن؟ سيتم قطع الاتصال الحالي.'))) return;
    try {
      const res = await API.put(`/wss/nodes/${id}/regenerate-token`);
      setShowTokenModal(res.data);
    } catch (e) {
      alert('Error regenerating token');
    }
  };

  const copyToken = (token) => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  const s = stats || {};

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">📡 {t('إدارة ModemGrid')}</h1>
          <p className="page-subtitle">{t('مراقبة وإدارة أجهزة ModemGrid المتصلة')}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={fetchData}>
            <FiRefreshCw size={14} /> {t('تحديث')}
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <FiPlus size={14} /> {t('إضافة جهاز')}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mg-stats-grid">
        <div className={`mg-stat-card ${s.onlineNodes > 0 ? 'online' : ''}`}>
          <div className="mg-stat-header">
            <span className="mg-stat-label">{t('الأجهزة المتصلة')}</span>
            <div className="mg-stat-icon" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
              <FiServer />
            </div>
          </div>
          <div className="mg-stat-value">{s.onlineNodes || 0} <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>/ {s.totalNodes || 0}</span></div>
          <div className="mg-stat-sub">{s.onlineNodes > 0 ? '🟢 ' + t('متصل') : '🔴 ' + t('غير متصل')}</div>
        </div>

        <div className="mg-stat-card">
          <div className="mg-stat-header">
            <span className="mg-stat-label">{t('المودمات')}</span>
            <div className="mg-stat-icon" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
              <FiCpu />
            </div>
          </div>
          <div className="mg-stat-value">{s.onlineDongles || 0} <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>/ {s.totalDongles || 0}</span></div>
          <div className="mg-stat-sub">{t('مودم نشط')}</div>
        </div>

        <div className={`mg-stat-card ${(s.totalBalance || 0) < 100 ? 'warning' : ''}`}>
          <div className="mg-stat-header">
            <span className="mg-stat-label">{t('الرصيد الإجمالي')}</span>
            <div className="mg-stat-icon" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
              <FiDollarSign />
            </div>
          </div>
          <div className="mg-stat-value">{(s.totalBalance || 0).toFixed(2)} <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>DA</span></div>
          <div className="mg-stat-sub">{t('رصيد جميع المودمات')}</div>
        </div>

        <div className="mg-stat-card">
          <div className="mg-stat-header">
            <span className="mg-stat-label">{t('طلبات قيد الانتظار')}</span>
            <div className="mg-stat-icon" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>
              <FiClock />
            </div>
          </div>
          <div className="mg-stat-value">{s.pendingRequests || 0}</div>
          <div className="mg-stat-sub">{t('في الطابور')}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mg-tabs">
        {[
          { id: 'nodes', label: t('الأجهزة'), icon: FiServer },
          { id: 'dongles', label: t('المودمات'), icon: FiCpu },
          { id: 'pools', label: t('المجموعات'), icon: FiActivity },
          { id: 'queue', label: t('الطابور'), icon: FiClock },
          { id: 'events', label: t('السجل'), icon: FiAlertCircle },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} className={`mg-tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
            <Icon size={14} style={{ marginInlineEnd: 6, verticalAlign: 'middle' }} />
            {label}
            {id === 'queue' && queue.length > 0 && (
              <span style={{ marginInlineStart: 6, background: 'var(--danger)', color: '#fff', borderRadius: '50%', width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                {queue.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'nodes' && (
        <div>
          {nodes.length === 0 ? (
            <div className="mg-empty-state">
              <FiServer size={48} />
              <p>{t('لا توجد أجهزة مسجلة')}</p>
              <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                <FiPlus size={14} /> {t('إضافة جهاز')}
              </button>
            </div>
          ) : (
            <div className="mg-node-grid">
              {nodes.map(node => (
                <div className="mg-node-card" key={node.id}>
                  <div className="mg-node-card-header">
                    <div className="mg-node-info">
                      <span className={`mg-status-dot ${node.status}`} />
                      <div>
                        <div className="mg-node-name">{node.name}</div>
                        <div className="mg-node-ip">{node.ip_address || '—'}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleRegenerateToken(node.id)} title={t('تجديد التوكن')}>
                        <FiKey size={12} />
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeleteNode(node.id)} title={t('حذف')}>
                        <FiTrash2 size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="mg-node-card-body">
                    <div className="mg-node-stat">
                      <div className="mg-node-stat-value">{node.dongle_count || 0}</div>
                      <div className="mg-node-stat-label">{t('مودمات')}</div>
                    </div>
                    <div className="mg-node-stat">
                      <div className="mg-node-stat-value" style={{ color: 'var(--success)' }}>{node.online_count || 0}</div>
                      <div className="mg-node-stat-label">{t('نشط')}</div>
                    </div>
                    <div className="mg-node-stat">
                      <div className="mg-node-stat-value" style={{ color: node.status === 'online' ? 'var(--success)' : 'var(--text-muted)' }}>
                        {node.status === 'online' ? '●' : '○'}
                      </div>
                      <div className="mg-node-stat-label">{t(node.status === 'online' ? 'متصل' : 'غير متصل')}</div>
                    </div>
                  </div>
                  <div className="mg-node-card-footer">
                    <span>{t('آخر اتصال')}: {formatTime(node.last_seen)}</span>
                    <span>ID: {node.id}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'dongles' && (
        <div className="table-wrapper">
          <div className="table-header">
            <div className="table-title">{t('جميع المودمات')} ({dongles.length})</div>
          </div>
          {dongles.length === 0 ? (
            <div className="mg-empty-state">
              <FiCpu size={48} />
              <p>{t('لا توجد مودمات متصلة')}</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>{t('المودم')}</th>
                  <th>{t('الجهاز')}</th>
                  <th>{t('المشغل')}</th>
                  <th>{t('الحالة')}</th>
                  <th>{t('الرصيد')}</th>
                  <th>{t('المجموعات')}</th>
                </tr>
              </thead>
              <tbody>
                {dongles.map((d, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{d.name || d.dongle_id}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{d.node_name}</td>
                    <td>
                      <span className={`mg-dongle-operator ${operatorClass(d.operator)}`}>
                        {d.operator || 'Unknown'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge-status ${d.online ? 'success' : 'danger'}`}>
                        <span className={`mg-status-dot ${d.online ? 'online' : 'offline'}`} style={{ width: 6, height: 6 }} />
                        {d.online ? t('نشط') : t('غير نشط')}
                      </span>
                    </td>
                    <td>
                      <span className={`mg-balance ${balanceClass(d.balance != null ? parseFloat(d.balance) : null)}`}>
                        {d.balance != null ? parseFloat(d.balance).toFixed(2) + ' DA' : '—'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      {d.pool_ids?.length > 0 ? d.pool_ids.join(', ') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'pools' && (
        <div className="table-wrapper">
          <div className="table-header">
            <div className="table-title">{t('مجموعات المودمات')} ({pools.length})</div>
          </div>
          {pools.length === 0 ? (
            <div className="mg-empty-state">
              <FiActivity size={48} />
              <p>{t('لا توجد مجموعات')}</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>{t('المجموعة')}</th>
                  <th>{t('الجهاز')}</th>
                  <th>{t('المودمات')}</th>
                  <th>{t('نشط')}</th>
                  <th>{t('الرصيد')}</th>
                  <th>{t('أعلى رصيد')}</th>
                  <th>{t('APIs')}</th>
                </tr>
              </thead>
              <tbody>
                {pools.map((p, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{p.node_name}</td>
                    <td>{p.dongle_count}</td>
                    <td><span style={{ color: 'var(--success)', fontWeight: 600 }}>{p.online_count}</span></td>
                    <td>
                      <span className={`mg-balance ${balanceClass(parseFloat(p.total_balance))}`}>
                        {parseFloat(p.total_balance).toFixed(2)} DA
                      </span>
                    </td>
                    <td>{parseFloat(p.highest_balance).toFixed(2)} DA</td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.api_names?.join(', ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'queue' && (
        <div className="table-wrapper">
          <div className="table-header">
            <div className="table-title">{t('طابور الطلبات')} ({queue.length})</div>
          </div>
          {queue.length === 0 ? (
            <div className="mg-empty-state">
              <FiCheckCircle size={48} />
              <p>{t('لا توجد طلبات في الانتظار')}</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t('API')}</th>
                  <th>{t('المتغيرات')}</th>
                  <th>{t('الجهاز')}</th>
                  <th>{t('الحالة')}</th>
                  <th>{t('التاريخ')}</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((q, i) => (
                  <tr key={i}>
                    <td>{q.id}</td>
                    <td style={{ fontWeight: 600 }}>{q.api_name}</td>
                    <td style={{ fontSize: 11, fontFamily: 'monospace', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {JSON.stringify(q.variables)}
                    </td>
                    <td>{q.node_name || '—'}</td>
                    <td>
                      <span className={`badge-status ${q.status === 'sent' ? 'warning' : 'pending'}`}>
                        {q.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatTime(q.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'events' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">{t('سجل الأحداث')}</div>
          </div>
          {events.length === 0 ? (
            <div className="mg-empty-state">
              <FiAlertCircle size={48} />
              <p>{t('لا توجد أحداث')}</p>
            </div>
          ) : (
            <div className="mg-events-list">
              {events.map((ev, i) => {
                const { icon: Icon, cls } = eventIcon(ev.event_type);
                return (
                  <div className="mg-event-item" key={i}>
                    <div className={`mg-event-icon ${cls}`}>
                      <Icon size={14} />
                    </div>
                    <div className="mg-event-message">
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ev.node_name || 'System'}</span>
                      {' — '}
                      {ev.message}
                    </div>
                    <div className="mg-event-time">{formatTime(ev.created_at)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Node Modal */}
      {showAddModal && (
        <div className="mg-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="mg-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>🖥️ {t('إضافة جهاز جديد')}</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <FiX size={20} />
              </button>
            </div>
            <div className="form-group">
              <label className="form-label">{t('اسم الجهاز')}</label>
              <input
                className="form-input"
                placeholder={t('مثال: Node A - Mobilis')}
                value={newNodeName}
                onChange={e => setNewNodeName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateNode()}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>{t('إلغاء')}</button>
              <button className="btn btn-primary" onClick={handleCreateNode} disabled={creating || !newNodeName.trim()}>
                {creating ? '...' : <><FiPlus size={14} /> {t('إنشاء')}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Token Display Modal */}
      {showTokenModal && (
        <div className="mg-modal-overlay" onClick={() => setShowTokenModal(null)}>
          <div className="mg-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>🔑 {t('توكن الجهاز')}</h3>
              <button onClick={() => setShowTokenModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <FiX size={20} />
              </button>
            </div>
            <div style={{ background: 'var(--warning-bg)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--warning)' }}>
              ⚠️ {t('احفظ هذا التوكن — لن يظهر مرة أخرى!')}
            </div>
            <div className="mg-token-display">
              {showTokenModal.token}
              <button className="copy-btn" onClick={() => copyToken(showTokenModal.token)}>
                {copied ? <><FiCheckCircle size={10} /> {t('تم')}</> : <><FiCopy size={10} /> {t('نسخ')}</>}
              </button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 16 }}>
              {t('استخدم هذا التوكن في إعدادات ModemGrid PRO:')}
              <br />
              <code style={{ background: 'var(--bg-input)', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>
                WSS Token: {showTokenModal.token?.substring(0, 20)}...
              </code>
            </p>
            <button className="btn btn-primary" onClick={() => setShowTokenModal(null)} style={{ width: '100%', justifyContent: 'center' }}>
              {t('فهمت، تم الحفظ')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
