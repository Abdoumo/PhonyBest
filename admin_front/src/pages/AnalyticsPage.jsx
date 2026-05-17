import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { FiPieChart, FiBarChart2, FiTrendingUp, FiActivity } from 'react-icons/fi';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import API from '../api/axios';

const mockPieData = [
  { name: 'فليكسي', value: 65 },
  { name: 'أيدوم', value: 20 },
  { name: 'البطاقات', value: 10 },
  { name: 'التحويلات', value: 5 },
];
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

const mockBarData = Array.from({ length: 7 }, (_, i) => ({
  day: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'][i],
  revenue: Math.floor(Math.random() * 50000) + 20000
}));

export default function AnalyticsPage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  };

  useEffect(() => { load(); }, []);

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
                  <Pie data={mockPieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {mockPieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background:'#1a1f35', border:'1px solid #2a3152', borderRadius:8 }} itemStyle={{ color:'#f1f5f9' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div style={{ display:'flex', justifyContent:'center', gap:16, flexWrap:'wrap', marginTop:16 }}>
            {mockPieData.map((entry, index) => (
              <div key={entry.name} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12 }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background:COLORS[index] }}/>
                {entry.name} ({entry.value}%)
              </div>
            ))}
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
                <BarChart data={mockBarData}>
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
            <p className="stat-label">متوسط إيراد المستخدم (ARPU)</p>
            <p className="stat-value">4,520 {t('د.ج')}</p>
            <p className="stat-trend up" style={{ fontSize:12, marginTop:6 }}>+5.2% هذا الشهر</p>
          </div>
          <div className="stat-icon success"><FiTrendingUp size={20} /></div>
        </div>
        <div className="stat-card">
          <div>
            <p className="stat-label">{t('أفضل متعامل (إيرادات)')}</p>
            <p className="stat-value" style={{ color: 'var(--mobilis)' }}>{t('موبيليس')}</p>
            <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:6 }}>يستحوذ على 45% من المبيعات</p>
          </div>
          <div className="stat-icon info"><FiPieChart size={20} /></div>
        </div>
        <div className="stat-card">
          <div>
            <p className="stat-label">{t('أرباح المنصة الصافية')}</p>
            <p className="stat-value">124,500 {t('د.ج')}</p>
            <p className="stat-trend up" style={{ fontSize:12, marginTop:6 }}>+12.8% مقارنة بالشهر الماضي</p>
          </div>
          <div className="stat-icon accent"><FiActivity size={20} /></div>
        </div>
      </div>
    </div>
  );
}
