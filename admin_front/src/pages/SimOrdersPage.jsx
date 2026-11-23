import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useLanguage } from '../contexts/LanguageContext';
import API from '../api/axios';
import {
  FiSmartphone, FiMapPin, FiNavigation, FiTruck, FiUser, FiPhone,
  FiFileText, FiCopy, FiExternalLink, FiPrinter, FiSearch, FiFilter,
  FiPlus, FiCheckCircle, FiClock, FiAlertCircle, FiX, FiCheck,
  FiCreditCard, FiDollarSign, FiRefreshCw, FiInfo
} from 'react-icons/fi';

const DEFAULT_OFFERS = [
  {
    id: 'gold-1000',
    name: 'Gold 1000',
    operator: 'ooredoo',
    price: 1000,
    color: '#ed1c24',
    badge: 'عرض اقتصادي',
    popular: false,
    description: 'شريحة أوريدو جولد 1000 مع باقة مكالمات وإنترنت وتوصيل وتفعيل منزلي',
    features: [
      'مكالمات ورسائل غير محدودة نحو شبكة أوريدو',
      '15 جيغابايت (Go) إنترنت شهرياً فائقة السرعة',
      '1,000 دج رصيد نحو جميع الشبكات الوطنية الأخرى',
      'توصيل إلى منزلك وتفعيل الشريحة رسمياً عبر المندوب'
    ]
  },
  {
    id: 'gold-1500',
    name: 'Gold 1500',
    operator: 'ooredoo',
    price: 1500,
    color: '#e11d48',
    badge: 'الأكثر طلباً ⭐',
    popular: true,
    description: 'العرض الأكثر شعبية لتصفح الإنترنت والمكالمات لجميع الشبكات',
    features: [
      'مكالمات ورسائل غير محدودة نحو أوريدو 24/24',
      '40 جيغابايت (Go) إنترنت 4G+',
      '1,500 دج رصيد نحو كافة الشبكات (موبيليس، جيزي، الثابت)',
      'توصيل سريع وتفعيل بالمنزل بالبطاقة البيومترية'
    ]
  },
  {
    id: 'gold-2000',
    name: 'Gold 2000',
    operator: 'ooredoo',
    price: 2000,
    color: '#d97706',
    badge: 'العرض الذهبي المميز',
    popular: false,
    description: 'باقة متميزة للمحترفين مع حجم إنترنت كبير ورصيد سخي',
    features: [
      'مكالمات ورسائل SMS غير محدودة نحو أوريدو',
      '60 جيغابايت (Go) إنترنت شهرياً',
      '2,000 دج رصيد مهدى لجميع الشبكات الوطنية',
      'أولوية الإرسال والتفعيل المنزلي عبر مندوب معتمد'
    ]
  },
  {
    id: 'gold-2500',
    name: 'Gold 2500',
    operator: 'ooredoo',
    price: 2500,
    color: '#059669',
    badge: 'إنترنت مضاعف',
    popular: false,
    description: '100 جيغابايت إنترنت ورصيد 2500 دج للتواصل بلا قيود',
    features: [
      'مكالمات ورسائل غير محدودة نحو أوريدو',
      '100 جيغابايت (Go) إنترنت كاملة الصلاحية',
      '2,500 دج رصيد صالح لكافة الشبكات الوطنية والدولية',
      'توصيل وتفعيل رسمي في منزلك'
    ]
  },
  {
    id: 'gold-4000',
    name: 'Gold 4000',
    operator: 'ooredoo',
    price: 4000,
    color: '#7c3aed',
    badge: 'عرض النخبة VIP 👑',
    popular: false,
    description: 'أعلى فئات أوريدو جولد للمؤسسات وكبار العملاء مع إنترنت عملاق',
    features: [
      'مكالمات ورسائل غير محدودة نحو جميع الشبكات الوطنية',
      '200 جيغابايت (Go) إنترنت بأقصى سرعة ممكنة',
      'خدمة كبار العملاء VIP والتوصيل المجاني للمنزل',
      'تفعيل فوري بالمنزل مع بطاقة الهوية الرسمية'
    ]
  }
];

const ALGERIA_WILAYAS = [
  '01 - أدرار', '02 - الشلف', '03 - الأغواط', '04 - أم البواقي', '05 - باتنة',
  '06 - بجاية', '07 - بسكرة', '08 - بشار', '09 - البليدة', '10 - البويرة',
  '11 - تمنراست', '12 - تبسة', '13 - تلمسان', '14 - تيارت', '15 - تيزي وزو',
  '16 - الجزائر', '17 - الجلفة', '18 - جيجل', '19 - سطيف', '20 - سعيدة',
  '21 - سكيكدة', '22 - سيدي بلعباس', '23 - عنابة', '24 - قالمة', '25 - قسنطينة',
  '26 - المدية', '27 - مستغانم', '28 - المسيلة', '29 - معسكر', '30 - ورقلة',
  '31 - وهران', '32 - البيض', '33 - إليزي', '34 - برج بوعريريج', '35 - بومرداس',
  '36 - الطارف', '37 - تندوف', '38 - تسمسيلت', '39 - الوادي', '40 - خنشلة',
  '41 - سوق أهراس', '42 - تيبازة', '43 - ميلة', '44 - عين الدفلى', '45 - النعامة',
  '46 - عين تموشنت', '47 - غرداية', '48 - غليزان', '49 - تيميمون', '50 - برج باجي مختار',
  '51 - أولاد جلال', '52 - بني عباس', '53 - عين صالح', '54 - عين قزام', '55 - تقرت',
  '56 - جانت', '57 - المغير', '58 - المنيعة'
];

