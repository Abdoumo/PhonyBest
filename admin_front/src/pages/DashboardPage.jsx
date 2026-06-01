import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { FiDollarSign, FiActivity, FiAlertTriangle, FiCpu, FiUsers, FiTrendingUp } from 'react-icons/fi';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import API from '../api/axios';
import { useLanguage } from '../contexts/LanguageContext';

const mockChart = Array.from({ length: 30 }, (_, i) => ({
  date: `مايو ${i + 1}`,
  volume: Math.floor(Math.random() * 50000) + 10000,
  profit: Math.floor(Math.random() * 5000) + 1000,
}));

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ads, setAds] = useState([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const { t } = useLanguage();

  useEffect(() => {
    API.get('/dashboard/stats')
      .then(r => setStats(r.data))
      .catch(() => {
        setStats({
          stats: {
            todayEarnings: 45230,
            totalTransactions: 342,
            failedOperations: 7,
            activeSims: 12,
            totalUsers: 156,
            totalWalletBalance: 1250000,
          },
          recentTransactions: [],
          chartData: mockChart,
        });
      })
      .finally(() => setLoading(false));

    API.get('/ads')
      .then(r => setAds((r.data.ads || []).filter(a => a.active).sort((a,b) => a.display_order - b.display_order)))
      .catch(() => setAds([]));
  }, []);

  useEffect(() => {
    if (ads.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentAdIndex(prev => (prev + 1) % ads.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [ads]);

  const { user } = useSelector(s => s.auth);
  const isAdmin = user?.role === 'ADMIN';

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  const s = stats?.stats || {};
  const chart = stats?.chartData?.length ? stats.chartData : mockChart;

  const statCards = [
    { label: t("رصيدي الحالي"), value: isAdmin ? t('لا محدود') : `${(s.myWalletBalance || 0).toLocaleString()} ${t('د.ج')}`, icon: FiDollarSign, color: 'success' },
    { label: t("أرباح اليوم"), value: `${(s.todayEarnings || 0).toLocaleString()} ${t('د.ج')}`, icon: FiTrendingUp, color: 'accent', trend: '+12.5%', up: true },
    { label: t('المعاملات'), value: s.totalTransactions || 0, icon: FiActivity, color: 'info', trend: '+8.3%', up: true },
    { label: t('عمليات فاشلة'), value: s.failedOperations || 0, icon: FiAlertTriangle, color: 'danger', trend: '-2.1%', up: false },
    isAdmin && { label: t('شرائح نشطة'), value: s.activeSims || 0, icon: FiCpu, color: 'success' },
    isAdmin && { label: t('إجمالي المحافظ (للكل)'), value: `${(s.totalWalletBalance || 0).toLocaleString()} ${t('د.ج')}`, icon: FiUsers, color: 'warning' },
  ].filter(Boolean);

  const statusMap = { success: t('ناجح'), failed: t('فاشل'), processing: t('قيد المعالجة') };
  const typeMap = { flexy: t('فليكسي'), idoom: t('أيدوم'), card: t('بطاقة') };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('لوحة القيادة')}</h1>
          <p className="page-subtitle">{t('مرحباً بعودتك! إليك نظرة عامة.')}</p>
        </div>
        <button className="btn btn-primary">
          <FiActivity size={14} /> {t('إنشاء تقرير')}
        </button>
      </div>

      {ads.length > 0 && (
        <div style={{ marginBottom: 24, borderRadius: 'var(--radius)', overflow: 'hidden', position: 'relative', height: 180, border: '1px solid var(--border)' }}>
          {ads.map((ad, idx) => (
            <div key={ad.id} style={{
              position: 'absolute', inset: 0, opacity: currentAdIndex === idx ? 1 : 0, transition: 'opacity 0.8s ease-in-out',
              backgroundImage: `url(${ad.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center', zIndex: currentAdIndex === idx ? 1 : 0
            }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, zIndex: 2 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{ad.title}</h2>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>{ad.content}</p>
              </div>
            </div>
          ))}
          <div style={{ position: 'absolute', bottom: 12, right: 24, display: 'flex', gap: 6, zIndex: 3 }}>
            {ads.map((_, idx) => (
              <button key={idx} onClick={() => setCurrentAdIndex(idx)}
                style={{ width: 8, height: 8, borderRadius: '50%', border: 'none', background: currentAdIndex === idx ? 'var(--accent)' : 'rgba(255,255,255,0.4)', cursor: 'pointer', transition: 'var(--transition)' }} />
            ))}
          </div>
        </div>
      )}

      <div className="stats-grid">
        {statCards.map((c, i) => (
          <div className={`stat-card fade-in stagger-${i + 1}`} key={c.label}>
            <div>
              <p className="stat-label">{c.label}</p>
              <p className="stat-value">{c.value}</p>
              {c.trend && (
                <p className={`stat-trend ${c.up ? 'up' : 'down'}`}>
                  {c.trend} {t('مقارنة بالأمس')}
                </p>
              )}
            </div>
            <div className={`stat-icon ${c.color}`}>
              <c.icon size={20} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">{t('نظرة عامة على الإيرادات (30 يومًا)')}</span>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart}>
                <defs>
                  <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a3152" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ background:'#1a1f35', border:'1px solid #2a3152', borderRadius:8, fontSize:12 }}
                  labelStyle={{ color:'#94a3b8' }}
                />
                <Area type="monotone" dataKey="volume" stroke="#6366f1" fill="url(#colorVolume)" strokeWidth={2} />
                <Area type="monotone" dataKey="profit" stroke="#10b981" fill="url(#colorProfit)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">{t('أحدث المعاملات')}</span>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>{t('الرقم')}</th>
                  <th>{t('النوع')}</th>
                  <th>{t('المبلغ')}</th>
                  <th>{t('الحالة')}</th>
                </tr>
              </thead>
              <tbody>
                {(stats?.recentTransactions?.length ? stats.recentTransactions : [
                  { phone_number:'0550123456', type:'flexy', amount:1000, status:'success' },
                  { phone_number:'0660789012', type:'flexy', amount:500, status:'success' },
                  { phone_number:'0770345678', type:'idoom', amount:2000, status:'processing' },
                  { phone_number:'0550111222', type:'card', amount:1500, status:'failed' },
                  { phone_number:'0660333444', type:'flexy', amount:200, status:'success' },
                ]).map((tx, i) => (
                  <tr key={i}>
                    <td style={{ fontFamily:'monospace', fontWeight:600 }}>{tx.phone_number}</td>
                    <td style={{ textTransform:'capitalize' }}>{typeMap[tx.type] || tx.type}</td>
                    <td style={{ fontWeight:600 }}>{tx.amount} {t('د.ج')}</td>
                    <td>
                      <span className={`badge-status ${tx.status === 'success' ? 'success' : tx.status === 'failed' ? 'danger' : 'warning'}`}>
                        {statusMap[tx.status] || tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
