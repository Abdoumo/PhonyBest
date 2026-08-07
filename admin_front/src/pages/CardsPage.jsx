import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSelector } from 'react-redux';
import { FiCreditCard, FiUpload, FiSearch, FiFilter, FiShoppingCart, FiSettings, FiTrash2, FiPlus } from 'react-icons/fi';
import API from '../api/axios';

const defaultCategories = [
  { id: 'ooredoo', name: 'Ooredoo', color: '#ed1c24', icon: 'O' },
  { id: 'djezzy', name: 'Djezzy', color: '#e4002b', icon: 'D' },
  { id: 'mobilis', name: 'Mobilis', color: '#00b140', icon: 'M' },
  { id: 'idoom', name: 'Idoom', color: '#3b82f6', icon: 'I' },
  { id: '4g', name: '4G LTE', color: '#8b5cf6', icon: '4G' },
  { id: 'freefire', name: 'FreeFire', color: '#f59e0b', icon: 'FF' },
  { id: 'pubg', name: 'PUBG', color: '#10b981', icon: 'P' },
];

export default function CardsPage() {
  const { t } = useLanguage();
  const { user } = useSelector(s => s.auth);
  const isAdmin = user?.role === 'ADMIN';

  const [categories, setCategories] = useState(defaultCategories);
  const [selectedCat, setSelectedCat] = useState(defaultCategories[0].id);
  const [cards, setCards] = useState([]);
  const [storeSummary, setStoreSummary] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFormat, setUploadFormat] = useState('serial_pin');
  const [uploadValue, setUploadValue] = useState(100);
  const [txtFile, setTxtFile] = useState(null);

  const [sendModal, setSendModal] = useState({ show: false, cardId: null, phone: '' });
  
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [buyForm, setBuyForm] = useState({ value: '', quantity: 1 });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('');
  const [valueFilter, setValueFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const [showManageCatModal, setShowManageCatModal] = useState(false);
  const [newCat, setNewCat] = useState({ id: '', name: '', color: '#6366f1', icon: '' });
  const [savingCats, setSavingCats] = useState(false);

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferForm, setTransferForm] = useState({ value: '', quantity: 1, client_id: '' });
  const [usersList, setUsersList] = useState([]);

  const loadUsers = async () => {
    if (!isAdmin) return;
    try {
      const { data } = await API.get('/users');
      if (data.users) {
        setUsersList(data.users.filter(u => u.role !== 'ADMIN'));
      }
    } catch (e) { console.error('Error loading users:', e); }
  };

  const loadCategories = async () => {
    try {
      const res = await API.get('/settings');
      let savedCats = res.data.settings?.card_categories;
      if (savedCats) {
        if (typeof savedCats === 'string') savedCats = JSON.parse(savedCats);
        if (Array.isArray(savedCats) && savedCats.length > 0) {
          setCategories(savedCats);
          if (!savedCats.find(c => c.id === selectedCat)) {
            setSelectedCat(savedCats[0].id);
          }
        }
      }
    } catch (e) { console.error('Error loading categories:', e); }
  };

  useEffect(() => { loadCategories(); loadUsers(); }, []);

  const loadCards = async () => {
    setLoading(true);
    try {
      let url = `/cards/stock?operator=${selectedCat}&page=${page}&ownerFilter=${ownerFilter}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (valueFilter) url += `&value=${valueFilter}`;
      if (dateFilter) url += `&date=${dateFilter}`;

      const { data } = await API.get(url);
      setCards(data.cards || []);
      setStoreSummary(data.store_summary || []);
      if (data.pagination) setPagination(data.pagination);
    } catch (err) {
      setCards([]);
      setStoreSummary([]);
    }
    setLoading(false);
  };

  useEffect(() => { setPage(1); }, [selectedCat, ownerFilter, statusFilter, valueFilter, dateFilter]);
  useEffect(() => { loadCards(); }, [selectedCat, page, ownerFilter, statusFilter, valueFilter, dateFilter]);

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setTxtFile(e.target.files[0]);
      setShowUploadModal(true);
    }
  };

  const processUpload = () => {
    if (!txtFile) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const lines = text.split('\n').map(l => l.trim()).filter(l => l);
      const parsedCards = lines.map(line => {
        // Handle common delimiters (comma, semicolon, colon, space, tab)
        const parts = line.split(/[,;:|\t]+/);
        let serial = '', pin = '';
        if (uploadFormat === 'serial_pin') { 
          serial = parts[0] || ''; pin = parts[1] || ''; 
        } else { 
          pin = parts[0] || ''; serial = parts[1] || ''; 
        }
        return { serial: serial.trim(), pin: pin.trim(), operator: selectedCat, value: uploadValue, category: selectedCat };
      }).filter(c => {
        // Filter out empty lines and CSV header rows
        if (!c.serial && !c.pin) return false;
        const isHeader = c.serial.toLowerCase() === 'serial' || c.pin.toLowerCase() === 'pin' || c.pin.toLowerCase() === 'code';
        return !isHeader;
      });
      
      try {
        const { data } = await API.post('/cards/upload', { cards: parsedCards });
        alert(t('تم رفع البطاقات بنجاح') + `!\n${t('تم استيراد')}: ${data.imported}\n${t('مكرر/فشل')}: ${data.duplicates}`);
        setShowUploadModal(false);
        setTxtFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        loadCards();
      } catch (err) {
        alert(t('حدث خطأ أثناء الرفع'));
      }
    };
    reader.readAsText(txtFile);
  };

  const handleSendCard = async () => {
    if (!sendModal.phone) return;
    try {
      await API.post(`/cards/${sendModal.cardId}/send`, { phone_number: sendModal.phone });
      alert(t('تم إرسال البطاقة بنجاح'));
      setSendModal({ show: false, cardId: null, phone: '' });
      loadCards();
    } catch (e) {
      alert(e.response?.data?.error || t('حدث خطأ أثناء الإرسال'));
    }
  };

    const handleBuyCards = async () => {
    if (!buyForm.value || buyForm.quantity < 1) return;
    try {
      await API.post('/cards/buy', { operator: selectedCat, value: buyForm.value, quantity: buyForm.quantity });
      alert(t('تم شراء البطاقات بنجاح'));
      setShowBuyModal(false);
      setBuyForm({ value: '', quantity: 1 });
      loadCards();
    } catch (e) {
      alert(e.response?.data?.error || t('حدث خطأ أثناء الشراء'));
    }
  };

  const handleSaveCategories = async (catsToSave) => {
    setSavingCats(true);
    try {
      await API.post('/settings', { card_categories: JSON.stringify(catsToSave) });
      setCategories(catsToSave);
      alert(t('تم حفظ الفئات بنجاح'));
    } catch (e) {
      alert(t('حدث خطأ أثناء حفظ الفئات'));
    }
    setSavingCats(false);
  };

  const handleTransferCards = async () => {
    if (!transferForm.value || transferForm.quantity < 1 || !transferForm.client_id) {
      alert(t('يرجى ملء جميع الحقول'));
      return;
    }
    try {
      await API.post('/cards/transfer-bulk', { 
        operator: selectedCat, 
        value: transferForm.value, 
        quantity: transferForm.quantity,
        client_id: transferForm.client_id
      });
      alert(t('تم تحويل البطاقات بنجاح'));
      setShowTransferModal(false);
      setTransferForm({ value: '', quantity: 1, client_id: '' });
      loadCards();
    } catch (e) {
      alert(e.response?.data?.error || t('حدث خطأ أثناء التحويل'));
    }
  };

  const handleAddCategory = () => {
    if (!newCat.id || !newCat.name || !newCat.icon) {
      alert(t('يرجى ملء جميع الحقول'));
      return;
    }
    if (categories.find(c => c.id === newCat.id)) {
      alert(t('معرف الفئة موجود مسبقاً'));
      return;
    }
    const updated = [...categories, newCat];
    handleSaveCategories(updated);
    setNewCat({ id: '', name: '', color: '#6366f1', icon: '' });
  };

  const handleDeleteCategory = (id) => {
    if (categories.length === 1) {
      alert(t('لا يمكن حذف جميع الفئات'));
      return;
    }
    if (!window.confirm(t('هل أنت متأكد من حذف هذه الفئة؟'))) return;
    const updated = categories.filter(c => c.id !== id);
    if (selectedCat === id) setSelectedCat(updated[0].id);
    handleSaveCategories(updated);
  };

  const filteredCards = cards.filter(c => {
    const matchSearch = (c.serial && c.serial.toLowerCase().includes(search.toLowerCase())) || 
                        (c.pin && c.pin.toLowerCase().includes(search.toLowerCase()));
    return matchSearch;
  });

  const availableStoreValues = storeSummary.filter(s => s.operator === selectedCat);

  const getCatSummary = () => {
    if (isAdmin) {
      return `(${t('الإجمالي')}: ${pagination.total})`;
    } else {
      const storeCount = storeSummary.filter(s => s.operator === selectedCat).reduce((sum, s) => sum + parseInt(s.available_count), 0);
      return `(${t('مخزوني')}: ${pagination.total} | ${t('متاح للشراء')}: ${storeCount})`;
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('إدارة البطاقات')}</h1>
          <p className="page-subtitle">{t('إدارة مخزون البطاقات والمبيعات')}</p>
        </div>
        {isAdmin ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="file" accept=".txt,.csv" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
            <button className="btn btn-secondary" onClick={() => setShowTransferModal(true)}>
              {t('إرسال للموزعين')}
            </button>
            <button className="btn btn-secondary" onClick={() => setShowManageCatModal(true)}>
              <FiSettings size={14} style={{marginLeft:4}}/> {t('إدارة الفئات')}
            </button>
            <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
              <FiUpload size={14} style={{marginLeft:4}}/> {t('رفع بطاقات')} ({t(categories.find(c => c.id === selectedCat)?.name || '')})
            </button>
          </div>
        ) : (
          <button className="btn btn-primary" onClick={() => setShowBuyModal(true)}>
            <FiShoppingCart size={14} style={{marginLeft:4}}/> {t('شراء بطاقات')} ({t(categories.find(c => c.id === selectedCat)?.name)})
          </button>
        )}
      </div>

      <div className="operator-tabs-scroll" style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16, marginBottom: 16 }}>
        {categories.map(c => (
          <div key={c.id} 
            onClick={() => setSelectedCat(c.id)}
            style={{ 
              minWidth: 120, height: 100, borderRadius: 'var(--radius)', border: `2px solid ${selectedCat === c.id ? c.color : 'var(--border)'}`, 
              background: selectedCat === c.id ? `${c.color}15` : 'var(--bg-card)', 
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
              cursor: 'pointer', transition: 'var(--transition)', flexShrink: 0 
            }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: c.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
              {c.icon}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: selectedCat === c.id ? c.color : 'var(--text-secondary)' }}>
              {t(c.name)}
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-title">{t('مخزون بطاقات')} {t(categories.find(c => c.id === selectedCat)?.name)} {getCatSummary()}</span>
          </div>
          <div className="filters-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            {isAdmin && (
              <select className="form-select" value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)}>
                <option value="all">{t('المالك')}: {t('الجميع')}</option>
                <option value="mine">{t('مخزوني فقط (متاح للبيع)')}</option>
                <option value="others">{t('مباعة للموزعين')}</option>
              </select>
            )}
            <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">{t('الحالة')}: {t('الكل')}</option>
              <option value="available">{t('متاح')}</option>
              <option value="sold">{t('مباع/مستخدم')}</option>
            </select>
            <input className="form-input" type="number" placeholder={t("فئة السعر (مثال: 1000)")} value={valueFilter} onChange={e => setValueFilter(e.target.value)} />
            <input className="form-input" type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
            <div style={{ position: 'relative' }}>
              <FiSearch style={{ position: 'absolute', right: 12, top: 10, color: 'var(--text-muted)' }} />
              <input style={{ paddingRight: 36, width: '100%', height: 38, borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }} placeholder={t("البحث بالسيريال أو PIN...")} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </div>

        <div style={{ overflow: 'auto', maxHeight: 500 }}>
          {loading ? (
            <div style={{ textAlign:'center', padding: 40 }}><span className="spinner" style={{ margin:'0 auto' }}/></div>
          ) : filteredCards.length === 0 ? (
            <div style={{ textAlign:'center', padding: 40, color: 'var(--text-muted)', lineHeight: 1.6 }}>{t('لا توجد بطاقات مطابقة.')}<br/>
              {isAdmin ? t('قم برفع ملف بطاقات أو تأكد من خيارات الفلترة.') : t('مخزونك فارغ، قم بشراء بطاقات من المتجر لتظهر هنا.')}
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>{t('السيريال')} (Serial)</th>
                  <th>{t('رمز الشحن')} (PIN)</th>
                  <th>{t('القيمة')} (Value)</th>
                  <th>{t('الحالة')}</th>
                  {isAdmin && <th>{t('المالك الحالي')}</th>}
                  <th>{t('تاريخ الإضافة')}</th>
                  <th>{t('إجراءات')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredCards.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-secondary)' }}>{c.serial || '-'}</td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, letterSpacing: 2 }}>{c.pin}</td>
                    <td style={{ fontWeight: 600 }}>{c.value}</td>
                    <td>
                      <span className={`badge-status ${c.status === 'available' ? 'success' : 'danger'}`}>
                        {c.status === 'available' ? t('متاح') : t('مباع/مستخدم')}
                      </span>
                    </td>
                    {isAdmin && (
                      <td style={{ fontSize: 13, fontWeight: 600, color: c.uploaded_by === user.id ? 'var(--success)' : 'var(--accent)' }}>
                        {c.uploaded_by === user.id ? t('الإدارة (مخزوني)') : c.owner_name}
                      </td>
                    )}
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(c.created_at).toLocaleString('ar-DZ')}</td>
                    <td style={{ display: 'flex', gap: 8 }}>
                      {c.status === 'available' && c.uploaded_by === user.id && (
                        <>
                          <button className="btn btn-sm btn-primary" onClick={() => setSendModal({ show: true, cardId: c.id, phone: '' })}>{t('إرسال لرقم')}</button>
                          <button className="btn btn-sm btn-secondary" onClick={async () => {
                            if (window.confirm(t('هل أنت متأكد من تعيين هذه البطاقة كمباعة/مستخدمة؟'))) {
                              try {
                                await API.put(`/cards/${c.id}/used`);
                                loadCards();
                              } catch (e) {
                                alert(t('حدث خطأ'));
                              }
                            }
                          }}>{t('تحديد كمستخدمة')}</button>
                        </>
                      )}
                      {isAdmin && c.uploaded_by !== user.id && c.status === 'available' && (
                         <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('مملوكة للموزع')}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          
          {pagination.pages > 1 && !loading && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
              <button className="btn btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>{t('الصفحة السابقة')}</button>
              <span style={{ padding: '4px 12px', background: 'var(--bg-input)', borderRadius: 4, fontSize: 13, display: 'flex', alignItems: 'center' }}>
                {t('صفحة')} {pagination.page} {t('من')} {pagination.pages}
              </span>
              <button className="btn btn-sm" disabled={page === pagination.pages} onClick={() => setPage(p => p + 1)}>{t('الصفحة التالية')}</button>
            </div>
          )}
        </div>
      </div>

      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{t('تكوين رفع الملف')}</h3>
              <button className="modal-close" onClick={() => setShowUploadModal(false)}>×</button>
            </div>
            
            <div style={{ marginBottom: 16, fontSize: 13, color: 'var(--text-muted)' }}>
              {t('الملف المختار')}: <strong style={{ color: 'var(--text-primary)' }}>{txtFile?.name}</strong>
            </div>

            <div className="form-group">
              <label className="form-label">{t('صيغة الملف (ترتيب الأعمدة)')}</label>
              <select className="form-select" value={uploadFormat} onChange={e => setUploadFormat(e.target.value)}>
                <option value="serial_pin">{t('السيريال')}, {t('كود الشحن')} (Serial → PIN)</option>
                <option value="pin_serial">{t('كود الشحن')}, {t('السيريال')} (PIN → Serial)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">{t('قيمة البطاقات (فئة السعر)')}</label>
              <input className="form-input" type="number" min="1" value={uploadValue} 
                onKeyDown={e => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                onChange={e => setUploadValue(Number(e.target.value))} />
            </div>

            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={processUpload}>{t('بدء الرفع')}</button>
          </div>
        </div>
      )}

      {sendModal.show && (
        <div className="modal-overlay" onClick={() => setSendModal({ show: false, cardId: null, phone: '' })}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{t('إرسال البطاقة')}</h3>
              <button className="modal-close" onClick={() => setSendModal({ show: false, cardId: null, phone: '' })}>×</button>
            </div>
            
            <div className="form-group">
              <label className="form-label">{t('رقم هاتف المستلم')}</label>
              <input className="form-input" placeholder={t("مثال: 0550000000")} value={sendModal.phone} onChange={e => setSendModal({...sendModal, phone: e.target.value})} />
            </div>

            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={handleSendCard}>{t('تأكيد الإرسال')}</button>
          </div>
        </div>
      )}

      {showBuyModal && (
        <div className="modal-overlay" onClick={() => setShowBuyModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{t('شراء بطاقات')} {categories.find(c => c.id === selectedCat)?.name}</h3>
              <button className="modal-close" onClick={() => setShowBuyModal(false)}>×</button>
            </div>
            
            <div className="form-group">
              <label className="form-label">{t('فئة البطاقة (السعر)')}</label>
              <select className="form-select" value={buyForm.value} onChange={e => setBuyForm({...buyForm, value: e.target.value})}>
                <option value="">-- {t('اختر الفئة')} --</option>
                {availableStoreValues.map(v => (
                  <option key={v.value} value={v.value}>
                    {v.value} {t('د.ج')} ({t('متاح')}: {v.available_count})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">{t('الكمية المطلوبة')}</label>
              <input className="form-input" type="number" min="1" value={buyForm.quantity} 
                onKeyDown={e => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                onChange={e => setBuyForm({...buyForm, quantity: Number(e.target.value)})} />
            </div>

            <div style={{ padding: 12, background: 'var(--bg-input)', borderRadius: 8, marginBottom: 16, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
              <span>{t('التكلفة الإجمالية')}:</span>
              <strong style={{ color: 'var(--primary)' }}>
                {buyForm.value ? (Number(buyForm.value) * buyForm.quantity).toLocaleString() : 0} {t('د.ج')}
              </strong>
            </div>

            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleBuyCards} disabled={!buyForm.value || buyForm.quantity < 1}>{t('تأكيد الشراء')}</button>
          </div>
        </div>
      )}

      {showTransferModal && isAdmin && (
        <div className="modal-overlay" onClick={() => setShowTransferModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{t('إرسال بطاقات لموزع')} - {categories.find(c => c.id === selectedCat)?.name}</h3>
              <button className="modal-close" onClick={() => setShowTransferModal(false)}>×</button>
            </div>
            
            <div className="form-group">
              <label className="form-label">{t('الموزع المستلم')}</label>
              <select className="form-select" value={transferForm.client_id} onChange={e => setTransferForm({...transferForm, client_id: e.target.value})}>
                <option value="">-- {t('اختر موزعاً')} --</option>
                {usersList.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name || u.username} ({u.role})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">{t('فئة البطاقة (السعر)')}</label>
              <select className="form-select" value={transferForm.value} onChange={e => setTransferForm({...transferForm, value: e.target.value})}>
                <option value="">-- {t('اختر الفئة')} --</option>
                {availableStoreValues.map(v => (
                  <option key={v.value} value={v.value}>
                    {v.value} {t('د.ج')} ({t('متاح في مخزونك')}: {v.available_count})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">{t('الكمية (عدد البطاقات)')}</label>
              <input className="form-input" type="number" min="1" value={transferForm.quantity} 
                onKeyDown={e => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                onChange={e => setTransferForm({...transferForm, quantity: Number(e.target.value)})} />
            </div>

            <div style={{ padding: 12, background: 'var(--bg-input)', borderRadius: 8, marginBottom: 16, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
              <span>{t('القيمة الإجمالية للبطاقات')}:</span>
              <strong style={{ color: 'var(--primary)' }}>
                {transferForm.value ? (Number(transferForm.value) * transferForm.quantity).toLocaleString() : 0} {t('د.ج')}
              </strong>
            </div>

            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleTransferCards} disabled={!transferForm.value || transferForm.quantity < 1 || !transferForm.client_id}>{t('تأكيد الإرسال')}</button>
          </div>
        </div>
      )}

      {showManageCatModal && isAdmin && (
        <div className="modal-overlay" onClick={() => setShowManageCatModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h3 className="modal-title">{t('إدارة الفئات')}</h3>
              <button className="modal-close" onClick={() => setShowManageCatModal(false)}>×</button>
            </div>
            
            <div className="table-wrapper" style={{ maxHeight: 300, overflow: 'auto', marginBottom: 16 }}>
              <table>
                <thead>
                  <tr>
                    <th>{t('المعرف')} (ID)</th>
                    <th>{t('الاسم')}</th>
                    <th>{t('الأيقونة')}</th>
                    <th>{t('اللون')}</th>
                    <th>{t('إجراء')}</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontFamily: 'monospace' }}>{c.id}</td>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: c.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 12 }}>
                          {c.icon}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 16, height: 16, borderRadius: 4, background: c.color }}></div>
                          {c.color}
                        </div>
                      </td>
                      <td>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDeleteCategory(c.id)} title={t('حذف')}>
                          <FiTrash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ padding: 16, background: 'var(--bg-input)', borderRadius: 'var(--radius)' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: 14 }}>{t('إضافة فئة جديدة')}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label className="form-label" style={{ fontSize: 12 }}>{t('المعرف (إنجليزي، بدون مسافات)')}</label>
                  <input className="form-input" placeholder="e.g. netflix" value={newCat.id} onChange={e => setNewCat({...newCat, id: e.target.value.toLowerCase().replace(/\s+/g, '')})} />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: 12 }}>{t('اسم الفئة')}</label>
                  <input className="form-input" placeholder="e.g. Netflix" value={newCat.name} onChange={e => setNewCat({...newCat, name: e.target.value})} />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: 12 }}>{t('نص الأيقونة (1-2 أحرف)')}</label>
                  <input className="form-input" placeholder="e.g. N" maxLength="2" value={newCat.icon} onChange={e => setNewCat({...newCat, icon: e.target.value})} />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: 12 }}>{t('اللون')}</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="color" style={{ width: 38, height: 38, padding: 0, border: 'none', borderRadius: 4, cursor: 'pointer' }} value={newCat.color} onChange={e => setNewCat({...newCat, color: e.target.value})} />
                    <input className="form-input" value={newCat.color} onChange={e => setNewCat({...newCat, color: e.target.value})} />
                  </div>
                </div>
              </div>
              <button className="btn btn-primary" onClick={handleAddCategory} disabled={savingCats}>
                {savingCats ? <span className="spinner" style={{width: 14, height: 14}} /> : <FiPlus size={14} style={{marginLeft: 4}} />}
                {t('إضافة فئة')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
