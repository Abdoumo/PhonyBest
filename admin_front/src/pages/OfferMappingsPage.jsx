import { useState, useEffect, useCallback } from 'react';
import { offerMappingsApi } from '../api/offerMappingsApi';
import { useLanguage } from '../contexts/LanguageContext';
import { FiLink, FiPlus, FiEdit2, FiTrash2, FiX, FiRefreshCw } from 'react-icons/fi';

const getDefaultTemplate = (service_type, operator, offer_name) => {
  if (service_type === 'flexy') {
    return {
      description: `Send money via USSD for ${operator} ${offer_name}`,
      timeout_seconds: 60,
      variables: [
        { name: "phone_number", type: "string", required: true },
        { name: "amount", type: "string", required: true },
        { name: "pin_code", type: "string", required: true }
      ],
      steps: [
        { action: "send", code: "*707#" },
        { action: "send", code: "1" },
        { action: "send", code: "{phone_number}" },
        { action: "send", code: "{amount}" },
        { action: "send", code: "{pin_code}" },
        { action: "release" }
      ]
    };
  } else if (service_type === 'idoom') {
    return {
      description: `Effectuer recharge Idoom ${offer_name}`,
      timeout_seconds: 60,
      variables: [
        { name: "phone_number", type: "string", required: true },
        { name: "amount", type: "string", required: true }
      ],
      steps: [
        { action: "send", code: "*111#" },
        { action: "send", code: "2" },
        { action: "send", code: "{phone_number}" },
        { action: "send", code: "{amount}" },
        { action: "release" }
      ]
    };
  }
  
  return {
    description: `API for ${operator} ${offer_name}`,
    timeout_seconds: 60,
    variables: [
      { name: "phone_number", type: "string", required: true },
      { name: "price", type: "string", required: true }
    ],
    steps: []
  };
};

