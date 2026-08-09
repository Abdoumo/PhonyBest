import { useEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { loginUser } from '../redux/authSlice';
import { FiZap, FiKey, FiAlertCircle } from 'react-icons/fi';

export default function VerifyUsbPage() {
  const { t } = useLanguage();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, error } = useSelector(s => s.auth);
  
  const [checking, setChecking] = useState(true);
  const [localError, setLocalError] = useState('');

  // Extract username and password from location state passed from LoginPage
  const credentials = location.state;

  useEffect(() => {
    // If no credentials in state, go back to login
    if (!credentials || !credentials.username || !credentials.password) {
      navigate('/login', { replace: true });
      return;
    }

    let intervalId;

    const checkUsbKey = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);
        const response = await fetch('http://127.0.0.1:4005/get-session', { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          if (data?.active && data?.session_id) {
            // Found the key! Stop checking and submit login
            clearInterval(intervalId);
            setChecking(false);
            
            try {
              await dispatch(loginUser({ 
                username: credentials.username, 
                password: credentials.password, 
                usb_session_id: data.session_id 
              })).unwrap();
              // Success! AppRoutes will handle redirection to /dashboard
            } catch (err) {
              setLocalError(err?.message || 'Authentication failed');
            }
          }
        }
      } catch (err) {
        // Just wait for the next interval
      }
    };

    // Initial check
    checkUsbKey();

    // Check every 2 seconds
    intervalId = setInterval(checkUsbKey, 2000);

    return () => clearInterval(intervalId);
  }, [credentials, dispatch, navigate]);

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-card fade-in" style={{ textAlign: 'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:32, justifyContent: 'center' }}>
            <div className="logo" style={{
              width:48, height:48, background:'linear-gradient(135deg, var(--accent), #a78bfa)',
              borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center'
            }}>
              <FiZap size={24} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontSize:22, margin:0 }}>FLEXY GSM</h2>
            </div>
          </div>

          <div style={{ margin: '40px 0' }}>
            <FiKey size={64} color="var(--accent)" style={{ marginBottom: 24, animation: 'pulse 2s infinite' }} />
            <h2>{t('مطلوب مفتاح أمان USB')}</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: 12 }}>
              {t('حسابك محمي بمفتاح أمان. يرجى إدخال مفتاح USB الخاص بك للمتابعة.')}
            </p>
          </div>

          {(error || localError) && (
            <div className="login-error" style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
              <FiAlertCircle />
              {error || localError}
            </div>
          )}

          {checking ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 24, color: 'var(--accent)' }}>
              <span className="spinner" style={{width: 20, height: 20, borderWidth: 2}}></span>
              <span>{t('جاري البحث عن المفتاح...')}</span>
            </div>
          ) : loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 24, color: 'var(--accent)' }}>
              <span className="spinner" style={{width: 20, height: 20, borderWidth: 2}}></span>
              <span>{t('جاري تسجيل الدخول...')}</span>
            </div>
          ) : (
            <button className="btn btn-primary" style={{ marginTop: 24 }} onClick={() => navigate('/login')}>
              {t('العودة إلى تسجيل الدخول')}
            </button>
          )}

          <div style={{ marginTop: 40 }}>
            <button className="btn btn-secondary" onClick={() => navigate('/login')} style={{ width: '100%' }}>
              {t('إلغاء')}
            </button>
          </div>
        </div>
      </div>
      <div className="login-right">
        <div style={{ position:'relative', zIndex:1, textAlign:'center', padding:40 }}>
          <div style={{ fontSize:60, marginBottom:16 }}>⚡</div>
          <h2 style={{ fontSize:32, fontWeight:800, marginBottom:12 }}>أمان متقدم</h2>
          <p style={{ color:'var(--text-secondary)', maxWidth:360, margin:'0 auto', lineHeight:1.7 }}>
            هذا الحساب محمي بواسطة مصادقة الأجهزة. يضمن مفتاح USB الخاص بك عدم تمكن أي شخص آخر من الوصول إلى حسابك حتى لو كان يمتلك كلمة المرور الخاصة بك.
          </p>
        </div>
      </div>
    </div>
  );
}
