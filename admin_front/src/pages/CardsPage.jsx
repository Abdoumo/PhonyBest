import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { FiCreditCard, FiUpload, FiSearch, FiFilter, FiShoppingCart } from 'react-icons/fi';
import API from '../api/axios';

const categories = [
  { id: 'ooredoo', name: 'Ooredoo', color: '#ed1c24', icon: 'O' },
  { id: 'djezzy', name: 'Djezzy', color: '#e4002b', icon: 'D' },
  { id: 'mobilis', name: 'Mobilis', color: '#00b140', icon: 'M' },
  { id: 'idoom', name: 'Idoom', color: '#3b82f6', icon: 'I' },
  { id: '4g', name: '4G LTE', color: '#8b5cf6', icon: '4G' },
  { id: 'freefire', name: 'FreeFire', color: '#f59e0b', icon: 'FF' },
  { id: 'pubg', name: 'PUBG', color: '#10b981', icon: 'P' },
];

export default function CardsPage() {
  const { user } = useSelector(s => s.auth);
  const isAdmin = user?.role === 'ADMIN';

  const [selectedCat, setSelectedCat] = useState(categories[0].id);
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
      }).filter(c => c.serial || c.pin); // Filter invalid lines
      
      try {
        const { data } = await API.post('/cards/upload', { cards: parsedCards });
        alert(`تم رفع البطاقات بنجاح!\nتم استيراد: ${data.imported}\nمكرر/فشل: ${data.duplicates}`);
        setShowUploadModal(false);
        setTxtFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        loadCards();
      } catch (err) {
        alert('حدث خطأ أثناء الرفع');
      }
    };
    reader.readAsText(txtFile);
  };

  const handleSendCard = async () => {
    if (!sendModal.phone) return;
    try {
      await API.post(`/cards/${sendModal.cardId}/send`, { phone_number: sendModal.phone });
      alert('تم إرسال البطاقة بنجاح!');
      setSendModal({ show: false, cardId: null, phone: '' });
      loadCards();
    } catch (e) {
      alert(e.response?.data?.error || 'حدث خطأ أثناء الإرسال');
    }
  };

    const handleBuyCards = async () => {
    if (!buyForm.value || buyForm.quantity < 1) return;
    try {
      await API.post('/cards/buy', { operator: selectedCat, value: buyForm.value, quantity: buyForm.quantity });
      alert('تم شراء البطاقات بنجاح!');
      setShowBuyModal(false);
      setBuyForm({ value: '', quantity: 1 });
      loadCards();
    } catch (e) {
      alert(e.response?.data?.error || 'حدث خطأ أثناء الشراء');
    }
  };

  const filteredCards = cards.filter(c => {
    const matchSearch = (c.serial && c.serial.toLowerCase().includes(search.toLowerCase())) || 
                        (c.pin && c.pin.toLowerCase().includes(search.toLowerCase()));
    return matchSearch;
  });

  const availableStoreValues = storeSummary.filter(s => s.operator === selectedCat);

  const getCatSummary = () => {
    if (isAdmin) {
      return `(الإجمالي: ${pagination.total})`;
    } else {
      const storeCount = storeSummary.filter(s => s.operator === selectedCat).reduce((sum, s) => sum + parseInt(s.available_count), 0);
      return `(مخزوني: ${pagination.total} | متاح للشراء: ${storeCount})`;
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">إدارة البطاقات</h1>
          <p className="page-subtitle">إدارة مخزون البطاقات والمبيعات</p>
        </div>
        {isAdmin ? (
          <>
            <input type="file" accept=".txt" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
            <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
              <FiUpload size={14} style={{marginLeft:4}}/> رفع بطاقات (TXT) لـ {categories.find(c => c.id === selectedCat)?.name}
            </button>
          </>
        ) : (
          <button className="btn btn-primary" onClick={() => setShowBuyModal(true)}>
            <FiShoppingCart size={14} style={{marginLeft:4}}/> شراء بطاقات لـ {categories.find(c => c.id === selectedCat)?.name}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16, marginBottom: 16 }}>
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
              {c.name}
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-title">مخزون بطاقات {categories.find(c => c.id === selectedCat)?.name} {getCatSummary()}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            {isAdmin && (
              <select className="form-select" value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)}>
                <option value="all">المالك: الجميع</option>
                <option value="mine">مخزوني فقط (متاح للبيع)</option>
                <option value="others">مباعة للموزعين</option>
              </select>
            )}
            <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">الحالة: الكل</option>
              <option value="available">متاح</option>
              <option value="sold">مباع/مستخدم</option>
            </select>
            <input className="form-input" type="number" placeholder="فئة السعر (مثال: 1000)" value={valueFilter} onChange={e => setValueFilter(e.target.value)} />
            <input className="form-input" type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
            <div style={{ position: 'relative' }}>
              <FiSearch style={{ position: 'absolute', right: 12, top: 10, color: 'var(--text-muted)' }} />
              <input style={{ paddingRight: 36, width: '100%', height: 38, borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }} placeholder="البحث بالسيريال أو PIN..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </div>

        <div style={{ overflow: 'auto', maxHeight: 500 }}>
          {loading ? (
            <div style={{ textAlign:'center', padding: 40 }}><span className="spinner" style={{ margin:'0 auto' }}/></div>
          ) : filteredCards.length === 0 ? (
            <div style={{ textAlign:'center', padding: 40, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              لا توجد بطاقات مطابقة.<br/>
              {isAdmin ? 'قم برفع ملف بطاقات أو تأكد من خيارات الفلترة.' : 'مخزونك فارغ، قم بشراء بطاقات من المتجر لتظهر هنا.'}
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>السيريال (Serial)</th>
                  <th>رمز الشحن (PIN)</th>
                  <th>القيمة (Value)</th>
                  <th>الحالة</th>
                  {isAdmin && <th>المالك الحالي</th>}
                  <th>تاريخ الإضافة</th>
                  <th>إجراءات</th>
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
                        {c.status === 'available' ? 'متاح' : 'مباع/مستخدم'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td style={{ fontSize: 13, fontWeight: 600, color: c.uploaded_by === user.id ? 'var(--success)' : 'var(--accent)' }}>
                        {c.uploaded_by === user.id ? 'الإدارة (مخزوني)' : c.owner_name}
                      </td>
                    )}
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(c.created_at).toLocaleString('ar-DZ')}</td>
                    <td style={{ display: 'flex', gap: 8 }}>
                      {c.status === 'available' && c.uploaded_by === user.id && (
                        <>
                          <button className="btn btn-sm btn-primary" onClick={() => setSendModal({ show: true, cardId: c.id, phone: '' })}>
                            إرسال لرقم
                          </button>
                          <button className="btn btn-sm btn-secondary" onClick={async () => {
                            if (window.confirm('هل أنت متأكد من تعيين هذه البطاقة كمباعة/مستخدمة؟')) {
                              try {
                                await API.put(`/cards/${c.id}/used`);
                                loadCards();
                              } catch (e) {
                                alert('حدث خطأ');
                              }
                            }
                          }}>تحديد كمستخدمة</button>
                        </>
                      )}
                      {isAdmin && c.uploaded_by !== user.id && c.status === 'available' && (
                         <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>مملوكة للموزع</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          
          {pagination.pages > 1 && !loading && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
              <button className="btn btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                الصفحة السابقة
              </button>
              <span style={{ padding: '4px 12px', background: 'var(--bg-input)', borderRadius: 4, fontSize: 13, display: 'flex', alignItems: 'center' }}>
                صفحة {pagination.page} من {pagination.pages}
              </span>
              <button className="btn btn-sm" disabled={page === pagination.pages} onClick={() => setPage(p => p + 1)}>
                الصفحة التالية
              </button>
            </div>
          )}
        </div>
      </div>

      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">تكوين رفع الملف</h3>
              <button className="modal-close" onClick={() => setShowUploadModal(false)}>×</button>
            </div>
            
            <div style={{ marginBottom: 16, fontSize: 13, color: 'var(--text-muted)' }}>
              الملف المختار: <strong style={{ color: 'var(--text-primary)' }}>{txtFile?.name}</strong>
            </div>

            <div className="form-group">
              <label className="form-label">صيغة الملف (ترتيب الأعمدة)</label>
              <select className="form-select" value={uploadFormat} onChange={e => setUploadFormat(e.target.value)}>
                <option value="serial_pin">السيريال, كود الشحن (Serial ثم PIN)</option>
                <option value="pin_serial">كود الشحن, السيريال (PIN ثم Serial)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">قيمة البطاقات (فئة السعر)</label>
              <input className="form-input" type="number" value={uploadValue} onChange={e => setUploadValue(Number(e.target.value))} />
            </div>

            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={processUpload}>
              بدء الرفع
            </button>
          </div>
        </div>
      )}

      {sendModal.show && (
        <div className="modal-overlay" onClick={() => setSendModal({ show: false, cardId: null, phone: '' })}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">إرسال البطاقة</h3>
              <button className="modal-close" onClick={() => setSendModal({ show: false, cardId: null, phone: '' })}>×</button>
            </div>
            
            <div className="form-group">
              <label className="form-label">رقم هاتف المستلم</label>
              <input className="form-input" placeholder="مثال: 0550000000" value={sendModal.phone} onChange={e => setSendModal({...sendModal, phone: e.target.value})} />
            </div>

            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={handleSendCard}>
              تأكيد الإرسال
            </button>
          </div>
        </div>
      )}

      {showBuyModal && (
        <div className="modal-overlay" onClick={() => setShowBuyModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">شراء بطاقات {categories.find(c => c.id === selectedCat)?.name}</h3>
              <button className="modal-close" onClick={() => setShowBuyModal(false)}>×</button>
            </div>
            
            <div className="form-group">
              <label className="form-label">فئة البطاقة (السعر)</label>
              <select className="form-select" value={buyForm.value} onChange={e => setBuyForm({...buyForm, value: e.target.value})}>
                <option value="">-- اختر الفئة --</option>
                {availableStoreValues.map(v => (
                  <option key={v.value} value={v.value}>
                    {v.value} د.ج (متاح: {v.available_count})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">الكمية المطلوبة</label>
              <input className="form-input" type="number" min="1" value={buyForm.quantity} onChange={e => setBuyForm({...buyForm, quantity: Number(e.target.value)})} />
            </div>

            <div style={{ padding: 12, background: 'var(--bg-input)', borderRadius: 8, marginBottom: 16, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
              <span>التكلفة الإجمالية:</span>
              <strong style={{ color: 'var(--primary)' }}>
                {buyForm.value ? (Number(buyForm.value) * buyForm.quantity).toLocaleString() : 0} د.ج
              </strong>
            </div>

            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleBuyCards} disabled={!buyForm.value || buyForm.quantity < 1}>
              تأكيد الشراء
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
