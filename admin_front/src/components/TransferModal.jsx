import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import {
  FiSend, FiUser, FiDollarSign, FiCheck, FiX, FiAlertCircle, 
  FiArrowUpRight, FiRotateCcw, FiInfo, FiCreditCard
} from 'react-icons/fi';
import API from '../api/axios';

export default function TransferModal({ isOpen, onClose, onSuccess, defaultRecipient = null }) {
  const { t } = useLanguage();

  const [recipient, setRecipient] = useState(defaultRecipient?.username || '');
  const [selectedUser, setSelectedUser] = useState(defaultRecipient);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('cash'); // 'debt' | 'cash' | 'payment' | 'debt_recovery' | 'cash_recovery' | 'payment_recovery'
  const [notes, setNotes] = useState('');
  const [showAdvancedTypes, setShowAdvancedTypes] = useState(false);
  
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch users list for autocomplete if no default recipient
  useEffect(() => {
    if (isOpen && !defaultRecipient) {
      setLoadingUsers(true);
      API.get('/users', { params: { limit: 200 } })
        .then(res => {
          setUsersList(res.data.users || []);
        })
        .catch(() => setUsersList([]))
        .finally(() => setLoadingUsers(false));
    }
  }, [isOpen, defaultRecipient]);

  // Set default recipient if passed
  useEffect(() => {
    if (defaultRecipient) {
      setRecipient(defaultRecipient.username || '');
      setSelectedUser(defaultRecipient);
    } else {
      setRecipient('');
      setSelectedUser(null);
    }
    setAmount('');
    setType('cash');
    setNotes('');
    setErrorMessage('');
    setSubmitting(false);
  }, [defaultRecipient, isOpen]);

  if (!isOpen) return null;

  // Validation rules
  const numAmount = parseFloat(amount);
  const isAmountValid = !isNaN(numAmount) && numAmount > 0;
  const isRecipientValid = !!recipient && recipient.trim().length > 0;
  const isTypeValid = !!type;
  const canSubmit = isAmountValid && isRecipientValid && isTypeValid && !submitting;

  const handleSelectUser = (u) => {
    setSelectedUser(u);
    setRecipient(u.username);
  };

  const handleTransfer = async (e) => {
    e?.preventDefault();
    if (submitting) return; // Prevent double click

    // Check amount
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage(t('يرجى إدخال مبلغ صحيح أكبر من 0 د.ج'));
      return;
    }

    if (!isRecipientValid) {
      setErrorMessage(t('يرجى اختيار الشخص المستلم للتحويل'));
      return;
    }

    if (!isTypeValid) {
      setErrorMessage(t('يرجى تحديد نوع التحويل (دين، نقد، أو دفع)'));
      return;
    }

    setErrorMessage('');
    setSubmitting(true);

    // Generate unique idempotency key for this request
    const idempotencyKey = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      const payload = {
        to_user_id: selectedUser?.id || undefined,
        username: recipient.trim(),
        amount: numAmount,
        type,
        notes: notes.trim() || undefined,
        idempotency_key: idempotencyKey,
      };

      await API.post('/wallet/transfer', payload);

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Transfer failed:', err);
      const serverMsg = err.response?.data?.error || t('حدث خطأ أثناء إجراء التحويل');
      setErrorMessage(serverMsg);
      setSubmitting(false);
    }
  };

  const primaryTypes = [
    {
      id: 'debt',
      nameAr: 'دين – Dette',
      desc: 'La personne doit de l’argent. Elle paiera plus tard.',
      descAr: 'المستلم يأخذ الرصيد كدين مؤجل ويسدده لاحقاً.',
      example: 'مثال: عميل يأخذ 2 000 د.ج ويسددها بعدين (يزيد الدين)',
      color: '#f59e0b',
      border: 'rgba(245, 158, 11, 0.5)',
      bg: 'rgba(245, 158, 11, 0.1)',
      icon: FiCreditCard
    },
    {
      id: 'cash',
      nameAr: 'نقد – Espèces',
      desc: 'La personne donne de l’argent cash.',
      descAr: 'المستلم يدفع المبلغ نقداً (كاش) فوراً.',
      example: 'مثال: عميل يدفع 2 000 د.ج نقداً ويستلم الرصيد',
      color: '#10b981',
      border: 'rgba(16, 185, 129, 0.5)',
      bg: 'rgba(16, 185, 129, 0.1)',
      icon: FiDollarSign
    },
    {
      id: 'payment',
      nameAr: 'دفع – Paiement',
      desc: 'La personne règle une somme qu’elle doit.',
      descAr: 'تسديد مبلغ من دين قديم مستحق.',
      example: 'مثال: عميل يسدد ديناً قديماً كان عليه (ينقص الدين)',
      color: '#3b82f6',
      border: 'rgba(59, 130, 246, 0.5)',
      bg: 'rgba(59, 130, 246, 0.1)',
      icon: FiCheck
    }
  ];

  const advancedTypes = [
    {
      id: 'debt_recovery',
      nameAr: 'استرداد دين',
      desc: 'Récupérer de l’argent qui était donné comme dette.',
      descAr: 'استرجاع رصيد كان قد أُعطي كدين سابقاً وإلغاء الدين المقابل.',
      color: '#ef4444',
      icon: FiRotateCcw
    },
    {
      id: 'cash_recovery',
      nameAr: 'استرداد نقد',
      desc: 'Récupérer de l’argent donné en espèces.',
      descAr: 'استرجاع رصيد أُعطي نقداً (إرجاع نقدي).',
      color: '#8b5cf6',
      icon: FiRotateCcw
    },
    {
      id: 'payment_recovery',
      nameAr: 'استرداد دفع',
      desc: 'Récupérer une somme liée à un paiement.',
      descAr: 'إلغاء أو استرجاع عملية تسديد سابقة.',
      color: '#ec4899',
      icon: FiRotateCcw
    }
  ];

  const currentTypeObj = [...primaryTypes, ...advancedTypes].find(t => t.id === type) || primaryTypes[1];

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div 
        className="modal" 
        onClick={e => e.stopPropagation()} 
        style={{ maxWidth: 640, width: '100%', maxHeight: '92vh', overflowY: 'auto' }}
      >
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'rgba(99, 102, 241, 0.12)', color: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <FiSend size={18} />
            </div>
            <div>
              <h3 className="modal-title" style={{ margin: 0, fontSize: 17 }}>{t('تحويل رصيد مالي')}</h3>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                {t('خطوات التحويل: المستلم، المبلغ، نوع العملية، ثم التأكيد')}
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

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

        <form onSubmit={handleTransfer} style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 18 }}>
          
          {/* Step 1: Select Recipient */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
              <span>{t('1. الشخص المستلم')} <span style={{ color: 'var(--danger)' }}>*</span></span>
              {selectedUser && (
                <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 500 }}>
                  {t('الرصيد')}: {parseFloat(selectedUser.wallet || 0).toLocaleString()} د.ج | {t('الديون')}: {parseFloat(selectedUser.debt || 0).toLocaleString()} د.ج
                </span>
              )}
            </label>

            {defaultRecipient ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13
                }}>
                  {defaultRecipient.full_name?.charAt(0) || defaultRecipient.username?.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{defaultRecipient.full_name || defaultRecipient.username}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>@{defaultRecipient.username} • {defaultRecipient.role}</div>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ position: 'relative' }}>
                  <FiUser style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    className="form-input"
                    style={{ paddingRight: 36 }}
                    placeholder={t("اكتب اسم المستخدم أو ابحث من القائمة...")}
                    value={recipient}
                    onChange={e => {
                      setRecipient(e.target.value);
                      const match = usersList.find(u => u.username?.toLowerCase() === e.target.value.toLowerCase().trim());
                      setSelectedUser(match || null);
                    }}
                    list="users-datalist"
                  />
                  <datalist id="users-datalist">
                    {usersList.map(u => (
                      <option key={u.id} value={u.username}>
                        {u.full_name ? `${u.full_name} (@${u.username})` : u.username}
                      </option>
                    ))}
                  </datalist>
                </div>
                {usersList.length > 0 && !selectedUser && recipient.length > 0 && (
                  <div style={{
                    maxHeight: 120, overflowY: 'auto', border: '1px solid var(--border)',
                    borderRadius: 6, marginTop: 4, background: 'var(--bg-card)'
                  }}>
                    {usersList
                      .filter(u => u.username.toLowerCase().includes(recipient.toLowerCase()) || (u.full_name && u.full_name.toLowerCase().includes(recipient.toLowerCase())))
                      .slice(0, 5)
                      .map(u => (
                        <div
                          key={u.id}
                          onClick={() => handleSelectUser(u)}
                          style={{
                            padding: '8px 12px', fontSize: 12, cursor: 'pointer',
                            display: 'flex', justifyContent: 'space-between',
                            borderBottom: '1px solid var(--border)'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <span style={{ fontWeight: 600 }}>{u.full_name || u.username} (@{u.username})</span>
                          <span style={{ color: 'var(--text-muted)' }}>{parseFloat(u.wallet || 0).toLocaleString()} د.ج</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 2: Amount Input */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600, fontSize: 13 }}>
              {t('2. مبلغ التحويل (د.ج)')} <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-input"
                type="number"
                min="1"
                step="any"
                placeholder={t("أدخل المبلغ (مثال: 2000)")}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                style={{
                  fontSize: 16, fontWeight: 700, letterSpacing: 0.5,
                  borderColor: amount !== '' && !isAmountValid ? 'var(--danger)' : undefined
                }}
              />
              <span style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                fontSize: 13, fontWeight: 600, color: 'var(--text-muted)'
              }}>
                {t('د.ج')}
              </span>
            </div>

            {/* Validation warning if empty or <= 0 */}
            {amount !== '' && !isAmountValid && (
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--danger)', fontWeight: 500 }}>
                {t('المبلغ غير صالح، يجب أن يكون أكبر تماماً من 0 د.ج')}
              </p>
            )}
          </div>

          {/* Step 3: Choose Transfer Type */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>
                {t('3. سبب ونوع التحويل')} <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                style={{ fontSize: 11, padding: '2px 8px' }}
                onClick={() => setShowAdvancedTypes(!showAdvancedTypes)}
              >
                {showAdvancedTypes ? t('إخفاء خيارات الاسترداد') : t('خيارات الاسترداد الأخرى ▼')}
              </button>
            </div>

            {/* Primary 3 choices: Dette, Espèces, Paiement */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
              {primaryTypes.map(item => {
                const isSelected = type === item.id;
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    onClick={() => setType(item.id)}
                    style={{
                      border: isSelected ? `2px solid ${item.color}` : '1px solid var(--border)',
                      background: isSelected ? item.bg : 'var(--bg-card)',
                      borderRadius: 10,
                      padding: '12px 14px',
                      cursor: 'pointer',
                      transition: 'all 0.18s ease',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 14, color: item.color }}>
                        <Icon size={16} />
                        <span>{item.nameAr}</span>
                      </div>
                      <div style={{
                        width: 18, height: 18, borderRadius: '50%',
                        border: isSelected ? `5px solid ${item.color}` : '2px solid var(--border)',
                        background: '#fff'
                      }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {item.desc}
                    </div>
                    <div style={{
                      fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-input)',
                      padding: '4px 6px', borderRadius: 4, marginTop: 2
                    }}>
                      {item.example}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Advanced / Outgoing recovery choices */}
            {showAdvancedTypes && (
              <div style={{
                marginTop: 12, padding: 12, background: 'var(--bg-input)', borderRadius: 8,
                border: '1px dashed var(--border)'
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                  {t('التحويلات المغادرة والاسترداد (Sortants / Récupérations):')}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
                  {advancedTypes.map(item => {
                    const isSelected = type === item.id;
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setType(item.id)}
                        style={{
                          border: isSelected ? `2px solid ${item.color}` : '1px solid var(--border)',
                          background: isSelected ? 'var(--bg-card)' : 'transparent',
                          borderRadius: 8,
                          padding: '10px',
                          cursor: 'pointer',
                          transition: 'all 0.18s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 12, color: item.color }}>
                          <Icon size={14} />
                          <span>{item.nameAr}</span>
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.3 }}>
                          {item.desc}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Step 4: Remarks / Notes */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600, fontSize: 13 }}>
              {t('4. ملاحظة أو بيان (اختياري)')}
            </label>
            <input
              className="form-input"
              placeholder={t("اكتب سبباً أو ملاحظة توضيحية للعملية...")}
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {/* Step 5: Verification & Confirmation Box */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
              {t('5. مراجعة وتأكيد تفاصيل التحويل')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, fontSize: 13 }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{t('المستلم')}:</span>
                <div style={{ fontWeight: 700, color: 'var(--primary)' }}>
                  {selectedUser?.full_name || recipient || '-'}
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{t('المبلغ المراد تحويله')}:</span>
                <div style={{ fontWeight: 800, fontSize: 15, color: isAmountValid ? 'var(--success)' : 'var(--text-muted)' }}>
                  {isAmountValid ? `${numAmount.toLocaleString()} د.ج` : '-'}
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{t('نوع العملية')}:</span>
                <div style={{ fontWeight: 700, color: currentTypeObj.color }}>
                  {currentTypeObj.nameAr}
                </div>
              </div>
            </div>
          </div>

          {/* Step 6: Confirmation Action Button */}
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
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
              style={{ flex: 2, justifyContent: 'center', fontWeight: 700, fontSize: 14 }}
              disabled={!canSubmit}
            >
              {submitting ? (
                <>
                  <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, marginRight: 6 }} />
                  {t('جاري التحويل...')}
                </>
              ) : (
                <>
                  <FiSend size={15} style={{ marginLeft: 6 }} />
                  {t('تأكيد التحويل الآن')}
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

