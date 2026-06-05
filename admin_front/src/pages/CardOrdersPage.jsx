import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { FiFileText, FiSearch, FiFilter } from 'react-icons/fi';
import { useSelector } from 'react-redux';
import API from '../api/axios';

export default function CardOrdersPage() {
  const { t } = useLanguage();
  const { user } = useSelector(s => s.auth);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterBy, setFilterBy] = useState('all');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await API.get('/cards/transactions');
        setTransactions(data.transactions || []);
      } catch (err) {
        setTransactions([]);
      }
      setLoading(false);
    };
    load();
  }, []);

  const filtered = transactions.filter(t => {
    const matchesSearch = 
      (t.phone_number && t.phone_number.includes(search)) ||
      (t.operator && t.operator.toLowerCase().includes(search.toLowerCase())) ||
      (t.sender_name && t.sender_name.toLowerCase().includes(search.toLowerCase()));
      
    const matchesUser = filterBy === 'me' ? t.processed_by === user?.id : true;
    
    return matchesSearch && matchesUser;
  });

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('طلبات البطاقات')}</h1>
          <p className="page-subtitle">{t('سجل البطاقات التي تم إرسالها أو بيعها')}</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">{t('قائمة الطلبات')}</span>
          <div className="filters-responsive" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <select className="form-select" value={filterBy} onChange={e => setFilterBy(e.target.value)} style={{ padding: '6px 12px', fontSize: 13, minWidth: 150 }}>
              <option value="all">{t('الجميع (كل الطلبات)')}</option>
              <option value="me">{t('طلباتي فقط')}</option>
            </select>
            <div className="header-search" style={{ minWidth: 250 }}>
              <FiSearch />
              <input placeholder={t("البحث برقم الهاتف، أو المشغل...")} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ textAlign:'center', padding:40 }}><span className="spinner" style={{ margin:'0 auto' }}/></div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign:'center', padding:40, color:'var(--text-muted)' }}>{t('لا يوجد سجل للطلبات')}</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>رقم الطلب (ID)</th>
                  <th>{t('المُرسل (الموظف)')}</th>
                  <th>{t('رقم الهاتف المستلم')}</th>
                  <th>{t('البطاقة (النوع والقيمة)')}</th>
                  <th>{t('الحالة')}</th>
                  <th>{t('التاريخ')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>#{t.id}</td>
                    <td>{t.sender_name || '-'}</td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{t.phone_number || '-'}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{t.operator}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>القيمة: {t.amount}</div>
                    </td>
                    <td>
                      <span className={`badge-status ${t.status === 'success' ? 'success' : 'pending'}`}>
                        {t.status === 'success' ? 'ناجح' : t.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(t.created_at).toLocaleString('ar-DZ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
