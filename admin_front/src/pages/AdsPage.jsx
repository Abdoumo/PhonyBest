import { useState, useEffect } from 'react';
import { FiImage, FiPlus, FiTrash2, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import API from '../api/axios';

export default function AdsPage() {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  const [form, setForm] = useState({ title: '', image_url: '', content: '', active: true, order: 0 });

  const load = () => {
    setLoading(true);
    API.get('/ads/all')
      .then(r => setAds(r.data.ads || []))
      .catch(() => setAds([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.title || (!form.image_url && !form.image_file)) return;
    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('content', form.content);
      formData.append('active', form.active);
      formData.append('order', form.order);
      if (form.image_file) {
        formData.append('image', form.image_file);
      } else {
        formData.append('image_url', form.image_url);
      }
      
      if (form.id) {
        await API.put(`/ads/${form.id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await API.post('/ads', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      setShowModal(false);
      setForm({ title: '', image_url: '', image_file: null, content: '', active: true, order: 0 });
      load();
    } catch (e) {
      alert(e.response?.data?.error || 'حدث خطأ أثناء حفظ الإعلان');
    }
  };

  const handleEdit = (ad) => {
    setForm({ id: ad.id, title: ad.title, content: ad.content || '', image_url: ad.image_url, image_file: null, active: ad.active, order: ad.display_order || 0 });
    setShowModal(true);
  };

  const toggleAd = async (id, currentStatus) => {
    try {
      await API.put(`/ads/${id}`, { active: !currentStatus });
      load();
    } catch (e) {
      // For mock UI just toggle locally if API fails
      setAds(ads.map(ad => ad.id === id ? { ...ad, active: !currentStatus } : ad));
    }
  };

  const deleteAd = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الإعلان؟')) return;
    try {
      await API.delete(`/ads/${id}`);
      load();
    } catch (e) {
      setAds(ads.filter(ad => ad.id !== id));
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">إدارة الإعلانات</h1>
          <p className="page-subtitle">إدارة اللافتات الإعلانية المعروضة في واجهة المستخدمين</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <FiPlus size={14} style={{marginLeft:4}}/> إضافة إعلان
        </button>
      </div>

      <div className="grid-3">
        {loading ? (
          <div style={{gridColumn:'1 / -1', textAlign:'center', padding:40}}>
            <span className="spinner" style={{margin:'0 auto'}}/>
          </div>
        ) : ads.length === 0 ? (
          <div style={{gridColumn:'1 / -1', textAlign:'center', padding:40, background:'var(--bg-card)', borderRadius:'var(--radius)'}}>
            لا توجد إعلانات
          </div>
        ) : ads.map(ad => (
          <div className="card" key={ad.id} style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: 160, backgroundImage: `url(${ad.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{ad.title}</h3>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>{ad.content}</p>
                  <span className={`badge-status ${ad.active ? 'success' : 'pending'}`}>
                    {ad.active ? 'نشط' : 'متوقف'}
                  </span>
                </div>
                <div style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: 12, flexShrink: 0 }}>
                  الترتيب: {ad.display_order}
                </div>
              </div>
              
              <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
                <button className={`btn btn-sm ${ad.active ? 'btn-secondary' : 'btn-primary'}`} style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => toggleAd(ad.id, ad.active)}>
                  {ad.active ? <><FiToggleLeft size={14} style={{marginLeft:4}}/> إيقاف</> : <><FiToggleRight size={14} style={{marginLeft:4}}/> تفعيل</>}
                </button>
                <button className="btn btn-icon btn-secondary btn-sm" style={{ color: 'var(--info)' }} onClick={() => handleEdit(ad)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button className="btn btn-icon btn-secondary btn-sm" style={{ color: 'var(--danger)' }} onClick={() => deleteAd(ad.id)}>
                  <FiTrash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{form.id ? 'تعديل الإعلان' : 'إضافة إعلان جديد'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            
            <div className="form-group">
              <label className="form-label">عنوان الإعلان</label>
              <input className="form-input" placeholder="مثال: عروض رمضان" 
                value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
            </div>

            <div className="form-group">
              <label className="form-label">الوصف (Description)</label>
              <textarea className="form-input" style={{ minHeight: 80, resize: 'vertical' }} placeholder="أدخل وصف الإعلان أو النص المصاحب له"
                value={form.content} onChange={e => setForm({...form, content: e.target.value})} />
            </div>

            <div className="form-group">
              <label className="form-label">صورة الإعلان</label>
              <div style={{ marginBottom: 12 }}>
                <label style={{ 
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, 
                  padding: '24px 16px', border: '2px dashed var(--border)', borderRadius: 'var(--radius)', 
                  background: 'var(--bg-input)', cursor: 'pointer', transition: 'var(--transition)'
                }}
                onMouseOver={e => e.currentTarget.style.borderColor = 'var(--accent)'} 
                onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                  <FiImage size={32} color={form.image_file ? 'var(--success)' : 'var(--text-muted)'} />
                  <div style={{ fontSize: 13, fontWeight: 600, color: form.image_file ? 'var(--success)' : 'var(--text-secondary)' }}>
                    {form.image_file ? `تم اختيار: ${form.image_file.name}` : 'اضغط هنا لرفع صورة من جهازك'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>PNG, JPG (الحد الأقصى 5MB)</div>
                  <input type="file" accept="image/*" style={{ display: 'none' }} 
                    onChange={e => {
                      const file = e.target.files[0];
                      if (file) {
                        setForm({...form, image_file: file, image_url: URL.createObjectURL(file)});
                      }
                    }} />
                </label>
              </div>
              <div style={{ position:'relative' }}>
                <FiImage style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
                <input className="form-input" style={{ paddingRight:36 }} placeholder="أو أدخل رابط الصورة (URL) هنا" 
                  value={form.image_file ? '' : form.image_url} disabled={!!form.image_file} onChange={e => setForm({...form, image_url: e.target.value})} />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">الترتيب</label>
                <input className="form-input" type="number" 
                  value={form.order} onChange={e => setForm({...form, order: Number(e.target.value)})} />
              </div>
              <div className="form-group">
                <label className="form-label">الحالة</label>
                <select className="form-select" value={form.active ? 'true' : 'false'} onChange={e => setForm({...form, active: e.target.value === 'true'})}>
                  <option value="true">نشط</option>
                  <option value="false">متوقف</option>
                </select>
              </div>
            </div>

            {form.image_url && (
              <div style={{ marginBottom: 16 }}>
                <label className="form-label">معاينة الصورة</label>
                <div style={{ height: 120, borderRadius: 'var(--radius-sm)', backgroundImage: `url(${form.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center', border: '1px solid var(--border)' }} />
              </div>
            )}

            <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }} 
              onClick={handleSave} disabled={!form.title || (!form.image_url && !form.image_file)}>
              حفظ الإعلان
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
