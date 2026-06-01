import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../redux/authSlice';
import API from '../api/axios';
import UsbSessionGuard from '../components/UsbSessionGuard';
import {
  FiHome, FiZap, FiWifi, FiCreditCard, FiGift, FiUsers,
  FiPercent, FiArrowUpRight, FiPackage, FiBarChart2, FiImage,
  FiSettings, FiSearch, FiBell, FiLogOut, FiMoon, FiSun, FiFileText, FiList, FiMenu, FiX, FiGlobe, FiShield
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
    { to: '/ads', icon: FiImage, label: 'الإعلانات' },
    { to: '/security-key', icon: FiShield, label: 'مفاتيح الأمان' },
    { to: '/settings', icon: FiSettings, label: 'الإعدادات' },
  ]},
];

export default function Layout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector(s => s.auth);
  const { lang, toggleLang, t } = useLanguage();

  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [globalSettings, setGlobalSettings] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const usbGuardEnabled = user?.usb_auth_required || (globalSettings?.usb_auth_enabled === 'true' || globalSettings?.usb_auth_enabled === true);

  useEffect(() => {
    API.get('/settings').then(res => {
      const settings = res.data.settings || {};
      setGlobalSettings(settings);
    }).catch(e => console.error(e));
  }, [user]);

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
          <div className="logo">⚡</div>
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
              if (id === 'dashboard') return true;
              
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
            <button className="header-btn">
              <FiBell size={16} />
              <span className="badge">3</span>
            </button>
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
