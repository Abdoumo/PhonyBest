import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, clearError } from '../redux/authSlice';
import { FiUser, FiLock, FiZap } from 'react-icons/fi';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch();
  const { loading, error } = useSelector(s => s.auth);

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(loginUser({ username, password }));
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-card fade-in">
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:32 }}>
            <div className="logo" style={{
              width:48, height:48, background:'linear-gradient(135deg, var(--accent), #a78bfa)',
              borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center'
            }}>
              <FiZap size={24} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontSize:22, margin:0 }}>FLEXY GSM</h2>
              <p style={{ margin:0, fontSize:12 }}>لوحة الإدارة</p>
            </div>
          </div>

          <h2>مرحباً بعودتك</h2>
          <p>قم بتسجيل الدخول إلى لوحة التحكم الخاصة بك</p>

          {error && <div className="login-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">اسم المستخدم</label>
              <div style={{ position:'relative' }}>
                <FiUser style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
                <input className="form-input" style={{ paddingRight:36 }}
                  placeholder="أدخل اسم المستخدم" value={username}
                  onChange={e => { setUsername(e.target.value); dispatch(clearError()); }}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">كلمة المرور</label>
              <div style={{ position:'relative' }}>
                <FiLock style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
                <input className="form-input" type="password" style={{ paddingRight:36 }}
                  placeholder="أدخل كلمة المرور" value={password}
                  onChange={e => { setPassword(e.target.value); dispatch(clearError()); }}
                />
              </div>
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading}
              style={{ marginTop:8 }}>
              {loading ? <span className="spinner" style={{width:18,height:18,borderWidth:2}} /> : 'تسجيل الدخول'}
            </button>
          </form>

          <p style={{ textAlign:'center', marginTop:24, fontSize:12, color:'var(--text-muted)' }}>
            الافتراضي: admin / admin123
          </p>
        </div>
      </div>
      <div className="login-right">
        <div style={{ position:'relative', zIndex:1, textAlign:'center', padding:40 }}>
          <div style={{ fontSize:60, marginBottom:16 }}>⚡</div>
          <h2 style={{ fontSize:32, fontWeight:800, marginBottom:12 }}>منصة فليكسي GSM</h2>
          <p style={{ color:'var(--text-secondary)', maxWidth:360, margin:'0 auto', lineHeight:1.7 }}>
            نظام إدارة الاتصالات الاحترافي. تعبئة فليكسي، خدمات GSM، إدارة المحافظ، ونظام بيئي متعدد الموزعين.
          </p>
        </div>
      </div>
    </div>
  );
}
