import { useState, useEffect, useCallback } from 'react';
import { offerMappingsApi } from '../api/offerMappingsApi';
import { useLanguage } from '../contexts/LanguageContext';
import {
  FiLink, FiPlus, FiEdit2, FiTrash2, FiX, FiRefreshCw,
  FiCheckCircle, FiAlertTriangle, FiCpu, FiPlay, FiLayers,
  FiZap, FiWifi, FiCreditCard, FiCheck, FiSearch, FiSliders,
  FiInfo, FiActivity
} from 'react-icons/fi';

export default function OfferMappingsPage() {
  const { t } = useLanguage();

  // Core Data States
  const [mappings, setMappings] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [nodeApis, setNodeApis] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState('all'); // all, flexy_gros, flexy, offers, idoom, custom
  const [search, setSearch] = useState('');

  // Add / Edit Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    service_type: 'flexy_gros',
    operator: 'mobilis',
    offer_name: 'default',
    modemgrid_api_name: '',
    description: '',
    default_amount: '',
    is_active: true
  });

  // Test API Modal State
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testingApi, setTestingApi] = useState(false);
  const [testApiData, setTestApiData] = useState({
    api_name: '',
    phone_number: '0660000000',
    amount: '100',
    offer: '',
    node_id: ''
  });
  const [testResult, setTestResult] = useState(null);

  // Fetch all mappings, catalog, and available node APIs
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [mapsRes, catRes, nodeApisRes] = await Promise.all([
        offerMappingsApi.getOfferMappings().catch(() => ({ mappings: [] })),
        offerMappingsApi.getOfferCatalog().catch(() => ({ catalog: [] })),
        offerMappingsApi.getNodeApis().catch(() => ({ apis: [], nodes: [] }))
      ]);

      setMappings(mapsRes.mappings || []);
      setCatalog(catRes.catalog || []);
      setNodeApis(nodeApisRes.apis || []);
      setNodes(nodeApisRes.nodes || []);
    } catch (e) {
      console.error('Error fetching data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle active socket getallapis sync
  const handleSyncSocketApis = async (nodeId = null) => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await offerMappingsApi.syncNodeApis(nodeId);
      setNodeApis(res.apis || []);
      if (res.nodes) setNodes(res.nodes);
      setSyncMessage({
        type: 'success',
        text: `✅ تم جلب ${res.apis?.length || 0} واجهة API بنجاح عبر مقبس WSS (getallapis)`
      });
      fetchData();
    } catch (err) {
      setSyncMessage({
        type: 'error',
        text: `❌ فشل استيراد الواجهات: ${err.response?.data?.error || err.message}`
      });
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(null), 6000);
    }
  };

  const handleOpenModal = (mapping = null, prefillApi = null, catalogItem = null) => {
    if (mapping) {
      setEditingId(mapping.id);
      setFormData({
        service_type: mapping.service_type || 'flexy_gros',
        operator: mapping.operator || 'mobilis',
        offer_name: mapping.offer_name || 'default',
        modemgrid_api_name: mapping.modemgrid_api_name || '',
        description: mapping.description || '',
        default_amount: mapping.default_amount || '',
        is_active: mapping.is_active !== undefined ? mapping.is_active : true
      });
    } else if (catalogItem) {
      setEditingId(null);
      setFormData({
        service_type: catalogItem.service_type,
        operator: catalogItem.operator,
        offer_name: catalogItem.offer_name,
        modemgrid_api_name: catalogItem.modemgrid_api_name || '',
        description: catalogItem.title || '',
        default_amount: '',
        is_active: true
      });
    } else {
      setEditingId(null);
      setFormData({
        service_type: 'flexy_gros',
        operator: 'mobilis',
        offer_name: 'default',
        modemgrid_api_name: prefillApi ? prefillApi.name : '',
        description: prefillApi ? (prefillApi.description || `واجهة ${prefillApi.name}`) : '',
        default_amount: '',
        is_active: true
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!formData.offer_name || !formData.modemgrid_api_name) {
      alert(t('الرجاء إدخال اسم العرض واسم واجهة الـ API'));
      return;
    }

    try {
      const payload = {
        ...formData,
        default_amount: formData.default_amount ? parseFloat(formData.default_amount) : null
      };

      if (editingId) {
        await offerMappingsApi.updateOfferMapping(editingId, payload);
      } else {
        await offerMappingsApi.createOfferMapping(payload);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || t('حدث خطأ أثناء حفظ الربط'));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('هل أنت متأكد من حذف هذا الربط؟'))) return;
    try {
      await offerMappingsApi.deleteOfferMapping(id);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || t('فشل حذف الربط'));
    }
  };

  const handleQuickAssign = async (catalogItem, apiName) => {
    try {
      if (catalogItem.mapping_id) {
        await offerMappingsApi.updateOfferMapping(catalogItem.mapping_id, {
          modemgrid_api_name: apiName,
          is_active: true
        });
      } else {
        await offerMappingsApi.createOfferMapping({
          service_type: catalogItem.service_type,
          operator: catalogItem.operator,
          offer_name: catalogItem.offer_name,
          modemgrid_api_name: apiName,
          description: catalogItem.title,
          is_active: true
        });
      }
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || t('فشل تعيين الواجهة'));
    }
  };

  const openTestModal = (apiName) => {
    setTestApiData({
      api_name: apiName,
      phone_number: '0660000000',
      amount: '100',
      offer: '',
      node_id: nodes.find(n => n.online)?.id || ''
    });
    setTestResult(null);
    setTestModalOpen(true);
  };

  const handleRunTest = async (e) => {
    e.preventDefault();
    setTestingApi(true);
    setTestResult(null);
    try {
      const res = await offerMappingsApi.testApi({
        api_name: testApiData.api_name,
        variables: {
          phone_number: testApiData.phone_number,
          phone: testApiData.phone_number,
          amount: testApiData.amount,
          price: testApiData.amount,
          offer: testApiData.offer || undefined
        },
        node_id: testApiData.node_id ? parseInt(testApiData.node_id) : undefined
      });
      setTestResult(res);
    } catch (err) {
      setTestResult({
        success: false,
        error: err.response?.data?.error || err.message
      });
    } finally {
      setTestingApi(false);
    }
  };

  // Filtered lists
  const filteredMappings = mappings.filter(m => {
    const term = search.toLowerCase();
    const matchesSearch =
      m.offer_name?.toLowerCase().includes(term) ||
      m.modemgrid_api_name?.toLowerCase().includes(term) ||
      m.operator?.toLowerCase().includes(term) ||
      m.description?.toLowerCase().includes(term);

    if (!matchesSearch) return false;
    if (activeTab === 'all') return true;
    if (activeTab === 'flexy_gros') return m.service_type === 'flexy_gros';
    if (activeTab === 'flexy') return m.service_type === 'flexy' && (m.offer_name === 'default' || m.offer_name === '');
    if (activeTab === 'offers') return m.service_type === 'flexy' && m.offer_name !== 'default' && m.offer_name !== '';
    if (activeTab === 'idoom') return m.service_type === 'idoom';
    if (activeTab === 'custom') return !['flexy', 'flexy_gros', 'idoom'].includes(m.service_type);
    return true;
  });

  const filteredCatalog = catalog.filter(c => {
    const term = search.toLowerCase();
    const matchesSearch =
      c.title?.toLowerCase().includes(term) ||
      c.offer_name?.toLowerCase().includes(term) ||
      c.operator?.toLowerCase().includes(term);

    if (!matchesSearch) return false;
    if (activeTab === 'all') return true;
    if (activeTab === 'flexy_gros') return c.service_type === 'flexy_gros';
    if (activeTab === 'flexy') return c.service_type === 'flexy' && c.offer_name === 'default';
    if (activeTab === 'offers') return c.category === 'offers';
    if (activeTab === 'idoom') return c.service_type === 'idoom';
    return true;
  });

  const onlineNodesCount = nodes.filter(n => n.online).length;

  return (
    <div className="fade-in offer-mappings-page">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: 'linear-gradient(135deg, var(--primary, #6366f1), #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 20
            }}>
              <FiSliders />
            </div>
            <div>
              <h1 className="page-title" style={{ margin: 0 }}>{t('إدارة العروض وتخصيص واجهات الـ API')}</h1>
              <p className="page-subtitle" style={{ margin: 0 }}>
                {t('ربط وتخصيص عروض فليكسي جملة، فليكسي عادي، عروض المشغلين، وأيدوم مع واجهات ModemGrid')}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            className={`btn btn-secondary ${syncing ? 'disabled' : ''}`}
            onClick={() => handleSyncSocketApis()}
            disabled={syncing}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary, #6366f1)',
              borderColor: 'rgba(99, 102, 241, 0.3)'
            }}
            title="إرسال طلب getallapis إلى أجهزة ModemGrid عبر WebSocket لجلب كافة الواجهات"
          >
            <FiRefreshCw className={syncing ? 'spinner' : ''} />
            {syncing ? t('جاري الجلب عبر المقبس...') : t('📡 جلب واجهات الـ API من السيرفر (getallapis)')}
          </button>

          <button
            className="btn btn-primary"
            onClick={() => handleOpenModal()}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <FiPlus /> {t('إضافة ربط أو عرض مخصص')}
          </button>
        </div>
      </div>

      {/* Sync Message Alert */}
      {syncMessage && (
        <div style={{
          padding: '12px 18px', borderRadius: 10, marginBottom: 20,
          background: syncMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${syncMessage.type === 'success' ? '#10b981' : '#ef4444'}`,
          color: syncMessage.type === 'success' ? '#10b981' : '#ef4444',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <span>{syncMessage.text}</span>
          <FiX style={{ cursor: 'pointer' }} onClick={() => setSyncMessage(null)} />
        </div>
      )}

      {/* Node Status Bar & Discovered Server APIs Shelf */}
      <div className="card" style={{
        marginBottom: 24, padding: '16px 20px',
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.06), rgba(139, 92, 246, 0.04))',
        border: '1px solid rgba(99, 102, 241, 0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 6 }}>
              <FiCpu color="var(--primary)" /> {t('واجهات الـ API المتوفرة في سيرفر ModemGrid')}
            </span>
            <span className="badge" style={{
              background: onlineNodesCount > 0 ? '#10b981' : '#ef4444',
              color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 12
            }}>
              {onlineNodesCount} {t('أجهزة متصلة')}
            </span>
            <span className="badge" style={{ background: 'rgba(255,255,255,0.08)', fontSize: 11 }}>
              {nodeApis.length} {t('واجهة API مسجلة')}
            </span>
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            مقبس WSS: <code>{"{\"type\": \"getallapis\", \"request_id\": \"...\"}"}</code>
          </div>
        </div>

        {/* APIs Pills Grid */}
        {nodeApis.length === 0 ? (
          <div style={{ padding: '16px 0', color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
            {t('لم يتم العثور على واجهات بعد. انقر على زر "جلب واجهات الـ API من السيرفر" لإرسال طلب getallapis لجهاز ModemGrid.')}
          </div>
        ) : (
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 8, maxHeight: 150, overflowY: 'auto', padding: '4px 0'
          }}>
            {nodeApis.map((api, idx) => {
              const isAssigned = mappings.some(m => m.modemgrid_api_name === api.name);
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: isAssigned ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-input, rgba(255,255,255,0.05))',
                    border: `1px solid ${isAssigned ? 'rgba(16, 185, 129, 0.3)' : 'var(--border)'}`,
                    borderRadius: 8, padding: '6px 12px', fontSize: 12
                  }}
                >
                  <code style={{ fontWeight: 'bold', color: isAssigned ? '#10b981' : 'var(--accent, #a78bfa)' }}>
                    {api.name}
                  </code>

                  {api.description && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={api.description}>
                      ({api.description})
                    </span>
                  )}

                  <div style={{ display: 'flex', gap: 4, marginLeft: 4 }}>
                    <button
                      className="btn btn-sm"
                      style={{ padding: '2px 6px', fontSize: 10, background: 'transparent', border: '1px solid var(--border)' }}
                      onClick={() => handleOpenModal(null, api)}
                      title={t('ربط هذا الـ API بعرض أو خدمة')}
                    >
                      <FiLink size={10} /> {t('ربط')}
                    </button>
                    <button
                      className="btn btn-sm"
                      style={{ padding: '2px 6px', fontSize: 10, background: 'transparent', border: '1px solid var(--border)' }}
                      onClick={() => openTestModal(api.name)}
                      title={t('تجربة هذه الواجهة الآن')}
                    >
                      <FiPlay size={10} color="#10b981" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tabs & Search */}
      <div className="card" style={{ marginBottom: 20, padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          {/* Service Tabs */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'الكل', icon: FiLayers },
              { id: 'flexy_gros', label: 'فليكسي جملة (Flexy Gros)', icon: FiZap, color: '#f59e0b' },
              { id: 'flexy', label: 'فليكسي عادي (Flexy)', icon: FiZap, color: '#10b981' },
              { id: 'offers', label: 'عروض المشغلين (Sama / PixX / Hayla / Gold)', icon: FiSliders, color: '#ed1c24' },
              { id: 'idoom', label: 'أيدوم إنترنت (Idoom ADSL/Fibre)', icon: FiWifi, color: '#3b82f6' },
              { id: 'custom', label: 'خدمات مخصصة (Custom)', icon: FiCpu }
            ].map(tab => (
              <button
                key={tab.id}
                className={`btn btn-sm ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  borderRadius: 20, fontSize: 12, padding: '5px 14px',
                  display: 'flex', alignItems: 'center', gap: 6
                }}
              >
                <tab.icon size={13} color={tab.color} />
                {t(tab.label)}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="header-search" style={{ minWidth: 260 }}>
            <FiSearch />
            <input
              placeholder={t('البحث باسم العرض، المشغل، أو اسم API...')}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Catalog & Mappings Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 50 }}>
              <span className="spinner" style={{ margin: '0 auto' }} />
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>{t('نوع الخدمة')}</th>
                  <th>{t('المشغل')}</th>
                  <th>{t('العرض / الخدمة')}</th>
                  <th>{t('واجهة ModemGrid المربوطة (API Name)')}</th>
                  <th>{t('الوصف / ملاحظات')}</th>
                  <th>{t('الحالة')}</th>
                  <th style={{ textAlign: 'center' }}>{t('الإجراءات')}</th>
                </tr>
              </thead>
              <tbody>
                {/* 1. Mapped Rows */}
                {filteredMappings.map(m => (
                  <tr key={`map-${m.id}`}>
                    <td>
                      <span className={`badge-status ${m.service_type === 'flexy_gros' ? 'warning' : 'pending'}`} style={{ textTransform: 'capitalize' }}>
                        {m.service_type === 'flexy_gros' ? t('فليكسي جملة') : m.service_type}
                      </span>
                    </td>
                    <td>
                      <span className={`badge`} style={{
                        textTransform: 'uppercase', fontSize: 11, fontWeight: 'bold',
                        background: m.operator === 'mobilis' ? '#00b140' : m.operator === 'djezzy' ? '#e4002b' : m.operator === 'ooredoo' ? '#ed1c24' : '#3b82f6',
                        color: '#fff'
                      }}>
                        {m.operator}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {m.offer_name === 'default' ? t('الافتراضي لجميع العمليات') : m.offer_name}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <code style={{
                          padding: '3px 8px', borderRadius: 6,
                          background: 'rgba(16, 185, 129, 0.1)', color: '#10b981',
                          fontWeight: 'bold', fontSize: 13
                        }}>
                          {m.modemgrid_api_name}
                        </code>
                        <button
                          className="btn btn-sm btn-secondary"
                          style={{ padding: '2px 6px', fontSize: 11 }}
                          onClick={() => openTestModal(m.modemgrid_api_name)}
                          title={t('اختبار استجابة هذه الواجهة')}
                        >
                          <FiPlay size={11} color="#10b981" /> {t('تجربة')}
                        </button>
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {m.description || '—'}
                    </td>
                    <td>
                      <span className={`badge-status ${m.is_active ? 'success' : 'danger'}`}>
                        {m.is_active ? t('نشط') : t('معطل')}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleOpenModal(m)}
                          title={t('تعديل')}
                        >
                          <FiEdit2 size={13} />
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(m.id)}
                          title={t('حذف')}
                        >
                          <FiTrash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {/* 2. Unmapped Catalog Suggestions */}
                {filteredCatalog.filter(c => !c.is_mapped).map((cat, idx) => (
                  <tr key={`cat-${idx}`} style={{ background: 'rgba(245, 158, 11, 0.03)' }}>
                    <td>
                      <span className={`badge-status pending`} style={{ opacity: 0.7 }}>
                        {cat.service_type === 'flexy_gros' ? t('فليكسي جملة') : cat.service_type}
                      </span>
                    </td>
                    <td>
                      <span className="badge" style={{
                        textTransform: 'uppercase', fontSize: 11,
                        background: cat.operator === 'mobilis' ? '#00b140' : cat.operator === 'djezzy' ? '#e4002b' : cat.operator === 'ooredoo' ? '#ed1c24' : '#3b82f6',
                        color: '#fff', opacity: 0.8
                      }}>
                        {cat.operator}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {cat.title}
                    </td>
                    <td>
                      {/* One-click assign dropdown */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <select
                          className="form-select"
                          style={{ padding: '4px 8px', fontSize: 12, minWidth: 160 }}
                          defaultValue=""
                          onChange={e => {
                            if (e.target.value) handleQuickAssign(cat, e.target.value);
                          }}
                        >
                          <option value="" disabled>-- {t('اختر واجهة من السيرفر للربط')} --</option>
                          {nodeApis.map(api => (
                            <option key={api.name} value={api.name}>{api.name}</option>
                          ))}
                        </select>
                        <span style={{ fontSize: 11, color: '#f59e0b', whiteSpace: 'nowrap' }}>
                          <FiAlertTriangle style={{ marginLeft: 3 }} /> {t('غير مربوط')}
                        </span>
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {t('عرض قياسي في النظام')}
                    </td>
                    <td>
                      <span className="badge-status pending" style={{ fontSize: 11 }}>
                        {t('بانتظار التعيين')}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <button
                          className="btn btn-sm btn-primary"
                          style={{ fontSize: 11, padding: '4px 10px' }}
                          onClick={() => handleOpenModal(null, null, cat)}
                        >
                          <FiPlus size={12} /> {t('تخصيص الربط')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal fade-in" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FiLink color="var(--primary)" />
                {editingId ? t('تعديل ربط الـ API') : t('إضافة ربط أو عرض مخصص جديد')}
              </h3>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowModal(false)}>
                <FiX />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div className="form-group">
                  <label className="form-label">{t('نوع الخدمة')}</label>
                  <select
                    className="form-select"
                    value={formData.service_type}
                    onChange={e => setFormData({ ...formData, service_type: e.target.value })}
                  >
                    <option value="flexy_gros">{t('فليكسي جملة (Flexy Gros)')}</option>
                    <option value="flexy">{t('فليكسي عادي / عروض (Flexy & Offers)')}</option>
                    <option value="idoom">{t('أيدوم إنترنت (Idoom ADSL / Fibre)')}</option>
                    <option value="cards">{t('بطاقات التعبئة (Cards)')}</option>
                    <option value="custom">{t('خدمة مخصصة (Custom Service)')}</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">{t('المتعامل / المشغل')}</label>
                  <select
                    className="form-select"
                    value={formData.operator}
                    onChange={e => setFormData({ ...formData, operator: e.target.value })}
                  >
                    <option value="mobilis">Mobilis (موبيليس)</option>
                    <option value="djezzy">Djezzy (جيزي)</option>
                    <option value="ooredoo">Ooredoo (أوريدو)</option>
                    <option value="adsl">Idoom ADSL</option>
                    <option value="fibre">Idoom Fibre</option>
                    <option value="4g_lte">Idoom 4G LTE</option>
                    <option value="custom">مشغل آخر / مخصص</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">
                  {t('اسم العرض أو العملية (Offer Name)')} <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  className="form-input"
                  required
                  placeholder="default (أو اسم العرض مثل Sama Mix 1000 أو gros)"
                  value={formData.offer_name}
                  onChange={e => setFormData({ ...formData, offer_name: e.target.value })}
                />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  {t('ضع default لتعيين هذا الـ API لكافة عمليات فليكسي أو فليكسي جملة لهذا المشغل، أو اكتب اسم العرض بالتفصيل.')}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">
                  {t('اسم واجهة ModemGrid المربوطة (API Name)')} <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  className="form-input"
                  required
                  list="node-apis-datalist"
                  placeholder="مثال: flexy_mobilis_gros أو sama_mix"
                  value={formData.modemgrid_api_name}
                  onChange={e => setFormData({ ...formData, modemgrid_api_name: e.target.value })}
                />
                <datalist id="node-apis-datalist">
                  {nodeApis.map((api, i) => (
                    <option key={i} value={api.name}>{api.description || api.name}</option>
                  ))}
                </datalist>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  {t('يمكنك الاختيار من الواجهات المستوردة من السيرفر أو كتابة اسم الواجهة يدوياً')}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 14 }}>
                <div className="form-group">
                  <label className="form-label">{t('الوصف (اختياري)')}</label>
                  <input
                    className="form-input"
                    placeholder="وصف توضيحي للإدارة..."
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t('المبلغ الافتراضي (دج)')}</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="0"
                    value={formData.default_amount}
                    onChange={e => setFormData({ ...formData, default_amount: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 20 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <span>{t('تفعيل هذا الربط فوراً للعمليات')}</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  {t('إلغاء')}
                </button>
                <button type="submit" className="btn btn-primary">
                  <FiCheck /> {editingId ? t('حفظ التعديلات') : t('إنشاء الربط')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEST API MODAL */}
      {testModalOpen && (
        <div className="modal-overlay" onClick={() => !testingApi && setTestModalOpen(false)}>
          <div className="modal fade-in" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FiPlay color="#10b981" /> {t('اختبار تنفيذ واجهة الـ API')}
              </h3>
              <button className="btn btn-icon btn-secondary" onClick={() => setTestModalOpen(false)}>
                <FiX />
              </button>
            </div>

            <form onSubmit={handleRunTest}>
              <div style={{
                background: 'rgba(99, 102, 241, 0.08)', borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 13
              }}>
                <div><strong>الواجهة المستهدفة:</strong> <code style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{testApiData.api_name}</code></div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  سيتم إرسال أمر تجريبي إلى جهاز ModemGrid واختبار تنفيذ كود الـ USSD.
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">{t('جهاز ModemGrid المستهدف')}</label>
                <select
                  className="form-select"
                  value={testApiData.node_id}
                  onChange={e => setTestApiData({ ...testApiData, node_id: e.target.value })}
                >
                  <option value="">-- {t('توجيه تلقائي لأول جهاز متصل')} --</option>
                  {nodes.map(n => (
                    <option key={n.id} value={n.id}>
                      {n.name} {n.online ? '🟢 متصل' : '🔴 غير متصل'}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 14 }}>
                <div className="form-group">
                  <label className="form-label">{t('رقم الهاتف التجريبي (Phone)')}</label>
                  <input
                    className="form-input"
                    value={testApiData.phone_number}
                    onChange={e => setTestApiData({ ...testApiData, phone_number: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t('المبلغ (Amount/Price)')}</label>
                  <input
                    className="form-input"
                    value={testApiData.amount}
                    onChange={e => setTestApiData({ ...testApiData, amount: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginBottom: 14 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setTestModalOpen(false)}>
                  {t('إغلاق')}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={testingApi}
                  style={{ background: '#10b981', borderColor: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {testingApi ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <FiPlay />}
                  {testingApi ? t('جاري التنفيذ...') : t('بدء الاختبار')}
                </button>
              </div>

              {testResult && (
                <div style={{
                  padding: 12, borderRadius: 8,
                  background: testResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${testResult.success ? '#10b981' : '#ef4444'}`,
                  fontSize: 12
                }}>
                  <div style={{ fontWeight: 'bold', color: testResult.success ? '#10b981' : '#ef4444', marginBottom: 4 }}>
                    {testResult.success ? '✓ نجحت استجابة الـ API من السيرفر:' : '✗ فشل تنفيذ الـ API:'}
                  </div>
                  <pre style={{
                    margin: 0, padding: 8, background: 'rgba(0,0,0,0.2)', borderRadius: 6,
                    maxHeight: 180, overflowY: 'auto', fontSize: 11
                  }}>
                    {JSON.stringify(testResult, null, 2)}
                  </pre>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
