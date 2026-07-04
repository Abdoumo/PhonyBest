import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../redux/authSlice';
import API from '../api/axios';
import UsbSessionGuard from '../components/UsbSessionGuard';
import { io as socketIO } from 'socket.io-client';
import {
  FiHome, FiZap, FiWifi, FiCreditCard, FiGift, FiUsers,
  FiPercent, FiArrowUpRight, FiPackage, FiBarChart2, FiImage,
  FiSettings, FiSearch, FiBell, FiLogOut, FiMoon, FiSun, FiFileText, FiList, FiMenu, FiX, FiGlobe, FiShield,
  FiCheck, FiCheckCircle, FiTrash2, FiAlertCircle, FiInfo, FiAlertTriangle, FiRadio
} from 'react-icons/fi';
import { useLanguage } from '../contexts/LanguageContext';

const navItems = [
  { section: 'الرئيسية', items: [
    { to: '/dashboard', icon: FiHome, label: 'لوحة القيادة' },
  ]},
  { section: 'الخدمات', items: [
    { to: '/flexy', icon: FiZap, label: 'فليكسي' },
    { to: '/idoom', icon: FiWifi, label: 'أيدوم' },
    { to: '/cards', icon: FiCreditCard, label: 'إدارة البطاقات' },
    { to: '/card-orders', icon: FiFileText, label: 'طلبات البطاقات' },
  ]},
  { section: 'الإدارة', items: [
    { to: '/clients', icon: FiUsers, label: 'العملاء' },
    { to: '/transactions', icon: FiList, label: 'كل العمليات' },
    { to: '/commissions', icon: FiPercent, label: 'العمولات' },
    { to: '/transfers', icon: FiArrowUpRight, label: 'التحويلات' },
    { to: '/stock', icon: FiPackage, label: 'المخزون' },
  ]},
  { section: 'النظام', items: [
    { to: '/analytics', icon: FiBarChart2, label: 'التحليلات' },
    { to: '/modemgrid', icon: FiRadio, label: 'ModemGrid' },
    { to: '/ads', icon: FiImage, label: 'الإعلانات' },
    { to: '/security-key', icon: FiShield, label: 'مفاتيح الأمان' },
    { to: '/settings', icon: FiSettings, label: 'الإعدادات' },
  ]},
];

const notifTypeIcon = {
  info: FiInfo,
  success: FiCheckCircle,
  warning: FiAlertTriangle,
  error: FiAlertCircle,
};

const notifTypeColor = {
  info: 'var(--info, #6366f1)',
  success: 'var(--success, #10b981)',
  warning: 'var(--warning, #f59e0b)',
  error: 'var(--danger, #ef4444)',
};

