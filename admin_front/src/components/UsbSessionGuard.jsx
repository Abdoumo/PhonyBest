import { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../redux/authSlice';
import { useNavigate } from 'react-router-dom';
import { FiShield, FiKey } from 'react-icons/fi';

const POLL_INTERVAL = 3000; // 3 seconds
const API_BASE = `${import.meta.env.VITE_BACKEND_URL}/api/v1`;

/**
 * UsbSessionGuard
 * 
 * This component polls the backend every 3 seconds to check if
 * a USB session is active for the current user. If the USB is removed
 * (session goes inactive), the user is immediately logged out.
 * 
 * The browser NEVER accesses the USB directly — it only trusts the backend.
 * 
 * Props:
 *   - enabled: boolean — whether USB session enforcement is active
 *   - children: React nodes to render when session is valid
 */
export default function UsbSessionGuard({ enabled = false, children }) {
  const { user } = useSelector(s => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const [usbStatus, setUsbStatus] = useState('checking'); // 'checking' | 'active' | 'waiting' | 'inactive'
  const [hasBeenActive, setHasBeenActive] = useState(false);
  const [lastCheck, setLastCheck] = useState(null);
  const intervalRef = useRef(null);

  const checkSession = useCallback(async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`${API_BASE}/usb-auth/session-status?user_id=${user.id}`);
      const data = await response.json();
      
      setLastCheck(new Date());

      if (data.active) {
        setUsbStatus('active');
        setHasBeenActive(true);
      } else {
        if (hasBeenActive) {
          // USB was removed AFTER being active — immediately log out
          setUsbStatus('inactive');
          dispatch(logout());
          navigate('/login', { replace: true });
        } else {
          // Waiting for user to insert USB for the first time (2FA)
          setUsbStatus('waiting');
        }
      }
    } catch (err) {
      console.error('USB session check failed:', err);
      // On network error, keep current status but mark as checking
      setUsbStatus(prev => prev === 'active' ? 'active' : 'checking');
    }
  }, [user?.id, dispatch, navigate]);

  useEffect(() => {
    if (!enabled || !user?.id) return;

    // Initial check
    checkSession();

    // Start polling
    intervalRef.current = setInterval(checkSession, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, user?.id, checkSession]); // Only depend on enabled, user?.id, and checkSession

  // If USB guard is not enabled, just render children
  if (!enabled) return children;

  // While checking initial status, show loading
  if (usbStatus === 'checking') {
    return (
      <>
        {children}
        <div className="usb-session-guard">
          <div className="usb-session-guard-card">
            <div className="usb-guard-icon waiting">
              <FiKey size={36} />
            </div>
            <h2>في انتظار مفتاح USB</h2>
            <p>
              يرجى إدخال مفتاح USB وتشغيل برنامج المصادقة على جهاز الكمبيوتر
            </p>
            <div className="usb-guard-status polling">
              <div className="usb-guard-pulse" />
              جاري البحث عن جلسة نشطة...
            </div>
          </div>
        </div>
      </>
    );
  }

  // Waiting for first-time insertion
  if (usbStatus === 'waiting') {
    return (
      <>
        {children}
        <div className="usb-session-guard">
          <div className="usb-session-guard-card">
            <div className="usb-guard-icon waiting">
              <FiKey size={36} />
            </div>
            <h2>مصادقة ثنائية (2FA)</h2>
            <p>
              يرجى إدخال مفتاح أمان USB الخاص بك وتشغيل برنامج المصادقة للوصول إلى النظام.
            </p>
            <div className="usb-guard-status polling">
              <div className="usb-guard-pulse" />
              في انتظار مفتاح USB...
            </div>
          </div>
        </div>
      </>
    );
  }

  // If inactive, the useEffect already triggered logout, but just in case show overlay
  if (usbStatus === 'inactive') {
    return (
      <>
        {children}
        <div className="usb-session-guard">
          <div className="usb-session-guard-card">
            <div className="usb-guard-icon error">
              <FiShield size={36} />
            </div>
            <h2>تم قطع الاتصال</h2>
            <p>
              تم إزالة مفتاح USB أو انتهت الجلسة. سيتم إعادة توجيهك لصفحة تسجيل الدخول.
            </p>
          </div>
        </div>
      </>
    );
  }

  // Active — render children normally
  return children;
}