export default function SimOrdersPage() {
  const { t } = useLanguage();
  const { user } = useSelector(s => s.auth);
  const isAdmin = user?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState(isAdmin ? 'orders' : 'offers');
  const [offers, setOffers] = useState(DEFAULT_OFFERS);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Order Placement Modal
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const [orderLocation, setOrderLocation] = useState({
    latitude: null,
    longitude: null,
    accuracy: null,
    address: '',
    wilaya: user?.wilaya || '16 - الجزائر'
  });

  const [orderCredentials, setOrderCredentials] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    national_id: '',
    birth_date: '',
    credentials_details: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState({ type: '', text: '' });

  // Admin Assign / Update Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [assignForm, setAssignForm] = useState({
    status: 'pending',
    assigned_to: '',
    assigned_agent_phone: '',
    admin_notes: '',
    activation_status: 'pending'
  });
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Load offers and orders
  const fetchOffers = async () => {
    try {
      const res = await API.get('/sim-orders/offers');
      if (res.data?.offers?.length) {
        setOffers(res.data.offers);
      }
    } catch (e) {
      console.warn('Fallback to local offers', e);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await API.get('/sim-orders', {
        params: {
          status: statusFilter !== 'all' ? statusFilter : undefined,
          search: search || undefined
        }
      });
      setOrders(res.data.orders || []);
    } catch (e) {
      console.error('Fetch orders error', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, search]);

  // Geolocation capture
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setLocationError(t('متصفحك لا يدعم خاصية تحديد الموقع الجغرافي (GPS)'));
      return;
    }
    setDetectingLocation(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrderLocation(prev => ({
          ...prev,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy)
        }));
        setDetectingLocation(false);
      },
      (err) => {
        setDetectingLocation(false);
        if (err.code === 1) {
          setLocationError(t('يرجى السماح بالوصول إلى موقعك الجغرافي في المتصفح'));
        } else if (err.code === 2) {
          setLocationError(t('تعذر تحديد الموقع الحالي (GPS غير متاح)'));
        } else {
          setLocationError(t('انتهت مهلة تحديد الموقع'));
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const openOrderModal = (offer) => {
    setSelectedOffer(offer);
    setQuantity(1);
    setPaymentMethod('cash');
    setLocationError('');
    setOrderLocation({
      latitude: null,
      longitude: null,
      accuracy: null,
      address: '',
      wilaya: user?.wilaya || '16 - الجزائر'
    });
    setOrderCredentials({
      full_name: user?.full_name || '',
      phone: user?.phone || '',
      national_id: '',
      birth_date: '',
      credentials_details: ''
    });
    setOrderModalOpen(true);
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (!selectedOffer) return;

    if (!orderCredentials.phone || !orderCredentials.full_name) {
      alert(t('يرجى إدخال الاسم ورقم الهاتف للتواصل'));
      return;
    }

    setSubmitting(true);
    setNotificationMsg({ type: '', text: '' });

    try {
      const payload = {
        offer_name: selectedOffer.name,
        quantity,
        payment_method: paymentMethod,
        latitude: orderLocation.latitude,
        longitude: orderLocation.longitude,
        accuracy: orderLocation.accuracy,
        address: orderLocation.address,
        wilaya: orderLocation.wilaya,
        full_name: orderCredentials.full_name,
        phone: orderCredentials.phone,
        national_id: orderCredentials.national_id,
        birth_date: orderCredentials.birth_date,
        credentials_details: orderCredentials.credentials_details
      };

      const res = await API.post('/sim-orders', payload);
      setOrderModalOpen(false);
      setNotificationMsg({
        type: 'success',
        text: res.data.message || t('تم إرسال طلب الشريحة وبيانات الموقع للإدارة بنجاح!')
      });
      fetchOrders();
      setActiveTab('orders');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || t('حدث خطأ أثناء إرسال الطلب'));
    } finally {
      setSubmitting(false);
    }
  };

  const openAssignModal = (order) => {
    setSelectedOrder(order);
    setAssignForm({
      status: order.status || 'pending',
      assigned_to: order.assigned_to || '',
      assigned_agent_phone: order.assigned_agent_phone || '',
      admin_notes: order.admin_notes || '',
      activation_status: order.activation_status || 'pending'
    });
    setAssignModalOpen(true);
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setUpdatingStatus(true);
    try {
      await API.put(`/sim-orders/${selectedOrder.id}/status`, assignForm);
      setAssignModalOpen(false);
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.error || t('فشل تحديث حالة الطلب'));
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm(t('هل أنت متأكد من إلغاء هذا الطلب؟'))) return;
    try {
      await API.delete(`/sim-orders/${orderId}`);
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.error || t('فشل إلغاء الطلب'));
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const copyDriverCredentials = (order) => {
    const mapsLink = (order.latitude && order.longitude)
      ? `https://www.google.com/maps?q=${order.latitude},${order.longitude}`
      : 'غير محدد بالخريطة';

    const text = `📱 *مهمة توصيل وتفعيل شريحة أوريدو* (طلب #${order.id})
━━━━━━━━━━━━━━━━━━
👤 *العميل:* ${order.full_name || order.username}
📞 *الهاتف:* ${order.phone || '-'}
🪪 *رقم بطاقة الهوية/جواز:* ${order.national_id || 'غير مسجل'}
📅 *تاريخ الميلاد:* ${order.birth_date || '-'}
📍 *الولاية:* ${order.wilaya || '-'}
🏠 *العنوان:* ${order.address || '-'}
🗺️ *رابط خرائط Google:* ${mapsLink}
━━━━━━━━━━━━━━━━━━
📦 *العرض:* ${order.offer_name} (الكمية: ${order.quantity})
💰 *المبلغ المطلوب:* ${order.total_price} دج (${order.payment_method === 'wallet' ? 'تم الدفع بالمحفظة ✅' : 'دفع نقداً عند التفعيل 💵'})
📝 *ملاحظات:* ${order.credentials_details || order.admin_notes || 'لا توجد'}
━━━━━━━━━━━━━━━━━━
⚡ الرجاء التوجه للموقع المذكور لتسليم الشريحة وتفعيلها بالمنزل.`;

    copyToClipboard(text, `driver-${order.id}`);
  };

  const printInterventionVoucher = (order) => {
    const mapsLink = (order.latitude && order.longitude)
      ? `https://www.google.com/maps?q=${order.latitude},${order.longitude}`
      : '-';

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <title>بطاقة مهمة توصيل وتفعيل شريحة #${order.id}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 25px; color: #111; line-height: 1.5; }
            .header { text-align: center; border-bottom: 2px solid #ed1c24; padding-bottom: 15px; margin-bottom: 20px; }
            .logo { font-size: 24px; font-weight: bold; color: #ed1c24; }
            .order-title { font-size: 18px; margin-top: 5px; }
            .section { margin-bottom: 20px; border: 1px solid #ddd; border-radius: 8px; padding: 15px; }
            .section-title { font-weight: bold; font-size: 15px; margin-bottom: 10px; color: #333; border-bottom: 1px solid #eee; padding-bottom: 5px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
            .label { font-weight: bold; color: #555; }
            .value { font-weight: 600; }
            .qr-placeholder { text-align: center; margin: 15px 0; }
            .signatures { display: flex; justify-content: space-between; margin-top: 40px; padding: 0 40px; }
            .sig-box { text-align: center; width: 200px; border-top: 1px dashed #777; padding-top: 5px; font-weight: bold; }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">⚡ FLEXY GSM & OOREDOO GOLD</div>
            <div class="order-title">بطاقة مهمة توصيل وتفعيل شريحة بالمنزل (Bon d'intervention)</div>
            <div style="font-size: 13px; color: #666;">رقم الطلب: #${order.id} | التاريخ: ${new Date(order.created_at).toLocaleString('ar-DZ')}</div>
          </div>

          <div class="section">
            <div class="section-title">👤 بيانات العميل للتفعيل (Identité du Client)</div>
            <div class="row"><span class="label">اسم ولقب العميل:</span><span class="value">${order.full_name || order.username}</span></div>
            <div class="row"><span class="label">رقم الهاتف للتواصل:</span><span class="value">${order.phone || '-'}</span></div>
            <div class="row"><span class="label">رقم بطاقة الهوية / جواز السفر:</span><span class="value">${order.national_id || 'غير مسجل'}</span></div>
            <div class="row"><span class="label">تاريخ الميلاد:</span><span class="value">${order.birth_date || '-'}</span></div>
            <div class="row"><span class="label">ملاحظات التفعيل:</span><span class="value">${order.credentials_details || '-'}</span></div>
          </div>

          <div class="section">
            <div class="section-title">📍 موقع التوصيل والتفعيل المنزلي (Localisation GPS)</div>
            <div class="row"><span class="label">الولاية:</span><span class="value">${order.wilaya || '-'}</span></div>
            <div class="row"><span class="label">العنوان التفصيلي:</span><span class="value">${order.address || '-'}</span></div>
            <div class="row"><span class="label">إحداثيات GPS:</span><span class="value">${order.latitude || '-'}, ${order.longitude || '-'}</span></div>
            <div class="row"><span class="label">رابط خرائط جوجل:</span><span class="value" style="direction:ltr;">${mapsLink}</span></div>
          </div>

          <div class="section">
            <div class="section-title">📦 تفاصيل الشريحة والمبلغ (Détails de l'offre)</div>
            <div class="row"><span class="label">عرض الشريحة:</span><span class="value">Ooredoo ${order.offer_name}</span></div>
            <div class="row"><span class="label">الكمية:</span><span class="value">${order.quantity}</span></div>
            <div class="row"><span class="label">المبلغ الإجمالي:</span><span class="value" style="color: #ed1c24; font-size: 16px;">${order.total_price} دج</span></div>
            <div class="row"><span class="label">طريقة الدفع:</span><span class="value">${order.payment_method === 'wallet' ? 'تم الخصم من المحفظة مسبقاً (مدفوع)' : 'نقد عند الاستلام والتفعيل بالمنزل'}</span></div>
          </div>

          <div class="section">
            <div class="section-title">🚚 بيانات المندوب المكلف (Agent de livraison)</div>
            <div class="row"><span class="label">اسم المندوب:</span><span class="value">${order.assigned_to || 'غير محدد'}</span></div>
            <div class="row"><span class="label">هاتف المندوب:</span><span class="value">${order.assigned_agent_phone || '-'}</span></div>
            <div class="row"><span class="label">ملاحظات الإدارة:</span><span class="value">${order.admin_notes || '-'}</span></div>
          </div>

          <div class="signatures">
            <div class="sig-box">توقيع وختم الإدارة / المندوب</div>
            <div class="sig-box">توقيع العميل المستلم</div>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="badge-status pending"><FiClock style={{ marginLeft: 4 }} /> {t('قيد الانتظار')}</span>;
      case 'assigned':
        return <span className="badge-status info"><FiUser style={{ marginLeft: 4 }} /> {t('تم تعيين المندوب')}</span>;
      case 'in_delivery':
        return <span className="badge-status warning"><FiTruck style={{ marginLeft: 4 }} /> {t('في الطريق للمنزل')}</span>;
      case 'completed':
        return <span className="badge-status success"><FiCheckCircle style={{ marginLeft: 4 }} /> {t('تم التوصيل والتفعيل')}</span>;
      case 'cancelled':
        return <span className="badge-status danger"><FiX style={{ marginLeft: 4 }} /> {t('ملغي')}</span>;
      default:
        return <span className="badge-status">{status}</span>;
    }
  };

  return (
    <div className="fade-in ooredoo-sims-page">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: 'linear-gradient(135deg, #ed1c24, #b91c1c)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 20
            }}>
              <FiSmartphone />
            </div>
            <div>
              <h1 className="page-title" style={{ margin: 0 }}>{t('شرائح أوريدو (Gold)')}</h1>
              <p className="page-subtitle" style={{ margin: 0 }}>
                {t('شراء وتوصيل شرائح أوريدو Gold مع تحديد الموقع الجغرافي والتفعيل المنزلي عبر مندوب معتمد')}
              </p>
            </div>
          </div>
        </div>

        {/* User Role & Wallet & Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user && (
            <div className="card" style={{ padding: '8px 16px', margin: 0, display: 'flex', alignItems: 'center', gap: 10, background: 'var(--card-bg)' }}>
              <FiCreditCard color="#ed1c24" size={18} />
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('رصيد المحفظة')}</div>
                <div style={{ fontWeight: 'bold', fontSize: 14 }}>{parseFloat(user.wallet || 0).toLocaleString()} دج</div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', background: 'var(--bg-input, rgba(255,255,255,0.05))', borderRadius: 10, padding: 4 }}>
            <button
              className={`btn btn-sm ${activeTab === 'offers' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('offers')}
              style={{ borderRadius: 8 }}
            >
              <FiPlus /> {t('عروض الشرائح والطلب')}
            </button>
            <button
              className={`btn btn-sm ${activeTab === 'orders' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('orders')}
              style={{ borderRadius: 8, marginRight: 6 }}
            >
              <FiFileText /> {isAdmin ? t('إدارة طلبات الشرائح') : t('طلباتي السابقة')}
              {orders.length > 0 && (
                <span style={{
                  background: activeTab === 'orders' ? '#fff' : 'var(--accent)',
                  color: activeTab === 'orders' ? '#000' : '#fff',
                  borderRadius: 10, padding: '1px 6px', fontSize: 11, marginRight: 6
                }}>
                  {orders.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {notificationMsg.text && (
        <div className={`alert alert-${notificationMsg.type}`} style={{
          padding: '12px 16px', borderRadius: 8, marginBottom: 20,
          background: notificationMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${notificationMsg.type === 'success' ? '#10b981' : '#ef4444'}`,
          color: notificationMsg.type === 'success' ? '#10b981' : '#ef4444',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <span>{notificationMsg.text}</span>
          <FiX style={{ cursor: 'pointer' }} onClick={() => setNotificationMsg({ type: '', text: '' })} />
        </div>
      )}

      {/* OFFERS TAB */}
      {activeTab === 'offers' && (
        <div className="offers-container fade-in">
          <div style={{
            background: 'linear-gradient(135deg, rgba(237, 28, 36, 0.12), rgba(245, 158, 11, 0.08))',
            border: '1px solid rgba(237, 28, 36, 0.3)',
            borderRadius: 14, padding: '20px 24px', marginBottom: 25,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 15
          }}>
            <div style={{ maxWidth: 750 }}>
              <h3 style={{ margin: '0 0 6px 0', color: '#ed1c24', fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FiNavigation /> {t('خدمة التوصيل والتفعيل المنزلي عبر GPS')}
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
                {t('عند اختيارك لأي شريحة أوريدو Gold، يمكنك إرسال موقعك الجغرافي المباشر وبيانات هويتك. ستقوم الإدارة بتكليف مندوب معتمد لشراء الشريحة والقدوم إلى منزلك لتسليمها وتفعيلها رسمياً بالبطاقة البيومترية.')}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <span className="badge" style={{ background: '#ed1c24', color: '#fff', padding: '6px 12px', borderRadius: 20, fontSize: 12 }}>
                Ooredoo 4G+
              </span>
              <span className="badge" style={{ background: '#10b981', color: '#fff', padding: '6px 12px', borderRadius: 20, fontSize: 12 }}>
                تفعيل منزلي فوري
              </span>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 20
          }}>
            {offers.map(offer => (
              <div
                key={offer.id}
                className="card offer-card"
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderRadius: 16,
                  border: offer.popular ? '2px solid #ed1c24' : '1px solid var(--border)',
                  overflow: 'hidden',
                  boxShadow: offer.popular ? '0 8px 24px rgba(237, 28, 36, 0.15)' : 'none',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
              >
                {offer.badge && (
                  <div style={{
                    position: 'absolute', top: 12, left: 12,
                    background: offer.popular ? '#ed1c24' : 'rgba(255,255,255,0.1)',
                    color: '#fff', fontSize: 11, fontWeight: 'bold',
                    padding: '4px 10px', borderRadius: 20
                  }}>
                    {offer.badge}
                  </div>
                )}

                <div>
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(237,28,36,0.15), rgba(0,0,0,0.1))',
                    padding: '24px 20px 18px 20px',
                    borderBottom: '1px solid var(--border)'
                  }}>
                    <div style={{ fontSize: 13, color: '#ed1c24', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 }}>
                      Ooredoo Algeria
                    </div>
                    <h2 style={{ fontSize: 24, margin: '0 0 10px 0', fontWeight: 800 }}>
                      {offer.name}
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontSize: 32, fontWeight: 900, color: '#ed1c24' }}>
                        {offer.price.toLocaleString()}
                      </span>
                      <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>دج / شريحة</span>
                    </div>
                  </div>

                  <div style={{ padding: '20px' }}>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                      {offer.description}
                    </p>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {offer.features?.map((feat, idx) => (
                        <li key={idx} style={{
                          display: 'flex', alignItems: 'flex-start', gap: 10,
                          fontSize: 13, marginBottom: 12, lineHeight: 1.4
                        }}>
                          <FiCheckCircle color="#10b981" size={16} style={{ minWidth: 16, marginTop: 2 }} />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div style={{ padding: '0 20px 20px 20px' }}>
                  <button
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      background: offer.popular ? '#ed1c24' : 'var(--accent)',
                      borderColor: offer.popular ? '#ed1c24' : 'var(--accent)',
                      padding: '12px 16px',
                      fontSize: 14,
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      borderRadius: 10
                    }}
                    onClick={() => openOrderModal(offer)}
                  >
                    <FiSmartphone /> {t('اطلب هذه الشريحة الآن')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ORDERS TAB */}
      {activeTab === 'orders' && (
        <div className="orders-container fade-in">
          {/* Filters & Search */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 'bold', color: 'var(--text-muted)' }}>
                  <FiFilter style={{ verticalAlign: 'middle', marginLeft: 4 }} /> {t('الحالة:')}
                </span>
                {['all', 'pending', 'assigned', 'in_delivery', 'completed', 'cancelled'].map(st => (
                  <button
                    key={st}
                    className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setStatusFilter(st)}
                    style={{ borderRadius: 20, fontSize: 12, padding: '4px 12px' }}
                  >
                    {st === 'all' && t('الكل')}
                    {st === 'pending' && t('قيد الانتظار')}
                    {st === 'assigned' && t('تم تعيين المندوب')}
                    {st === 'in_delivery' && t('في الطريق')}
                    {st === 'completed' && t('مكتمل ومفعل')}
                    {st === 'cancelled' && t('ملغي')}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="header-search" style={{ minWidth: 260 }}>
                  <FiSearch />
                  <input
                    placeholder={t('البحث برقم الطلب، العميل، الهاتف، العنوان...')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <button className="btn btn-secondary btn-icon" onClick={fetchOrders} title={t('تحديث')}>
                  <FiRefreshCw className={loading ? 'spinner' : ''} />
                </button>
              </div>
            </div>
          </div>

          {/* Orders Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: 50 }}>
                  <span className="spinner" style={{ margin: '0 auto' }} />
                </div>
              ) : orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 50, color: 'var(--text-muted)' }}>
                  <FiSmartphone size={40} style={{ opacity: 0.3, marginBottom: 10 }} />
                  <div>{t('لا توجد طلبات شرائح مطابقة حتى الآن')}</div>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: 15 }}
                    onClick={() => setActiveTab('offers')}
                  >
                    <FiPlus /> {t('طلب شريحة جديدة الآن')}
                  </button>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>رقم الطلب (ID)</th>
                      {isAdmin && <th>{t('العميل')}</th>}
                      <th>{t('الشريحة')}</th>
                      <th>{t('المبلغ والدفع')}</th>
                      <th>{t('الموقع الجغرافي')}</th>
                      <th>{t('بيانات الهوية للتفعيل')}</th>
                      <th>{t('المندوب والتفعيل')}</th>
                      <th>{t('الحالة')}</th>
                      <th>{t('التاريخ')}</th>
                      <th style={{ textAlign: 'center' }}>{t('الإجراءات')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => {
                      const hasGeo = order.latitude && order.longitude;
                      const mapsUrl = hasGeo ? `https://www.google.com/maps?q=${order.latitude},${order.longitude}` : null;

                      return (
                        <tr key={order.id}>
                          <td style={{ fontWeight: 'bold' }}>
                            #{order.id}
                          </td>

                          {isAdmin && (
                            <td>
                              <div style={{ fontWeight: 600 }}>{order.full_name || order.username}</div>
                              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                {order.phone || order.user_registered_phone || '-'}
                              </div>
                              <span className="badge" style={{ fontSize: 10, background: 'rgba(255,255,255,0.08)', marginTop: 2 }}>
                                {order.user_role}
                              </span>
                            </td>
                          )}

                          <td>
                            <div style={{ fontWeight: 'bold', color: '#ed1c24' }}>
                              Ooredoo {order.offer_name}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                              الكمية: {order.quantity}
                            </div>
                          </td>

                          <td>
                            <div style={{ fontWeight: 700 }}>{parseFloat(order.total_price).toLocaleString()} دج</div>
                            <div style={{ fontSize: 11, color: order.payment_method === 'wallet' ? '#10b981' : '#f59e0b' }}>
                              {order.payment_method === 'wallet' ? t('محفظة (مدفوع)') : t('نقد عند الاستلام')}
                            </div>
                          </td>

                          {/* Geolocation */}
                          <td>
                            {hasGeo ? (
                              <div>
                                <a
                                  href={mapsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-sm btn-secondary"
                                  style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                    padding: '4px 8px', fontSize: 12, color: '#3b82f6'
                                  }}
                                  title="فتح الموقع على خرائط جوجل"
                                >
                                  <FiMapPin color="#ef4444" /> {t('عرض بالخريطة')} <FiExternalLink size={12} />
                                </a>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, maxWidth: 160 }}>
                                  {order.wilaya ? `${order.wilaya} - ` : ''}{order.address || `${order.latitude.toFixed(4)}, ${order.longitude.toFixed(4)}`}
                                </div>
                              </div>
                            ) : (
                              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                <div>{order.wilaya || '-'}</div>
                                <div style={{ fontSize: 11 }}>{order.address || t('لم يحدد إحداثيات')}</div>
                              </div>
                            )}
                          </td>

                          {/* Credentials for activation */}
                          <td>
                            <div style={{ fontSize: 12 }}>
                              <div><strong style={{ color: 'var(--text-muted)' }}>الهوية:</strong> {order.national_id || '-'}</div>
                              <div><strong style={{ color: 'var(--text-muted)' }}>الميلاد:</strong> {order.birth_date || '-'}</div>
                              {order.credentials_details && (
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', maxWidth: 140 }}>
                                  {order.credentials_details}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Dispatch & Delivery Agent */}
                          <td>
                            {order.assigned_to ? (
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 12 }}>
                                  <FiTruck style={{ marginLeft: 4 }} /> {order.assigned_to}
                                </div>
                                {order.assigned_agent_phone && (
                                  <a href={`tel:${order.assigned_agent_phone}`} style={{ fontSize: 11, color: '#3b82f6' }}>
                                    <FiPhone size={10} style={{ marginLeft: 3 }} /> {order.assigned_agent_phone}
                                  </a>
                                )}
                                <div style={{ marginTop: 3 }}>
                                  <span style={{
                                    fontSize: 10, padding: '2px 6px', borderRadius: 4,
                                    background: order.activation_status === 'activated' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                                    color: order.activation_status === 'activated' ? '#10b981' : '#f59e0b'
                                  }}>
                                    {order.activation_status === 'activated' ? t('مفعلة بالمنزل') : t('في انتظار التفعيل')}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                {t('لم يعين بعد')}
                              </span>
                            )}
                          </td>

                          <td>
                            {getStatusBadge(order.status)}
                          </td>

                          <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {new Date(order.created_at).toLocaleDateString('ar-DZ')}<br />
                            <span style={{ fontSize: 10 }}>{new Date(order.created_at).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })}</span>
                          </td>

                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                              {isAdmin && (
                                <>
                                  <button
                                    className="btn btn-sm btn-primary"
                                    onClick={() => openAssignModal(order)}
                                    title={t('تعيين مندوب وتحديث الحالة')}
                                    style={{ padding: '6px 10px', fontSize: 12 }}
                                  >
                                    <FiTruck /> {t('إدارة')}
                                  </button>

                                  <button
                                    className="btn btn-sm btn-secondary"
                                    onClick={() => copyDriverCredentials(order)}
                                    title={t('نسخ كامل معلومات الطلب والموقع للمندوب')}
                                    style={{ padding: '6px 8px' }}
                                  >
                                    {copiedId === `driver-${order.id}` ? <FiCheck color="#10b981" /> : <FiCopy />}
                                  </button>

                                  <button
                                    className="btn btn-sm btn-secondary"
                                    onClick={() => printInterventionVoucher(order)}
                                    title={t('طباعة بطاقة المهمة للمندوب')}
                                    style={{ padding: '6px 8px' }}
                                  >
                                    <FiPrinter />
                                  </button>
                                </>
                              )}

                              {(!isAdmin && order.status === 'pending') && (
                                <button
                                  className="btn btn-sm btn-danger"
                                  onClick={() => handleCancelOrder(order.id)}
                                  style={{ padding: '4px 8px', fontSize: 11 }}
                                >
                                  {t('إلغاء')}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ORDER PLACEMENT MODAL */}
      {orderModalOpen && selectedOffer && (
        <div className="modal-overlay" onClick={() => !submitting && setOrderModalOpen(false)}>
          <div className="modal fade-in" style={{ maxWidth: 650, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 15 }}>
              <div>
                <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ed1c24' }}>
                  <FiSmartphone /> {t('طلب شريحة أوريدو')} {selectedOffer.name}
                </h3>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                  {t('يرجى تحديد موقعك الجغرافي وبيانات هويتك حتى نتمكن من زيارتك وتفعيل الشريحة في منزلك')}
                </p>
              </div>
              <button className="btn btn-icon btn-secondary" onClick={() => setOrderModalOpen(false)}>
                <FiX />
              </button>
            </div>

            <form onSubmit={handleSubmitOrder}>
              {/* Step 1: Offer & Quantity */}
              <div style={{
                background: 'rgba(237,28,36,0.08)',
                border: '1px solid rgba(237,28,36,0.2)',
                borderRadius: 10, padding: '14px 18px', margin: '15px 0'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: 16 }}>{selectedOffer.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      سعر الشريحة الواحدة: {selectedOffer.price.toLocaleString()} دج
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 'bold' }}>{t('الكمية:')}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                        style={{ width: 32, height: 32, padding: 0 }}
                      >
                        -
                      </button>
                      <span style={{ fontWeight: 'bold', minWidth: 24, textAlign: 'center' }}>{quantity}</span>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setQuantity(q => q + 1)}
                        style={{ width: 32, height: 32, padding: 0 }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed rgba(237,28,36,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold' }}>{t('المبلغ الإجمالي المطلـوب:')}</span>
                  <span style={{ fontSize: 20, fontWeight: 900, color: '#ed1c24' }}>
                    {(selectedOffer.price * quantity).toLocaleString()} دج
                  </span>
                </div>
              </div>

              {/* Step 2: Geolocation */}
              <div className="form-section" style={{ marginBottom: 20 }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent)' }}>
                  <FiMapPin /> {t('الموقع الجغرافي للتوصيل والتفعيل المنزلي (GPS)')}
                </h4>

                <div style={{
                  background: 'var(--bg-input, rgba(255,255,255,0.03))',
                  border: '1px solid var(--border)',
                  borderRadius: 10, padding: 14, marginBottom: 12
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{t('تحديد الموقع التلقائي عبر الـ GPS')}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {t('يساعد المندوب على الوصول لمنزلك مباشرة وبأسرع وقت')}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleDetectLocation}
                      disabled={detectingLocation}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        background: orderLocation.latitude ? '#10b981' : undefined,
                        color: orderLocation.latitude ? '#fff' : undefined
                      }}
                    >
                      <FiNavigation className={detectingLocation ? 'spinner' : ''} />
                      {detectingLocation ? t('جاري التحديد...') : orderLocation.latitude ? t('تم التقاط الموقع بنجاح ✓') : t('📍 التقاط موقعي الحالي')}
                    </button>
                  </div>

                  {orderLocation.latitude && (
                    <div style={{
                      marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)',
                      fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8
                    }}>
                      <div style={{ color: '#10b981', fontWeight: 600 }}>
                        ✓ {t('الإحداثيات:')} {orderLocation.latitude.toFixed(6)}, {orderLocation.longitude.toFixed(6)}
                        {orderLocation.accuracy && <span style={{ color: 'var(--text-muted)', marginRight: 6 }}>(الدقة: ±{orderLocation.accuracy}م)</span>}
                      </div>
                      <a
                        href={`https://www.google.com/maps?q=${orderLocation.latitude},${orderLocation.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'underline' }}
                      >
                        <FiExternalLink /> {t('معاينة الموقع على الخريطة')}
                      </a>
                    </div>
                  )}

                  {locationError && (
                    <div style={{ marginTop: 8, color: '#ef4444', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FiAlertCircle /> {locationError}
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">{t('الولاية')}</label>
                    <select
                      className="form-select"
                      value={orderLocation.wilaya}
                      onChange={e => setOrderLocation({ ...orderLocation, wilaya: e.target.value })}
                    >
                      {ALGERIA_WILAYAS.map(w => (
                        <option key={w} value={w}>{w}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">{t('العنوان التفصيلي أو معلم قريب')}</label>
                    <input
                      className="form-input"
                      placeholder={t('الحي، الشارع، رقم العمارة/المنزل، الطابق، بجانب المسجد...')}
                      value={orderLocation.address}
                      onChange={e => setOrderLocation({ ...orderLocation, address: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Step 3: Identity & Credentials for Activation */}
              <div className="form-section" style={{ marginBottom: 20 }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent)' }}>
                  <FiUser /> {t('بيانات وتوثيق الهوية لتفعيل الشريحة')}
                </h4>
                <div style={{
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: 'var(--text-muted)'
                }}>
                  <FiInfo color="#3b82f6" style={{ marginLeft: 6, verticalAlign: 'middle' }} />
                  {t('هذه المعلومات مطلوبة من شركة أوريدو لتسجيل وتفعيل الشريحة رسمياً باسمك عند وصول المندوب لمنزلك.')}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div className="form-group">
                    <label className="form-label">{t('الاسم واللقب بالكامل *')}</label>
                    <input
                      className="form-input"
                      required
                      placeholder={t('اسم صاحب الشريحة')}
                      value={orderCredentials.full_name}
                      onChange={e => setOrderCredentials({ ...orderCredentials, full_name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">{t('رقم الهاتف للتواصل والتنسيق *')}</label>
                    <input
                      className="form-input"
                      required
                      placeholder="05 / 06 / 07..."
                      value={orderCredentials.phone}
                      onChange={e => setOrderCredentials({ ...orderCredentials, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div className="form-group">
                    <label className="form-label">{t('رقم بطاقة التعريف البيومترية أو الجواز')}</label>
                    <input
                      className="form-input"
                      placeholder="N° CNI / NIN / Passeport"
                      value={orderCredentials.national_id}
                      onChange={e => setOrderCredentials({ ...orderCredentials, national_id: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">{t('تاريخ الميلاد')}</label>
                    <input
                      type="date"
                      className="form-input"
                      value={orderCredentials.birth_date}
                      onChange={e => setOrderCredentials({ ...orderCredentials, birth_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">{t('ملاحظات إضافية للتفعيل / التسليم')}</label>
                  <input
                    className="form-input"
                    placeholder={t('مثال: الاتصال قبل القدوم بنصف ساعة، موعد متاح في المساء...')}
                    value={orderCredentials.credentials_details}
                    onChange={e => setOrderCredentials({ ...orderCredentials, credentials_details: e.target.value })}
                  />
                </div>
              </div>

              {/* Step 4: Payment method */}
              <div className="form-section" style={{ marginBottom: 25 }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent)' }}>
                  <FiDollarSign /> {t('طريقة الدفع')}
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <label style={{
                    border: paymentMethod === 'cash' ? '2px solid #ed1c24' : '1px solid var(--border)',
                    borderRadius: 10, padding: 14, cursor: 'pointer',
                    background: paymentMethod === 'cash' ? 'rgba(237,28,36,0.06)' : 'var(--bg-input, transparent)'
                  }}>
                    <input
                      type="radio"
                      name="payment_method"
                      value="cash"
                      checked={paymentMethod === 'cash'}
                      onChange={() => setPaymentMethod('cash')}
                      style={{ marginLeft: 8 }}
                    />
                    <strong>{t('دفع نقداً عند الاستلام')}</strong>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      {t('تدفع المبلغ للمندوب مباشرة عند وصوله لمنزلك وتفعيل الشريحة')}
                    </div>
                  </label>

                  <label style={{
                    border: paymentMethod === 'wallet' ? '2px solid var(--accent)' : '1px solid var(--border)',
                    borderRadius: 10, padding: 14, cursor: 'pointer',
                    background: paymentMethod === 'wallet' ? 'rgba(99,102,241,0.08)' : 'var(--bg-input, transparent)'
                  }}>
                    <input
                      type="radio"
                      name="payment_method"
                      value="wallet"
                      checked={paymentMethod === 'wallet'}
                      onChange={() => setPaymentMethod('wallet')}
                      style={{ marginLeft: 8 }}
                    />
                    <strong>{t('خصم من رصيد المحفظة')}</strong>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      {t('رصيدك:')} {parseFloat(user?.wallet || 0).toLocaleString()} دج
                      {parseFloat(user?.wallet || 0) < (selectedOffer.price * quantity) && (
                        <span style={{ color: '#ef4444', display: 'block' }}> ({t('الرصيد غير كافٍ')})</span>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={submitting}
                  onClick={() => setOrderModalOpen(false)}
                >
                  {t('إلغاء')}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || (paymentMethod === 'wallet' && parseFloat(user?.wallet || 0) < (selectedOffer.price * quantity))}
                  style={{
                    background: '#ed1c24',
                    borderColor: '#ed1c24',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontWeight: 'bold',
                    padding: '10px 24px'
                  }}
                >
                  {submitting ? (
                    <>
                      <span className="spinner" style={{ width: 16, height: 16 }} />
                      {t('جاري إرسال الطلب والموقع...')}
                    </>
                  ) : (
                    <>
                      <FiCheck /> {t('تأكيد الطلب وإرسال الموقع للإدارة')}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN ASSIGN / UPDATE STATUS MODAL */}
      {assignModalOpen && selectedOrder && (
        <div className="modal-overlay" onClick={() => !updatingStatus && setAssignModalOpen(false)}>
          <div className="modal fade-in" style={{ maxWidth: 550 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FiTruck color="var(--accent)" /> {t('إدارة وتكليف مندوب لطلب')} #{selectedOrder.id}
              </h3>
              <button className="btn btn-icon btn-secondary" onClick={() => setAssignModalOpen(false)}>
                <FiX />
              </button>
            </div>

            <form onSubmit={handleUpdateStatus}>
              {/* Order quick info */}
              <div style={{
                background: 'var(--bg-input, rgba(255,255,255,0.03))',
                borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span><strong>العميل:</strong> {selectedOrder.full_name || selectedOrder.username} ({selectedOrder.phone})</span>
                  <span style={{ color: '#ed1c24', fontWeight: 'bold' }}>Ooredoo {selectedOrder.offer_name}</span>
                </div>
                <div>
                  <strong>الموقع:</strong> {selectedOrder.wilaya ? `${selectedOrder.wilaya} - ` : ''}{selectedOrder.address || 'بدون عنوان نصي'}
                </div>
                {selectedOrder.latitude && (
                  <div style={{ marginTop: 4 }}>
                    <a
                      href={`https://www.google.com/maps?q=${selectedOrder.latitude},${selectedOrder.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#3b82f6', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      <FiMapPin /> فتح في خرائط Google
                    </a>
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">{t('حالة الطلب العامة')}</label>
                <select
                  className="form-select"
                  value={assignForm.status}
                  onChange={e => setAssignForm({ ...assignForm, status: e.target.value })}
                >
                  <option value="pending">{t('قيد الانتظار (لم يعالج بعد)')}</option>
                  <option value="assigned">{t('تم تعيين المندوب (جاري التجهيز)')}</option>
                  <option value="in_delivery">{t('المندوب في الطريق إلى منزل العميل')}</option>
                  <option value="completed">{t('تم التسليم والتفعيل بنجاح (مكتمل)')}</option>
                  <option value="cancelled">{t('ملغي (إلغاء الطلب واسترجاع المبلغ إن وجد)')}</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div className="form-group">
                  <label className="form-label">{t('اسم المندوب المكلف بالزيارة')}</label>
                  <input
                    className="form-input"
                    placeholder="مثال: كريم (مندوب الجزائر)"
                    value={assignForm.assigned_to}
                    onChange={e => setAssignForm({ ...assignForm, assigned_to: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t('هاتف المندوب للتنسيق')}</label>
                  <input
                    className="form-input"
                    placeholder="0555..."
                    value={assignForm.assigned_agent_phone}
                    onChange={e => setAssignForm({ ...assignForm, assigned_agent_phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">{t('حالة تفعيل الشريحة في منزل العميل')}</label>
                <select
                  className="form-select"
                  value={assignForm.activation_status}
                  onChange={e => setAssignForm({ ...assignForm, activation_status: e.target.value })}
                >
                  <option value="pending">{t('في انتظار التفعيل بالمنزل')}</option>
                  <option value="activated">{t('تم تفعيل الشريحة بنجاح ✓')}</option>
                  <option value="failed">{t('تعذر التفعيل (مشكلة بالوثائق / غير متواجد)')}</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">{t('ملاحظات الإدارة للمندوب أو العميل')}</label>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="أي تعليمات إضافية..."
                  value={assignForm.admin_notes}
                  onChange={e => setAssignForm({ ...assignForm, admin_notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={updatingStatus}
                  onClick={() => setAssignModalOpen(false)}
                >
                  {t('إلغاء')}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={updatingStatus}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {updatingStatus ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <FiCheck />}
                  {t('حفظ وتحديث الطلب')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
