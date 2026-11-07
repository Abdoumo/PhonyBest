import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { FiSettings, FiCheck, FiAlertCircle, FiZap, FiShield } from 'react-icons/fi';
import API from '../api/axios';

export default function SelfRechargeConfigModal({ isOpen, onClose, onSuccess, client }) {
  const { t } = useLanguage();

  const [limit, setLimit] = useState('');
  const [rule, setRule] = useState('total');
  const [enabled, setEnabled] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (client) {
      setLimit(client.self_recharge_limit !== undefined ? String(client.self_recharge_limit) : '0');
      setRule(client.self_recharge_rule || 'total');
      setEnabled(client.self_recharge_enabled !== false);
      setErrorMsg('');
      setSubmitting(false);
    }
  }, [client, isOpen]);

  if (!isOpen || !client) return null;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (submitting) return;

    const numLimit = parseFloat(limit);
    if (isNaN(numLimit) || numLimit < 0) {
      setErrorMsg(t('يرجى إدخال مبلغ ترخيص صحيح (0 أو أكبر)'));
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      await API.post(`/users/${client.id}/self-recharge-config`, {
        limit: numLimit,
        total: numLimit,
        rule,
        enabled,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Config failed:', err);
      setErrorMsg(err.response?.data?.error || t('حدث خطأ أثناء حفظ إعدادات الشحن الذاتي'));
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div 
        className="modal" 
        onClick={e => e.stopPropagation()} 
        style={{ maxWidth: 520, width: '100%', maxHeight: '92vh', overflowY: 'auto' }}
      >
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'rgba(99, 102, 241, 0.12)', color: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <FiZap size={18} />
            </div>
            <div>
              <h3 className="modal-title" style={{ margin: 0, fontSize: 17 }}>
                {t('ترخيص الشحن الذاتي للعميل')}
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                {client.full_name || client.username} (@{client.username})
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {errorMsg && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 14px', borderRadius: 8,
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
            color: 'var(--danger)', fontSize: 13, marginTop: 14
          }}>
            <FiAlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* Enabled switch */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 14px', background: 'var(--bg-input)', borderRadius: 10
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{t('حالة الشحن الذاتي')}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {enabled ? t('مفعل: يمكن للعميل إجراء شحن ذاتي بنفسه') : t('معطل: لا يمكن للعميل الشحن ذاتياً')}
              </div>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={enabled}
                onChange={e => setEnabled(e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute', inset: 0,
                background: enabled ? 'var(--primary)' : 'var(--border)',
                borderRadius: 24, transition: '0.2s'
              }}>
                <span style={{
                  position: 'absolute', top: 2, left: enabled ? 22 : 2,
                  width: 20, height: 20, background: '#fff', borderRadius: '50%',
                  transition: '0.2s'
                }} />
              </span>
            </label>
          </div>

          {/* Amount / Limit */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600, fontSize: 13 }}>
              {t('المبلغ المصرح به للشحن الذاتي (د.ج)')} <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-input"
                type="number"
                min="0"
                step="any"
                placeholder={t("مثال: 5000")}
                value={limit}
                onChange={e => setLimit(e.target.value)}
                style={{ fontSize: 16, fontWeight: 700 }}
              />
              <span style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                fontSize: 13, fontWeight: 600, color: 'var(--text-muted)'
              }}>
                {t('د.ج')}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              {[1000, 2000, 5000, 10000, 20000].map(v => (
                <button
                  key={v}
                  type="button"
                  className="btn btn-sm btn-secondary"
                  style={{ fontSize: 11, padding: '2px 8px' }}
                  onClick={() => setLimit(String(v))}
                >
                  {v.toLocaleString()} {t('د.ج')}
                </button>
              ))}
            </div>
          </div>

          {/* Rule Selection */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600, fontSize: 13 }}>
              {t('قاعدة وحدود الاستخدام')}
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              
              {/* Option 1: Total deductible */}
              <div
                onClick={() => setRule('total')}
                style={{
                  border: rule === 'total' ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: rule === 'total' ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-card)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  cursor: 'pointer',
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start'
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', marginTop: 2,
                  border: rule === 'total' ? '5px solid var(--primary)' : '2px solid var(--border)',
                  background: '#fff', flexShrink: 0
                }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary)' }}>
                    {t('رصيد كلي تنازلي (Total déductible) – الخيار الموصى به')}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {t('المبلغ المصرح (مثلاً 5 000 د.ج) هو الحد الإجمالي. إذا شحن العميل 1 500 د.ج، يصبح الرصيد المتبقي له 3 500 د.ج.')}
                  </div>
                </div>
              </div>

              {/* Option 2: Per transaction */}
              <div
                onClick={() => setRule('per_tx')}
                style={{
                  border: rule === 'per_tx' ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: rule === 'per_tx' ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-card)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  cursor: 'pointer',
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start'
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', marginTop: 2,
                  border: rule === 'per_tx' ? '5px solid var(--primary)' : '2px solid var(--border)',
                  background: '#fff', flexShrink: 0
                }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary)' }}>
                    {t('حد أقصى لكل عملية شحن (Plafond par recharge)')}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {t('المبلغ يحدد أقصى ما يمكن للعميل شحنه في العملية الواحدة دون تقييد الرصيد الإجمالي.')}
                  </div>
                </div>
              </div>

            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
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
              style={{ flex: 2, justifyContent: 'center', fontWeight: 700 }}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, marginRight: 6 }} />
                  {t('جاري الحفظ...')}
                </>
              ) : (
                <>
                  <FiCheck size={15} style={{ marginLeft: 6 }} />
                  {t('حفظ الترخيص')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

