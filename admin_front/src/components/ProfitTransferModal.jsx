import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { FiX, FiCheck, FiAlertTriangle, FiTrendingUp, FiCreditCard, FiArrowDown } from 'react-icons/fi';
import API from '../api/axios';

export default function ProfitTransferModal({ isOpen, onClose, onSuccess }) {
  const { t } = useLanguage();
  const [profitSummary, setProfitSummary] = useState({
    total_profit: 0,
    transferred_profit: 0,
    available_profit: 0,
    wallet_balance: 0
  });
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setNotes('');
      setError(null);
      setSuccessMsg(null);
      fetchSummary();
    }
  }, [isOpen]);

  const fetchSummary = async () => {
    setFetchLoading(true);
    try {
      const res = await API.get('/wallet/profit-summary');
      if (res.data && res.data.success) {
        setProfitSummary(res.data);
      }
    } catch (err) {
      console.error('Error fetching profit summary:', err);
    } finally {
      setFetchLoading(false);
    }
  };

  if (!isOpen) return null;

  const numAmount = parseFloat(amount || 0);
  const available = parseFloat(profitSummary.available_profit || 0);

  const handlePreset = (pct) => {
    if (available > 0) {
      const val = Math.floor(available * pct);
      setAmount(val > 0 ? val.toString() : '');
      setError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError(t('يرجى إدخال مبلغ صالح أكبر من صفر'));
      return;
    }

    if (numAmount > available) {
      setError(t('المبلغ المطلوب أكبر من الأرباح المتاحة للتحويل'));
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await API.post('/wallet/transfer-profit', {
        amount: numAmount,
        notes: notes.trim() || undefined
      });

      if (res.data && res.data.success) {
        setSuccessMsg(res.data.message || t('تم تحويل الأرباح بنجاح إلى رصيدك'));
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 1200);
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || t('حدث خطأ أثناء تحويل الأرباح');
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.65)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(3px)'
    }}>
      <div style={{
        background: 'var(--bg-card, #1e293b)',
        border: '1px solid var(--border-color, #334155)',
        borderRadius: 14,
        width: '94%',
        maxWidth: 500,
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-color, #334155)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(16, 185, 129, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: '#059669',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FiTrendingUp size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                {t('تحويل الأرباح')}
              </h3>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {t('Transfert des bénéfices')}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 6
            }}
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 20 }}>
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              borderRadius: 8,
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              color: '#ef4444',
              marginBottom: 16,
              fontSize: 13
            }}>
              <FiAlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              borderRadius: 8,
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              marginBottom: 16,
              fontSize: 13,
              fontWeight: 600
            }}>
              <FiCheck size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Point 8: Strict separation of Solde and Bénéfices in distinct cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
            {/* Card 1: Bénéfices */}
            <div style={{
              padding: 12,
              borderRadius: 10,
              border: '1px solid rgba(16, 185, 129, 0.3)',
              background: 'rgba(16, 185, 129, 0.08)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <FiTrendingUp size={14} color="#10b981" />
                <span style={{ fontSize: 11, fontWeight: 600, color: '#10b981' }}>
                  {t('الأرباح المتاحة للتحويل')}
                </span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#10b981' }}>
                {fetchLoading ? '...' : available.toLocaleString()} <span style={{ fontSize: 12 }}>د.ج</span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                {t('إجمالي الأرباح')}: {parseFloat(profitSummary.total_profit || 0).toLocaleString()} د.ج
              </div>
            </div>

            {/* Card 2: Solde (Wallet) */}
            <div style={{
              padding: 12,
              borderRadius: 10,
              border: '1px solid var(--border-color, #334155)',
              background: 'var(--bg-input, #0f172a)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <FiCreditCard size={14} color="var(--primary, #3b82f6)" />
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>
                  {t('رصيد المحفظة الحالي')}
                </span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                {fetchLoading ? '...' : parseFloat(profitSummary.wallet_balance || 0).toLocaleString()} <span style={{ fontSize: 12 }}>د.ج</span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                {t('Solde disponible')}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {t('المبلغ المراد تحويله إلى الرصيد')}
                </label>
                {available > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {t('الحد الأقصى')}: {available.toLocaleString()} د.ج
                  </span>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  step="any"
                  min="1"
                  max={available}
                  className="form-input"
                  style={{ width: '100%', fontSize: 16, fontWeight: 700, paddingInlineEnd: 48 }}
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setError(null);
                  }}
                  disabled={loading || available <= 0}
                />
                <span style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  fontWeight: 600
                }}>
                  د.ج
                </span>
              </div>

              {/* Quick percentage buttons */}
              {available > 0 && (
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1, fontSize: 11, padding: '4px 8px' }}
                    onClick={() => handlePreset(0.25)}
                  >
                    25%
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1, fontSize: 11, padding: '4px 8px' }}
                    onClick={() => handlePreset(0.5)}
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1, fontSize: 11, padding: '4px 8px' }}
                    onClick={() => handlePreset(0.75)}
                  >
                    75%
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1, fontSize: 11, padding: '4px 8px', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)' }}
                    onClick={() => handlePreset(1.0)}
                  >
                    100% ({t('الكل')})
                  </button>
                </div>
              )}
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>
                {t('ملاحظة أو بيان (اختياري)')}
              </label>
              <input
                type="text"
                className="form-input"
                style={{ width: '100%' }}
                placeholder={t('مثال: تحويل أرباح مبيعات الأسبوع')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Projection preview */}
            {numAmount > 0 && numAmount <= available && (
              <div style={{
                padding: '10px 14px',
                borderRadius: 8,
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px dashed rgba(59, 130, 246, 0.3)',
                marginBottom: 18,
                fontSize: 12
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{t('الرصيد بعد التحويل')}:</span>
                  <strong style={{ color: 'var(--primary)' }}>
                    {(parseFloat(profitSummary.wallet_balance || 0) + numAmount).toLocaleString()} د.ج
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{t('الأرباح المتبقية')}:</span>
                  <strong style={{ color: '#10b981' }}>
                    {Math.max(0, available - numAmount).toLocaleString()} د.ج
                  </strong>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={loading}
              >
                {t('إلغاء')}
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ background: '#059669', borderColor: '#059669', display: 'flex', alignItems: 'center', gap: 6 }}
                disabled={loading || available <= 0 || numAmount <= 0 || numAmount > available}
              >
                <FiCheck size={16} />
                <span>{loading ? t('جارٍ التحويل...') : t('تأكيد تحويل الأرباح')}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

