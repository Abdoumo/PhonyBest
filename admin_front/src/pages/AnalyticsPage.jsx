import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { FiPieChart, FiBarChart2, FiTrendingUp, FiActivity, FiSearch } from 'react-icons/fi';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import API from '../api/axios';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AnalyticsPage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [consumptionData, setConsumptionData] = useState([]);
  const [overviewData, setOverviewData] = useState(null);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [consRes, overRes] = await Promise.all([
        API.get('/analytics/consumption', { params: { search } }),
        API.get('/analytics/overview')
      ]);
      setConsumptionData(consRes.data.data || []);
      setOverviewData(overRes.data.data || null);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [search]);

  const pieData = overviewData?.pieData || [];
  const barData = overviewData?.barData || [];
  const stats = overviewData?.stats || { netProfit: 0, bestOperator: '-', bestOperatorPercentage: 0, arpu: 0 };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('تحليلات المنصة')}</h1>
          <p className="page-subtitle">{t('تقارير مفصلة حول أداء المنصة والإيرادات')}</p>
        </div>
        <button className="btn btn-primary" onClick={load}>
          <FiActivity size={14} style={{marginLeft:4}}/>{t('تحديث البيانات')}</button>
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">{t('توزيع الخدمات (آخر 30 يوم)')}</span>
            <FiPieChart color="var(--text-muted)" />
          </div>
          <div className="chart-container" style={{ height: 250 }}>
            {loading ? <div style={{display:'flex',height:'100%',alignItems:'center',justifyContent:'center'}}><span className="spinner"/></div> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background:'#1a1f35', border:'1px solid #2a3152', borderRadius:8 }} itemStyle={{ color:'#f1f5f9' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div style={{ display:'flex', justifyContent:'center', gap:16, flexWrap:'wrap', marginTop:16 }}>
            {pieData.map((entry, index) => {
              const total = pieData.reduce((acc, curr) => acc + curr.value, 0);
              const percentage = total > 0 ? Math.round((entry.value / total) * 100) : 0;
              return (
                <div key={entry.name} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12 }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:COLORS[index % COLORS.length] }}/>
                  {entry.name} ({percentage}%)
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">{t('الإيرادات الأسبوعية')}</span>
            <FiBarChart2 color="var(--text-muted)" />
          </div>
          <div className="chart-container" style={{ height: 250 }}>
            {loading ? <div style={{display:'flex',height:'100%',alignItems:'center',justifyContent:'center'}}><span className="spinner"/></div> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a3152" vertical={false} />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickMargin={10} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={v => `${v/1000}K`} />
                  <Tooltip cursor={{ fill: 'rgba(99,102,241,0.1)' }} contentStyle={{ background:'#1a1f35', border:'1px solid #2a3152', borderRadius:8 }} />
                  <Bar dataKey="revenue" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="grid-3">
        <div className="stat-card">
          <div>
            <p className="stat-label">{t('متوسط إيراد المستخدم (ARPU)')}</p>
            <p className="stat-value">{stats.arpu.toLocaleString()} {t('د.ج')}</p>
            <p className="stat-trend up" style={{ fontSize:12, marginTop:6 }}>{t('المتوسط الشهري للاستهلاك')}</p>
          </div>
          <div className="stat-icon success"><FiTrendingUp size={20} /></div>
        </div>
        <div className="stat-card">
          <div>
            <p className="stat-label">{t('أفضل متعامل (إيرادات)')}</p>
            <p className="stat-value" style={{ color: stats.bestOperator === 'موبيليس' ? 'var(--mobilis)' : stats.bestOperator === 'أوريدو' ? 'var(--ooredoo)' : stats.bestOperator === 'جيزي' ? 'var(--djezzy)' : 'var(--text-primary)' }}>{t(stats.bestOperator)}</p>
            <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:6 }}>{t('يستحوذ على')} {stats.bestOperatorPercentage}% {t('من المبيعات')}</p>
          </div>
          <div className="stat-icon info"><FiPieChart size={20} /></div>
        </div>
        <div className="stat-card">
          <div>
            <p className="stat-label">{t('أرباح المنصة الصافية')}</p>
            <p className="stat-value">{stats.netProfit.toLocaleString()} {t('د.ج')}</p>
            <p className="stat-trend up" style={{ fontSize:12, marginTop:6 }}>{t('إجمالي الأرباح من المعاملات الناجحة')}</p>
          </div>
          <div className="stat-icon accent"><FiActivity size={20} /></div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-header" style={{ paddingBottom: 16 }}>
          <span className="card-title">{t('استهلاك المستخدمين التفصيلي')}</span>
          <div className="header-search" style={{ minWidth: 250, margin: 0 }}>
            <FiSearch />
            <input placeholder={t("البحث عن مستخدم...")} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>{t('المستخدم')}</th>
                <th>{t('إجمالي الاستهلاك')}</th>
                <th style={{ color: 'var(--mobilis)' }}>{t('موبيليس')}</th>
                <th style={{ color: 'var(--ooredoo)' }}>{t('أوريدو')}</th>
                <th style={{ color: 'var(--djezzy)' }}>{t('جيزي')}</th>
                <th style={{ color: 'var(--text-primary)' }}>{t('أيدوم')}</th>
                <th style={{ color: 'var(--accent)' }}>{t('البطاقات')}</th>
              </tr>
            </thead>
            <tbody>
              {loading && consumptionData.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: 40 }}><span className="spinner"/></td></tr>
              ) : consumptionData.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: 40 }}>{t('لا توجد بيانات')}</td></tr>
              ) : (
                consumptionData.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="user-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                          {u.full_name?.charAt(0) || u.username?.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.full_name || u.username}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>@{u.username} • {u.role}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontWeight: 'bold' }}>{parseFloat(u.total_consumed).toLocaleString()} {t('د.ج')}</td>
                    <td style={{ color: 'var(--mobilis)' }}>{parseFloat(u.mobilis_consumed).toLocaleString()} {t('د.ج')}</td>
                    <td style={{ color: 'var(--ooredoo)' }}>{parseFloat(u.ooredoo_consumed).toLocaleString()} {t('د.ج')}</td>
                    <td style={{ color: 'var(--djezzy)' }}>{parseFloat(u.djezzy_consumed).toLocaleString()} {t('د.ج')}</td>
                    <td style={{ color: 'var(--text-primary)' }}>{parseFloat(u.idoom_consumed).toLocaleString()} {t('د.ج')}</td>
                    <td style={{ color: 'var(--accent)' }}>{parseFloat(u.cards_consumed).toLocaleString()} {t('د.ج')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