export default function Layout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector(s => s.auth);
  const { lang, toggleLang, t } = useLanguage();

  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [globalSettings, setGlobalSettings] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Notifications state
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const notifRef = useRef(null);

  const usbGuardEnabled = user?.usb_auth_required || (globalSettings?.usb_auth_enabled === 'true' || globalSettings?.usb_auth_enabled === true);

  useEffect(() => {
    API.get('/settings').then(res => {
      const settings = res.data.settings || {};
      setGlobalSettings(settings);
    }).catch(e => console.error(e));
  }, [user]);

  // Fetch notifications
  const fetchNotifications = () => {
    API.get('/notifications')
      .then(res => {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  // Socket.io for real-time notifications
  useEffect(() => {
    if (!user?.id) return;

    const socket = socketIO('http://localhost:8000', { transports: ['websocket', 'polling'] });
    
    socket.on('connect', () => {
      socket.emit('join_room', user.id);
    });

    socket.on('new_notification', (notif) => {
      setNotifications(prev => [notif, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    return () => {
      socket.disconnect();
    };
  }, [user?.id]);

  // Close panel on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifPanel(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = () => {
    API.put('/notifications/read-all')
      .then(() => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      })
      .catch(() => {});
  };

  const handleClearAll = () => {
    API.delete('/notifications/clear')
      .then(() => {
        setNotifications([]);
        setUnreadCount(0);
      })
      .catch(() => {});
  };

  const handleDeleteOne = (id) => {
    API.delete(`/notifications/${id}`)
      .then(() => {
        setNotifications(prev => {
          const removed = prev.find(n => n.id === id);
          if (removed && !removed.read) setUnreadCount(c => Math.max(0, c - 1));
          return prev.filter(n => n.id !== id);
        });
      })
      .catch(() => {});
  };

  const handleMarkOneRead = (id) => {
    API.put(`/notifications/${id}/read`)
      .then(() => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        setUnreadCount(c => Math.max(0, c - 1));
      })
      .catch(() => {});
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('الآن');
    if (diffMins < 60) return `${t('منذ')} ${diffMins} ${t('دقيقة')}`;
    if (diffHours < 24) return `${t('منذ')} ${diffHours} ${t('ساعة')}`;
    if (diffDays < 7) return `${t('منذ')} ${diffDays} ${t('يوم')}`;
    return date.toLocaleDateString('ar-DZ');
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="app-layout">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setIsSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 45, backdropFilter: 'blur(2px)'
          }}
        />
      )}
      
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          {user?.logo_url ? (
            <img src={`${API.defaults.baseURL.replace('/api/v1', '')}${user.logo_url}`} alt="Logo" className="custom-logo" style={{ width: 40, height: 40, borderRadius: '8px', objectFit: 'cover', background: 'white' }} />
          ) : (
            <div className="logo">⚡</div>
          )}
          <h1>{user?.role === 'ADMIN' ? 'FLEXY GSM' : (user?.username || 'FLEXY GSM').toUpperCase()}</h1>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(section => {
            let perms = [];
            try {
              perms = user?.permissions ? JSON.parse(user.permissions) : [];
            } catch (e) {
              perms = [];
            }
            
            // Default roles
            const defaultRolePerms = {
              'SUPER_GRO': ['dashboard', 'flexy', 'idoom', 'cards', 'card-orders', 'clients', 'transfers', 'stock', 'transactions'],
              'GROSIST': ['dashboard', 'flexy', 'idoom', 'cards', 'transfers'],
              'COMMERCANT': ['dashboard', 'flexy', 'idoom', 'cards']
            };

            const canSee = (id) => {
              if (user?.role === 'ADMIN') return true;
              if (id === 'dashboard' || id === 'settings') return true;
              
              // If user has personal permissions, use those (override)
              if (perms.length > 0) return perms.includes(id) || (id === 'security-key' && perms.includes('usb-auth'));

              // Check if we have global dynamic role permissions
              if (globalSettings && globalSettings[`role_perms_${user?.role}`]) {
                const rolePerms = globalSettings[`role_perms_${user.role}`];
                const parsed = Array.isArray(rolePerms) ? rolePerms : JSON.parse(rolePerms || '[]');
                return parsed.includes(id) || (id === 'security-key' && parsed.includes('usb-auth'));
              }

              // Otherwise fallback to sensible defaults
              return defaultRolePerms[user?.role]?.includes(id) || false;
            };

            const filteredItems = section.items.filter(item => {
              const routeId = item.to.replace('/', '');
              return canSee(routeId);
            });

            if (filteredItems.length === 0) return null;

            return (
              <div className="nav-section" key={section.section}>
                <div className="nav-section-title">{t(section.section)}</div>
                {filteredItems.map(item => (
                  <NavLink to={item.to} key={item.to}
                    onClick={() => setIsSidebarOpen(false)}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <item.icon /> {t(item.label)}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
        <div style={{ padding:'12px 8px', borderTop:'1px solid var(--border)' }}>
          <div className="nav-item" onClick={handleLogout}
            style={{ color:'var(--danger)' }}>
            <FiLogOut /> {t('تسجيل الخروج')}
          </div>
        </div>
      </aside>

      <div className="main-content">
        <header className="header">
          <div className="header-left">
            <button className="header-btn mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>
              <FiMenu size={20} />
            </button>
            <div className="header-search">
              <FiSearch />
              <input placeholder={t('ابحث عن أي شيء...')} />
            </div>
          </div>
          <div className="header-right">
            <button className="header-btn" onClick={toggleLang} title={lang === 'ar' ? 'Français' : 'العربية'}>
              <FiGlobe size={16} />
              <span style={{ fontSize: '10px', fontWeight: 'bold', marginLeft: '4px' }}>
                {lang === 'ar' ? 'FR' : 'AR'}
              </span>
            </button>
            <button className="header-btn" onClick={toggleTheme}>
              {theme === 'dark' ? <FiSun size={16} /> : <FiMoon size={16} />}
            </button>
            
            {/* Notifications Bell */}
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button className="header-btn" onClick={() => setShowNotifPanel(prev => !prev)}>
                <FiBell size={16} />
                {unreadCount > 0 && (
                  <span className="badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
              </button>

              {/* Notifications Dropdown Panel */}
              {showNotifPanel && (
                <div className="notif-panel" style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  left: lang === 'ar' ? 0 : 'auto',
                  right: lang === 'ar' ? 'auto' : 0,
                  width: 380,
                  maxHeight: 480,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                  zIndex: 1000,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  animation: 'fadeIn 0.2s ease',
                }}>
                  {/* Panel Header */}
                  <div style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {t('الإشعارات')} {unreadCount > 0 && <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>({unreadCount})</span>}
                    </h3>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {unreadCount > 0 && (
                        <button onClick={handleMarkAllRead} title={t('تحديد الكل كمقروء')}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, transition: 'var(--transition)' }}
                          onMouseEnter={e => e.target.style.background = 'var(--bg-hover)'}
                          onMouseLeave={e => e.target.style.background = 'none'}>
                          <FiCheck size={13} /> {t('قراءة الكل')}
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <button onClick={handleClearAll} title={t('مسح الكل')}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, transition: 'var(--transition)' }}
                          onMouseEnter={e => e.target.style.background = 'var(--bg-hover)'}
                          onMouseLeave={e => e.target.style.background = 'none'}>
                          <FiTrash2 size={13} /> {t('مسح الكل')}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Notifications List */}
                  <div style={{ overflowY: 'auto', flex: 1 }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                        <FiBell size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
                        <p style={{ margin: 0, fontSize: 13 }}>{t('لا توجد إشعارات')}</p>
                      </div>
                    ) : (
                      notifications.map(n => {
                        const TypeIcon = notifTypeIcon[n.type] || FiInfo;
                        const typeColor = notifTypeColor[n.type] || notifTypeColor.info;
                        return (
                          <div key={n.id} style={{
                            padding: '12px 16px',
                            borderBottom: '1px solid var(--border)',
                            display: 'flex',
                            gap: 12,
                            alignItems: 'flex-start',
                            background: n.read ? 'transparent' : 'rgba(99, 102, 241, 0.05)',
                            cursor: 'pointer',
                            transition: 'var(--transition)',
                          }}
                          onClick={() => !n.read && handleMarkOneRead(n.id)}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                          onMouseLeave={e => e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(99, 102, 241, 0.05)'}>
                            {/* Icon */}
                            <div style={{
                              width: 36, height: 36, borderRadius: '50%',
                              background: `${typeColor}15`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0, marginTop: 2,
                            }}>
                              <TypeIcon size={16} style={{ color: typeColor }} />
                            </div>

                            {/* Content */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                                <p style={{ margin: 0, fontSize: 13, fontWeight: n.read ? 500 : 700, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                                  {n.title}
                                </p>
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteOne(n.id); }}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, flexShrink: 0, opacity: 0.5, transition: 'var(--transition)' }}
                                  onMouseEnter={e => { e.target.style.opacity = 1; e.target.style.color = 'var(--danger)'; }}
                                  onMouseLeave={e => { e.target.style.opacity = 0.5; e.target.style.color = 'var(--text-muted)'; }}>
                                  <FiX size={14} />
                                </button>
                              </div>
                              {n.message && (
                                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                  {n.message}
                                </p>
                              )}
                              <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                                {formatTime(n.created_at)}
                              </p>
                            </div>

                            {/* Unread dot */}
                            {!n.read && (
                              <div style={{
                                width: 8, height: 8, borderRadius: '50%',
                                background: 'var(--accent)', flexShrink: 0, marginTop: 8,
                              }} />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="user-menu">
              <div className="user-avatar">
                {user?.username?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div className="user-info">
                <div className="user-name">{user?.full_name || user?.username}</div>
                <div className="user-role">{user?.role}</div>
              </div>
            </div>
          </div>
        </header>
        <main className="page">
          <UsbSessionGuard enabled={usbGuardEnabled}>
            <Outlet />
          </UsbSessionGuard>
        </main>
      </div>
    </div>
  );
}

