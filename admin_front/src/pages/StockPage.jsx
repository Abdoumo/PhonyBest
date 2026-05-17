import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { FiPackage, FiFilter, FiAlertTriangle } from 'react-icons/fi';
import API from '../api/axios';

export default function StockPage() {
  const { t } = useLanguage();
  const [stock, setStock] = useState({
    mobilis: 2450000,
    djezzy: 1320000,
    ooredoo: 890000,
    cards: 466,
    coupons: 120,
    idoom: 540000
  });

  const [loading, setLoading] = useState(false);

  // Here you can add real API fetching if available
  const load = () => {
    setLoading(true);
    // API.get('/stock').then(r => setStock(r.data.stock)).finally(() => setLoading(false));
    setTimeout(() => setLoading(false), 500);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('إدارة المخزون')}</h1>
          <p className="page-subtitle">{t('نظرة عامة على جميع الأرصدة والمخزونات المتوفرة')}</p>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="card" style={{ borderTop: '4px solid var(--mobilis)' }}>
          <div className="card-header"><span className="card-title">{t('موبيليس')} (Mobilis)</span></div>
          <div className="stat-value">{loading ? '...' : (stock.mobilis / 1000).toLocaleString() + 'K'} {t('د.ج')}</div>
          <p className="stat-label">{t('رصيد فليكسي المتوفر')}</p>
        </div>
        <div className="card" style={{ borderTop: '4px solid var(--djezzy)' }}>
          <div className="card-header"><span className="card-title">{t('جيزي')} (Djezzy)</span></div>
          <div className="stat-value">{loading ? '...' : (stock.djezzy / 1000).toLocaleString() + 'K'} {t('د.ج')}</div>
          <p className="stat-label">{t('رصيد فليكسي المتوفر')}</p>
        </div>
        <div className="card" style={{ borderTop: '4px solid var(--ooredoo)' }}>
          <div className="card-header"><span className="card-title">{t('أوريدو')} (Ooredoo)</span></div>
          <div className="stat-value">{loading ? '...' : (stock.ooredoo / 1000).toLocaleString() + 'K'} {t('د.ج')}</div>
          <p className="stat-label">{t('رصيد فليكسي المتوفر')}</p>
        </div>
      </div>

      <div className="grid-3">
        <div className="stat-card">
          <div>
            <p className="stat-label">{t('مخزون البطاقات الكلي')}</p>
            <p className="stat-value">{loading ? '...' : stock.cards}</p>
            <p style={{ fontSize:12, color:'var(--text-muted)' }}>{t('مختلف المتعاملين')}</p>
          </div>
          <div className="stat-icon info"><FiPackage size={20} /></div>
        </div>
        <div className="stat-card">
          <div>
            <p className="stat-label">{t('رصيد أيدوم الكلي')}</p>
            <p className="stat-value">{loading ? '...' : (stock.idoom / 1000).toLocaleString() + 'K'}</p>
            <p style={{ fontSize:12, color:'var(--text-muted)' }}>{t('د.ج (جميع البوابات)')}</p>
          </div>
          <div className="stat-icon info"><FiPackage size={20} /></div>
        </div>
        <div className="stat-card" style={{ visibility: 'hidden' }}></div>
      </div>
    </div>
  );
}
