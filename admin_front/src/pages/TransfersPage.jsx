import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useLanguage } from '../contexts/LanguageContext';
import {
  FiArrowUpRight, FiArrowDownLeft, FiSearch, FiSend, FiUser, FiZap, FiCreditCard,
  FiDollarSign, FiCheck, FiRotateCcw, FiInfo, FiTrendingUp, FiInbox, FiUploadCloud
} from 'react-icons/fi';
import API from '../api/axios';
import TransferModal from '../components/TransferModal';
import SelfRechargeModal from '../components/SelfRechargeModal';
import ProfitTransferModal from '../components/ProfitTransferModal';

export default function TransfersPage() {
  const { t } = useLanguage();
  const { user } = useSelector(s => s.auth);

  const [transfers, setTransfers] = useState([]);
  const [search, setSearch] = useState('');
  const [directionTab, setDirectionTab] = useState(''); // '' (all), 'incoming', 'outgoing'
  const [filters, setFilters] = useState({
    from_user: '',
    to_user: '',
    type: '',
    status: '',
    min_amount: '',
    max_amount: '',
    date_from: '',
    date_to: ''
  });
  const [loading, setLoading] = useState(false);
  
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showSelfRechargeModal, setShowSelfRechargeModal] = useState(false);
  const [showProfitModal, setShowProfitModal] = useState(false);

  const load = () => {
    setLoading(true);
    API.get('/wallet/history', { 
      params: { 
        search, 
        direction: directionTab || undefined, 
        ...filters 
      } 
    })
      .then(r => setTransfers(r.data.transactions || []))
      .catch(() => setTransfers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { 
    load(); 
  }, [search, directionTab, filters]);

  const typeConfig = {
    'debt': { label: t('دين – Dette'), color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', icon: FiCreditCard },
    'cash': { label: t('نقد – Espèces'), color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', icon: FiDollarSign },
    'payment': { label: t('دفع – Paiement'), color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)', icon: FiCheck },
    'debt_recovery': { label: t('استرداد دين'), color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', icon: FiRotateCcw },
    'cash_recovery': { label: t('استرداد نقد'), color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)', icon: FiRotateCcw },
    'payment_recovery': { label: t('استرداد دفع'), color: '#ec4899', bg: 'rgba(236, 72, 153, 0.12)', icon: FiRotateCcw },
    'self_recharge': { label: t('شحن ذاتي – Recharge autonome'), color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)', icon: FiZap },
    'profit_transfer': { label: t('تحويل الأرباح – Transfert bénéfices'), color: '#059669', bg: 'rgba(5, 150, 105, 0.15)', icon: FiTrendingUp },
    'transfer': { label: t('تحويل'), color: '#6366f1', bg: 'rgba(99, 102, 241, 0.12)', icon: FiArrowUpRight },
    'deposit': { label: t('إيداع'), color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', icon: FiDollarSign },
    'withdrawal': { label: t('سحب'), color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', icon: FiArrowUpRight },
  };

  const renderTypeBadge = (trxType) => {
    const cfg = typeConfig[trxType] || { label: trxType, color: 'var(--text-muted)', bg: 'var(--bg-input)', icon: FiArrowUpRight };
    const Icon = cfg.icon;
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 12,
        fontWeight: 600,
        color: cfg.color,
        background: cfg.bg,
        padding: '3px 8px',
        borderRadius: 6
      }}>
        <Icon size={12} />
        {cfg.label}
      </span>
    );
  };

  const canSelfRecharge = user && (user.role === 'CLIENT' || user.role === 'COMMERCANT' || parseFloat(user.self_recharge_limit || 0) > 0);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('التحويلات المالية')}</h1>
          <p className="page-subtitle">{t('إدارة ومراقبة تحويلات الأرصدة والديون والوارد والصادر')}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {/* Profit Transfer Button */}
          <button
            className="btn btn-secondary"
            style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)' }}
            onClick={() => setShowProfitModal(true)}
          >
            <FiTrendingUp size={14} style={{ marginLeft: 4 }} />
            {t('تحويل الأرباح')}
          </button>

          {/* Self-Recharge Button */}
          {canSelfRecharge && (
            <button
              className="btn btn-secondary"
              style={{ color: 'var(--success)', borderColor: 'var(--success)' }}
              onClick={() => setShowSelfRechargeModal(true)}
            >
              <FiZap size={14} style={{ marginLeft: 4 }} />
              {t('شحن ذاتي')}
              {parseFloat(user.self_recharge_limit || 0) > 0 && (
                <span style={{
                  fontSize: 11, background: 'var(--success)', color: '#fff',
                  padding: '1px 6px', borderRadius: 10, marginRight: 4
                }}>
                  {parseFloat(user.self_recharge_limit).toLocaleString()} د.ج
                </span>
              )}
            </button>
          )}

          {/* New Transfer Button */}
          <button className="btn btn-primary" onClick={() => setShowTransferModal(true)}>
            <FiSend size={14} style={{ marginLeft: 4 }} />
            {t('تحويل رصيد جديد')}
          </button>
        </div>
      </div>

      <div className="table-wrapper">
        {/* Point 7: Explicit Separation between Incoming and Outgoing Transfers */}
        <div style={{
          display: 'flex',
          gap: 6,
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-color, #334155)',
          background: 'rgba(0,0,0,0.06)'
        }}>
          <button
            onClick={() => setDirectionTab('')}
            className={`btn btn-sm ${directionTab === '' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: 8, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            {t('جميع التحويلات')}
          </button>
          <button
            onClick={() => setDirectionTab('incoming')}
            className={`btn btn-sm ${directionTab === 'incoming' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              borderRadius: 8,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: directionTab === 'incoming' ? '#10b981' : undefined,
              borderColor: directionTab === 'incoming' ? '#10b981' : undefined
            }}
          >
            <FiInbox size={14} />
            {t('التحويلات الواردة')} (Entrants)
          </button>
          <button
            onClick={() => setDirectionTab('outgoing')}
            className={`btn btn-sm ${directionTab === 'outgoing' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              borderRadius: 8,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: directionTab === 'outgoing' ? '#ef4444' : undefined,
              borderColor: directionTab === 'outgoing' ? '#ef4444' : undefined
            }}
          >
            <FiArrowUpRight size={14} />
            {t('التحويلات الصادرة')} (Sortants)
          </button>
        </div>

        <div className="table-header" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <div className="filters-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px', marginBottom: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{t('المرسل')}</label>
              <input className="form-input" placeholder={t("اسم المرسل")} value={filters.from_user} onChange={e => setFilters({ ...filters, from_user: e.target.value })} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{t('المستلم')}</label>
              <input className="form-input" placeholder={t("اسم المستلم")} value={filters.to_user} onChange={e => setFilters({ ...filters, to_user: e.target.value })} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{t('المبلغ (من - إلى)')}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="form-input" style={{ width: '50%' }} type="number" placeholder="من" value={filters.min_amount} onChange={e => setFilters({ ...filters, min_amount: e.target.value })} />
                <input className="form-input" style={{ width: '50%' }} type="number" placeholder="إلى" value={filters.max_amount} onChange={e => setFilters({ ...filters, max_amount: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{t('التاريخ (من - إلى)')}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="form-input" style={{ width: '50%' }} type="date" value={filters.date_from} onChange={e => setFilters({ ...filters, date_from: e.target.value })} />
                <input className="form-input" style={{ width: '50%' }} type="date" value={filters.date_to} onChange={e => setFilters({ ...filters, date_to: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{t('نوع التحويل')}</label>
              <select className="form-select" value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value })}>
                <option value="">{t('جميع الأنواع')}</option>
                <optgroup label={t('الأنواع الأساسية')}>
                  <option value="debt">{t('دين – Dette')}</option>
                  <option value="cash">{t('نقد – Espèces')}</option>
                  <option value="payment">{t('دفع – Paiement')}</option>
                </optgroup>
                <optgroup label={t('الاسترداد والشحن والأرباح')}>
                  <option value="debt_recovery">{t('استرداد دين')}</option>
                  <option value="cash_recovery">{t('استرداد نقد')}</option>
                  <option value="payment_recovery">{t('استرداد دفع')}</option>
                  <option value="self_recharge">{t('شحن الذاتي – Recharge autonome')}</option>
                  <option value="profit_transfer">{t('تحويل الأرباح – Transfert bénéfices')}</option>
                </optgroup>
                <optgroup label={t('أخرى')}>
                  <option value="transfer">{t('تحويل عادي')}</option>
                  <option value="deposit">{t('إيداع')}</option>
                  <option value="withdrawal">{t('سحب')}</option>
                </optgroup>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{t('الحالة')}</label>
              <select className="form-select" value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
                <option value="">{t('الكل')}</option>
                <option value="completed">{t('مكتمل')}</option>
                <option value="pending">{t('قيد المعالجة')}</option>
                <option value="failed">{t('فشل')}</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignSelf: 'flex-start', width: '100%', maxWidth: 320 }}>
            <div className="header-search" style={{ width: '100%' }}>
              <FiSearch />
              <input placeholder={t("البحث برقم المعاملة أو الملاحظة...")} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>{t('رقم')}</th>
              <th>{t('التاريخ والوقت')}</th>
              <th>{t('المرسل')}</th>
              <th>{t('المستلم')}</th>
              <th>{t('المبلغ والاتجاه')}</th>
              <th>{t('نوع التحويل')}</th>
              <th>{t('البيان / ملاحظة')}</th>
              <th>{t('الحالة')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: 24 }}><span className="spinner" style={{ margin: '0 auto' }} /></td></tr>
            ) : transfers.length === 0 ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>{t('لا توجد تحويلات مطابقة')}</td></tr>
            ) : transfers.map(trx => {
              const isUserIncoming = trx.is_incoming || (user && trx.to_user_id === user.id);
              const isUserOutgoing = trx.is_outgoing || (user && trx.from_user_id === user.id);

              return (
                <tr key={trx.id}>
                  <td style={{ fontWeight: 600, fontFamily: 'monospace', color: 'var(--text-muted)' }}>#{trx.id}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(trx.date).toLocaleString('ar-DZ')}
                  </td>
                  <td>
                    <span className="badge-status info">
                      {trx.from_full_name ? `${trx.from_full_name} (@${trx.from_user})` : `@${trx.from_user}`}
                    </span>
                  </td>
                  <td>
                    <span className="badge-status info">
                      {trx.to_full_name ? `${trx.to_full_name} (@${trx.to_user})` : `@${trx.to_user}`}
                    </span>
                  </td>
                  <td>
                    {isUserIncoming ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 700,
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#10b981',
                          padding: '2px 6px',
                          borderRadius: 6
                        }}>
                          📥 {t('وارد')}
                        </span>
                        <span style={{ fontWeight: 700, color: 'var(--success)' }}>
                          +{parseFloat(trx.amount).toLocaleString()} {t('د.ج')}
                        </span>
                      </div>
                    ) : isUserOutgoing ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 700,
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: '#ef4444',
                          padding: '2px 6px',
                          borderRadius: 6
                        }}>
                          📤 {t('صادر')}
                        </span>
                        <span style={{ fontWeight: 700, color: '#ef4444' }}>
                          -{parseFloat(trx.amount).toLocaleString()} {t('د.ج')}
                        </span>
                      </div>
                    ) : (
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {parseFloat(trx.amount).toLocaleString()} {t('د.ج')}
                      </span>
                    )}
                  </td>
                  <td>
                    {renderTypeBadge(trx.type)}
                  </td>
                  <td style={{ fontSize: 12, color: trx.notes ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {trx.notes || '-'}
                  </td>
                  <td>
                    <span className={`badge-status ${trx.status === 'completed' ? 'success' : trx.status === 'pending' ? 'warning' : 'danger'}`}>
                      {trx.status === 'completed' ? t('مكتمل') : trx.status === 'pending' ? t('قيد المعالجة') : t('فشل')}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Transfer Modal with Dette, Espèces, Paiement and validation */}
      <TransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        onSuccess={load}
      />

      {/* Self-Recharge Modal for autonomous recharge */}
      <SelfRechargeModal
        isOpen={showSelfRechargeModal}
        onClose={() => setShowSelfRechargeModal(false)}
        onSuccess={load}
      />

      {/* Profit Transfer Modal */}
      <ProfitTransferModal
        isOpen={showProfitModal}
        onClose={() => setShowProfitModal(false)}
        onSuccess={load}
      />
    </div>
  );
}
