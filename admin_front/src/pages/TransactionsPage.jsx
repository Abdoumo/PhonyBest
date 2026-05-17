import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { FiList, FiSearch, FiFilter } from 'react-icons/fi';
import API from '../api/axios';

export default function TransactionsPage() {
  const { user } = useSelector(s => s.auth);
  const isAdmin = user?.role === 'ADMIN';

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [userFilter, setUserFilter] = useState('');

  useEffect(() => {
    if (isAdmin) {
      API.get('/users?limit=1000').then(res => setUsers(res.data.users || [])).catch(() => { });
    }
  }, [isAdmin]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      let url = `/transactions?page=${page}`;
      if (typeFilter) url += `&type=${typeFilter}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (userFilter) url += `&client_id=${userFilter}`;

      const { data } = await API.get(url);
      setTransactions(data.transactions || []);
      if (data.pagination) setPagination(data.pagination);
    } catch (err) {
      console.error(err);
      setTransactions([]);
    }
    setLoading(false);
  };

  useEffect(() => { setPage(1); }, [typeFilter, statusFilter, search, userFilter]);
  useEffect(() => { loadTransactions(); }, [page, typeFilter, statusFilter, search, userFilter]);

  const translateType = (type) => {
    switch (type) {
      case 'flexy': return 'فليكسي';
      case 'idoom': return 'أيدوم';
      case 'card': return 'بطاقة (مفرد)';
      case 'buy_cards': return 'شراء بطاقات (جملة)';
      case 'wallet_add': return 'شحن رصيد';
      case 'wallet_remove': return 'سحب رصيد';
      case 'transfer': return 'تحويل';
      case 'debt': return 'دين';
      default: return type;
    }
  };

  const translateStatus = (status) => {
    switch (status) {
      case 'pending': return 'قيد الانتظار';
      case 'processing': return 'جاري المعالجة';
      case 'success': return 'ناجح';
      case 'failed': return 'فشل';
      case 'cancelled': return 'ملغى';
      default: return status;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'success': return 'success';
      case 'failed': return 'danger';
      case 'pending':
      case 'processing': return 'warning';
      default: return 'secondary';
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">كل العمليات</h1>
          <p className="page-subtitle">عرض جميع الحركات والمعاملات في النظام</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
          <span className="card-title">سجل العمليات ({pagination.total})</span>
        </div>

        <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
          {isAdmin && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>المستخدمين</label>
              <select className="form-select" value={userFilter} onChange={e => setUserFilter(e.target.value)} style={{ width: '100%' }}>
                <option value="">الجميع (الكل)</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.username} {u.full_name ? `(${u.full_name})` : ''}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>نوع العملية</label>
            <select className="form-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ width: '100%' }}>
              <option value="">كل الأنواع</option>
              <option value="flexy">فليكسي</option>
              <option value="idoom">أيدوم</option>
              <option value="card">بيع بطاقة</option>
              <option value="buy_cards">شراء بطاقات بالجملة</option>
              <option value="transfer">تحويلات</option>
              <option value="wallet_add">إيداع</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>حالة العملية</label>
            <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: '100%' }}>
              <option value="">كل الحالات</option>
              <option value="success">ناجحة</option>
              <option value="failed">فاشلة</option>
              <option value="pending">قيد الانتظار</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>بحث حر</label>
            <div style={{ position: 'relative', width: '100%' }}>
              <FiSearch style={{ position: 'absolute', right: 12, top: 10, color: 'var(--text-muted)' }} />
              <input
                style={{ paddingRight: 36, width: '100%', height: 38, borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                placeholder="رقم الهاتف، الاسم..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div style={{ overflow: 'auto', maxHeight: 600 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : transactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
              لا توجد عمليات مطابقة.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>رقم</th>
                  <th>النوع</th>
                  <th>المتعامل</th>
                  <th>رقم الهاتف/المرجع</th>
                  <th>المبلغ</th>
                  {isAdmin && <th>التكلفة</th>}
                  {isAdmin && <th>الربح</th>}
                  <th>العرض/المعلومات</th>
                  <th>الحالة</th>
                  <th>المستخدم</th>
                  <th>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>#{t.id}</td>
                    <td><span className="badge-status">{translateType(t.type)}</span></td>
                    <td style={{ textTransform: 'capitalize' }}>{t.operator || '-'}</td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      {t.type === 'buy_cards' ? 'شراء بطاقات (جملة)' : (t.phone_number || '-')}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{t.amount} د.ج</td>
                    {isAdmin && <td style={{ color: 'var(--danger)' }}>{t.cost ? `${t.cost} د.ج` : '-'}</td>}
                    {isAdmin && <td style={{ color: 'var(--success)' }}>{t.profit ? `${t.profit} د.ج` : '-'}</td>}
                    <td style={{ fontSize: 13 }}>
                      {t.offer && <span style={{ background: 'var(--bg-input)', padding: '2px 6px', borderRadius: 4, display: 'inline-block', marginBottom: 2 }}>{t.offer}</span>}
                      {t.sim_used && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>شريحة: {t.sim_used}</div>}
                      {t.type === 'buy_cards' && t.metadata && (
                        <div style={{ fontSize: 12, marginTop: 4 }}>
                          <span style={{ color: 'var(--primary)' }}>الكمية: {typeof t.metadata === 'string' ? JSON.parse(t.metadata).quantity : t.metadata.quantity}</span>
                          <span style={{ margin: '0 4px' }}>|</span>
                          <span style={{ color: 'var(--text-muted)' }}>قيمة البطاقة: {typeof t.metadata === 'string' ? JSON.parse(t.metadata).value : t.metadata.value}</span>
                        </div>
                      )}
                      {t.error_message && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 2, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.error_message}>{t.error_message}</div>}
                      {!t.offer && !t.sim_used && t.type !== 'buy_cards' && !t.error_message && '-'}
                    </td>
                    <td>
                      <span className={`badge-status ${getStatusClass(t.status)}`}>
                        {translateStatus(t.status)}
                      </span>
                    </td>
                    <td style={{ fontSize: 13 }}>
                      <div>{t.client_full_name || t.client_name || '-'}</div>
                      {t.processed_by_name && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>منفذ: {t.processed_by_name}</div>}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(t.created_at).toLocaleString('ar-DZ')}</td>
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
    </div>
  );
}
