import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMe } from '../redux/authSlice';
import { FiZap, FiCheck, FiX, FiAlertCircle, FiInfo } from 'react-icons/fi';
import API from '../api/axios';

export default function SelfRechargeModal({ isOpen, onClose, onSuccess }) {
  const { t } = useLanguage();
  const dispatch = useDispatch();
  const { user } = useSelector(s => s.auth);

  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const authorizedLimit = parseFloat(user?.self_recharge_limit || 0);
  const rule = user?.self_recharge_rule || 'total';
  const isEnabled = user?.self_recharge_enabled !== false;

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setErrorMessage('');
      setSuccessMessage('');
      setSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const numAmount = parseFloat(amount);
  const isAmountValid = !isNaN(numAmount) && numAmount > 0;
  const isWithinLimit = isAmountValid && numAmount <= authorizedLimit;

  // Remaining limit calculation
  const remainingAfter = rule === 'total' 
    ? Math.max(0, authorizedLimit - (isAmountValid ? numAmount : 0))
    : authorizedLimit;

  const currentWallet = parseFloat(user?.wallet || 0);
  const newWallet = currentWallet + (isAmountValid ? numAmount : 0);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (submitting) return;

    if (!isEnabled) {
      setErrorMessage(t('الشحن الذاتي معطل لحسابك حالياً'));
      return;
    }

    if (!isAmountValid) {
      setErrorMessage(t('يرجى إدخال مبلغ صالح أكبر من 0 د.ج'));
      return;
    }

    if (!isWithinLimit) {
      setErrorMessage(
        rule === 'total'
          ? `${t('المبلغ يتجاوز الرصيد المصرح به المتبقي')} (${authorizedLimit.toLocaleString()} ${t('د.ج')})`
          : `${t('المبلغ يتجاوز الحد الأقصى لكل عملية')} (${authorizedLimit.toLocaleString()} ${t('د.ج')})`
      );
      return;
    }

    setErrorMessage('');
    setSubmitting(true);

    const idempotencyKey = `self_recharge_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      const res = await API.post('/wallet/self-recharge', {
        amount: numAmount,
        idempotency_key: idempotencyKey,
      });

      setSuccessMessage(res.data.message || t('تمت عملية الشحن الذاتي بنجاح'));
      dispatch(fetchMe());
      if (onSuccess) onSuccess();

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Self-recharge error:', err);
      setErrorMessage(err.response?.data?.error || t('فشل في إجراء الشحن الذاتي'));
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div 
        className="modal" 
        onClick={e => e.stopPropagation()} 
        style={{ maxWidth: 500, width: '100%', maxHeight: '92vh', overflowY: 'auto' }}
      >
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <FiZap size={20} />
            </div>
            <div>
              <h3 className="modal-title" style={{ margin: 0, fontSize: 17 }}>{t('شحن ذاتي – Recharge Autonome')}</h3>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                {t('اشحن رصيد محفظتك مباشرة دون الحاجة لطلب التحويل')}
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Status banner */}
        {!isEnabled ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 14px', borderRadius: 8,
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
            color: 'var(--danger)', fontSize: 13, marginTop: 14
          }}>
            <FiAlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{t('الشحن الذاتي معطل لحسابك من قبل المسؤول.')}</span>
          </div>
        ) : authorizedLimit <= 0 ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 14px', borderRadius: 8,
            background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)',
            color: 'var(--warning)', fontSize: 13, marginTop: 14
          }}>
            <FiInfo size={18} style={{ flexShrink: 0 }} />
            <span>{t('لا يوجد رصيد مصرح به متاح حالياً. يرجى من المسؤول ترخيص رصيد جديد.')}</span>
          </div>
        ) : null}

        {errorMessage && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 14px', borderRadius: 8,
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
            color: 'var(--danger)', fontSize: 13, marginTop: 14
          }}>
            <FiAlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 14px', borderRadius: 8,
            background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)',
            color: 'var(--success)', fontSize: 13, marginTop: 14
          }}>
            <FiCheck size={18} style={{ flexShrink: 0 }} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Authorized Balance Card */}
        <div style={{
          marginTop: 16,
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {rule === 'total' ? t('الرصيد المصرح به المتبقي') : t('الحد الأقصى لكل عملية شحن')}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)', marginTop: 4 }}>
              {authorizedLimit.toLocaleString()} <span style={{ fontSize: 14 }}>{t('د.ج')}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
              {rule === 'total' ? t('قاعدة: رصيد كلي تنازلي (déductible)') : t('قاعدة: حد أقصى للعملية الواحدة')}
            </div>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('رصيدك الحالي')}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--success)', marginTop: 2 }}>
              {currentWallet.toLocaleString()} {t('د.ج')}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600, fontSize: 13 }}>
              {t('مبلغ الشحن المطلوب (د.ج)')} <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-input"
                type="number"
                min="1"
                max={authorizedLimit}
                placeholder={t("مثال: 1500")}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                disabled={authorizedLimit <= 0 || !isEnabled}
                style={{
                  fontSize: 16, fontWeight: 700, letterSpacing: 0.5,
                  borderColor: amount !== '' && !isWithinLimit ? 'var(--danger)' : undefined
                }}
              />
              <span style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                fontSize: 13, fontWeight: 600, color: 'var(--text-muted)'
              }}>
                {t('د.ج')}
              </span>
            </div>

            {/* Quick Amount Chips */}
            {authorizedLimit > 0 && isEnabled && (
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {[500, 1000, 1500, 2000, 5000].filter(v => v <= authorizedLimit).map(v => (
                  <button
                    key={v}
                    type="button"
                    className="btn btn-sm btn-secondary"
                    style={{ fontSize: 11, padding: '3px 8px' }}
                    onClick={() => setAmount(String(v))}
                  >
                    +{v.toLocaleString()} {t('د.ج')}
                  </button>
                ))}
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  style={{ fontSize: 11, padding: '3px 8px', color: 'var(--primary)' }}
                  onClick={() => setAmount(String(authorizedLimit))}
                >
                  {t('المبلغ المتبقي كاملاً')} ({authorizedLimit.toLocaleString()})
                </button>
              </div>
            )}
          </div>

          {/* Simulation Box */}
          {isAmountValid && (
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              fontSize: 12
            }}>
              <div style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{t('معاينة العملية:')}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{t('المبلغ المراد شحنه')}:</span>
                <span style={{ fontWeight: 700, color: 'var(--success)' }}>+{numAmount.toLocaleString()} {t('د.ج')}</span>
              </div>
              {rule === 'total' && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{t('الرصيد المصرح به المتبقي بعد الشحن')}:</span>
                  <span style={{ fontWeight: 700, color: 'var(--warning)' }}>{remainingAfter.toLocaleString()} {t('د.ج')}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border)', paddingTop: 6 }}>
                <span style={{ color: 'var(--text-secondary)' }}>{t('رصيد المحفظة الجديد')}:</span>
                <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{newWallet.toLocaleString()} {t('د.ج')}</span>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={onClose}
              disabled={submitting}
            >
              {t('إلغاء')}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 2, justifyContent: 'center', fontWeight: 700, background: 'var(--success)', borderColor: 'var(--success)' }}
              disabled={!isWithinLimit || submitting || !isEnabled}
            >
              {submitting ? (
                <>
                  <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, marginRight: 6 }} />
                  {t('جاري الشحن...')}
                </>
              ) : (
                <>
                  <FiZap size={15} style={{ marginLeft: 6 }} />
                  {t('تأكيد الشحن الذاتي')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