export default function OfferMappingsPage() {
  const { t } = useLanguage();
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [modemGridApis, setModemGridApis] = useState([]);
  
  // Form State
  const [formData, setFormData] = useState({
    service_type: 'idoom',
    operator: 'idoom',
    offer_name: '',
    modemgrid_api_name: '',
    sync_to_modemgrid: false,
    modemgrid_api_def: '{\n  "description": "",\n  "timeout_seconds": 60,\n  "variables": [\n    { "name": "phone_number", "type": "string", "required": true },\n    { "name": "price", "type": "string", "required": true }\n  ],\n  "steps": []\n}'
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [res, apisRes] = await Promise.all([
        offerMappingsApi.getOfferMappings(),
        offerMappingsApi.getModemGridApis().catch(() => ({ apis: [] }))
      ]);
      setMappings(res.mappings || []);
      setModemGridApis(apisRes.apis || []);
    } catch (e) {
      console.error('Error fetching mappings:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Dynamically update JSON description and name
  useEffect(() => {
    if (formData.sync_to_modemgrid && !editingId) {
      try {
        const parsedCurrent = JSON.parse(formData.modemgrid_api_def || '{}');
        const newTemplate = getDefaultTemplate(formData.service_type, formData.operator, formData.offer_name);
        
        // Preserve manually edited steps/variables if they exist, but update description
        // If the user hasn't edited the steps, or it's empty, replace it fully.
        // For simplicity, we fully replace the JSON to show the templates you requested!
        const newDef = JSON.stringify(newTemplate, null, 2);
        
        if (newDef !== formData.modemgrid_api_def) {
          setFormData(prev => ({ ...prev, modemgrid_api_def: newDef }));
        }
      } catch (e) {
        // Ignore JSON parse errors while typing
      }
    }
  }, [formData.service_type, formData.operator, formData.offer_name, formData.sync_to_modemgrid, editingId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenModal = (mapping = null) => {
    if (mapping) {
      setEditingId(mapping.id);
      setFormData({
        service_type: mapping.service_type,
        operator: mapping.operator,
        offer_name: mapping.offer_name,
        modemgrid_api_name: mapping.modemgrid_api_name,
        sync_to_modemgrid: false,
        modemgrid_api_def: ''
      });
    } else {
      setEditingId(null);
      setFormData({
        service_type: 'idoom',
        operator: 'idoom',
        offer_name: '',
        modemgrid_api_name: '',
        sync_to_modemgrid: false,
        modemgrid_api_def: JSON.stringify(getDefaultTemplate('idoom', 'idoom', ''), null, 2)
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.offer_name || !formData.modemgrid_api_name) {
      alert(t('الرجاء ملء الحقول الإجبارية'));
      return;
    }

    try {
      const payload = { ...formData };
      
      if (payload.sync_to_modemgrid) {
        try {
          payload.modemgrid_api_def = JSON.parse(payload.modemgrid_api_def);
        } catch (e) {
          alert('Invalid JSON in API Definition');
          return;
        }
      } else {
        delete payload.modemgrid_api_def;
      }

      if (editingId) {
        await offerMappingsApi.updateOfferMapping(editingId, payload);
      } else {
        await offerMappingsApi.createOfferMapping(payload);
      }
      setShowModal(false);
      fetchData();
    } catch (e) {
      alert(e.response?.data?.error || 'Error saving mapping');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('هل تريد حذف هذا الربط؟'))) return;
    try {
      await offerMappingsApi.deleteOfferMapping(id);
      fetchData();
    } catch (e) {
      alert('Error deleting mapping');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title"><FiLink /> {t('إدارة العروض و API')}</h1>
          <p className="page-subtitle">{t('ربط عروض النظام مع واجهات ModemGrid')}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={fetchData}>
            <FiRefreshCw size={14} /> {t('تحديث')}
          </button>
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            <FiPlus size={14} /> {t('إضافة ربط جديد')}
          </button>
        </div>
      </div>

      <div className="table-wrapper">
        <div className="table-header">
          <div className="table-title">{t('الروابط الحالية')} ({mappings.length})</div>
        </div>
        {mappings.length === 0 ? (
          <div className="mg-empty-state">
            <FiLink size={48} />
            <p>{t('لا توجد روابط مسجلة')}</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t('نوع الخدمة')}</th>
                <th>{t('المشغل')}</th>
                <th>{t('اسم العرض')}</th>
                <th>{t('اسم API (ModemGrid)')}</th>
                <th>{t('الحالة')}</th>
                <th>{t('إجراءات')}</th>
              </tr>
            </thead>
            <tbody>
              {mappings.map(m => (
                <tr key={m.id}>
                  <td><span className="badge-status pending">{m.service_type}</span></td>
                  <td>
                    <span className={`mg-dongle-operator ${m.operator.toLowerCase()}`}>
                      {m.operator}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{m.offer_name}</td>
                  <td style={{ fontFamily: 'monospace', color: 'var(--primary)' }}>{m.modemgrid_api_name}</td>
                  <td>
                    <span className={`badge-status ${m.is_active ? 'success' : 'danger'}`}>
                      {m.is_active ? t('نشط') : t('غير نشط')}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => handleOpenModal(m)}>
                        <FiEdit2 size={14} />
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(m.id)}>
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="mg-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="mg-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>{editingId ? t('تعديل الربط') : t('إضافة ربط جديد')}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <FiX size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">{t('نوع الخدمة')}</label>
                <select className="form-input" value={formData.service_type} onChange={e => setFormData({ ...formData, service_type: e.target.value })}>
                  <option value="idoom">Idoom</option>
                  <option value="flexy">Flexy</option>
                  <option value="cards">Cards</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">{t('المشغل')}</label>
                <select className="form-input" value={formData.operator} onChange={e => setFormData({ ...formData, operator: e.target.value })}>
                  <option value="idoom">Idoom</option>
                  <option value="mobilis">Mobilis</option>
                  <option value="djezzy">Djezzy</option>
                  <option value="ooredoo">Ooredoo</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t('اسم العرض (مثل: fibre أو adsl أو pixx)')} <span style={{color: 'red'}}>*</span></label>
              <input
                className="form-input"
                value={formData.offer_name}
                onChange={e => setFormData({ ...formData, offer_name: e.target.value })}
                placeholder="fibre"
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('اسم API في ModemGrid')} <span style={{color: 'red'}}>*</span></label>
              <input
                className="form-input"
                list="modemgrid-apis-list"
                value={formData.modemgrid_api_name}
                onChange={e => setFormData({ ...formData, modemgrid_api_name: e.target.value })}
                placeholder="idoom_fibre_api"
              />
              <datalist id="modemgrid-apis-list">
                {modemGridApis.map(api => (
                  <option key={api.id} value={api.name}>{api.description || api.name}</option>
                ))}
              </datalist>
            </div>

            {!editingId && (
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.sync_to_modemgrid}
                    onChange={e => setFormData({ ...formData, sync_to_modemgrid: e.target.checked })}
                  />
                  {t('إنشاء هذا الـ API في ModemGrid أيضاً؟')}
                </label>
              </div>
            )}

            {formData.sync_to_modemgrid && !editingId && (
              <div className="form-group">
                <label className="form-label">{t('تعريف API (JSON)')}</label>
                <textarea
                  className="form-input"
                  style={{ height: 200, fontFamily: 'monospace', fontSize: 13, direction: 'ltr', textAlign: 'left' }}
                  value={formData.modemgrid_api_def}
                  onChange={e => setFormData({ ...formData, modemgrid_api_def: e.target.value })}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 24 }}>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>{t('إلغاء')}</button>
              <button className="btn btn-primary" onClick={handleSave}>
                {t('حفظ')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
