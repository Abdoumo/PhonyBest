import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../redux/authSlice';
import API from '../api/axios';
import {
  FiHome, FiZap, FiWifi, FiCreditCard, FiGift, FiUsers,
  FiPercent, FiArrowUpRight, FiPackage, FiBarChart2, FiImage,
  FiSettings, FiSearch, FiBell, FiLogOut, FiMoon, FiSun, FiFileText, FiList
} from 'react-icons/fi';

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
    { to: '/settings', icon: FiSettings, label: 'الإعدادات' },
  ]},
];

export default function Layout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector(s => s.auth);

  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [globalSettings, setGlobalSettings] = useState(null);

  useEffect(() => {
    API.get('/settings').then(res => {
      setGlobalSettings(res.data.settings || {});
    }).catch(e => console.error(e));
  }, []);

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
      <aside className="sidebar">
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
              if (perms.length > 0) return perms.includes(id);

              // Check if we have global dynamic role permissions
              if (globalSettings && globalSettings[`role_perms_${user?.role}`]) {
                const rolePerms = globalSettings[`role_perms_${user.role}`];
                const parsed = Array.isArray(rolePerms) ? rolePerms : JSON.parse(rolePerms || '[]');
                return parsed.includes(id);
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
                <div className="nav-section-title">{section.section}</div>
                {filteredItems.map(item => (
                  <NavLink to={item.to} key={item.to}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <item.icon /> {item.label}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
        <div style={{ padding:'12px 8px', borderTop:'1px solid var(--border)' }}>
          <div className="nav-item" onClick={handleLogout}
            style={{ color:'var(--danger)' }}>
            <FiLogOut /> تسجيل الخروج
          </div>
        </div>
      </aside>

      <div className="main-content">
        <header className="header">
          <div className="header-left">
            <div className="header-search">
              <FiSearch />
              <input placeholder="ابحث عن أي شيء..." />
            </div>
          </div>
          <div className="header-right">
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
          <Outlet />
        </main>
      </div>
    </div>
  );
}
