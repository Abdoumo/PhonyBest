import { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../redux/authSlice';
import { useNavigate } from 'react-router-dom';
import { FiShield, FiKey } from 'react-icons/fi';
import API from '../api/axios';

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
export default function UsbSessionGuard({ children }) {
  const { user } = useSelector(s => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const [enabled, setEnabled] = useState(false);

  // Check if USB guard should be enabled
  useEffect(() => {
    if (!user) return;
    API.get('/settings').then(res => {
      const settings = res.data.settings || {};
      const isEnabled = user.usb_auth_required || (settings.usb_auth_enabled === 'true' || settings.usb_auth_enabled === true);
      setEnabled(isEnabled);
    }).catch(e => {
      setEnabled(user.usb_auth_required);
    });

    // Listen for backend enforcement (in case user tampers with the /me response)
    const handleEnforced = () => setEnabled(true);
    window.addEventListener('usb_auth_enforced', handleEnforced);
    return () => window.removeEventListener('usb_auth_enforced', handleEnforced);
  }, [user]);
  
  const [usbStatus, setUsbStatus] = useState('checking'); // 'checking' | 'active' | 'waiting' | 'inactive'
  const [hasBeenActive, setHasBeenActive] = useState(false);
  const [lastCheck, setLastCheck] = useState(null);
  const [linkedSessionId, setLinkedSessionId] = useState(null);
  const intervalRef = useRef(null);

  const checkSession = useCallback(async () => {
    if (!user?.id) return;

    try {
      // 1. Poll the Local Python Bridge (running on the same PC)
      const response = await fetch(`http://127.0.0.1:4005/get-session`);
      const data = await response.json();
      
      setLastCheck(new Date());

      if (data.active && data.session_id) {
        // We have an active physical USB
        // If we haven't linked this exact session ID to the browser yet, link it now
        if (linkedSessionId !== data.session_id) {
          try {
            await API.post('/usb-auth/link-session', { session_id: data.session_id });
            setLinkedSessionId(data.session_id);
          } catch (linkErr) {
            console.error('Failed to link session with backend:', linkErr);
            // Treat as checking so we try again
            setUsbStatus('checking');
            return;
          }
        }
        
        setUsbStatus('active');
        setHasBeenActive(true);
      } else {
        // USB is not active locally
        if (hasBeenActive) {
          // USB was removed AFTER being active — immediately log out
          setUsbStatus('inactive');
          API.post('/usb-auth/logout', { session_id: linkedSessionId }).catch(()=>{});
          dispatch(logout());
          navigate('/login', { replace: true });
        } else {
          // Waiting for user to insert USB for the first time
          setUsbStatus('waiting');
        }
      }
    } catch (err) {
      // If localhost:4005 is unreachable, the python script is not running
      if (hasBeenActive) {
        setUsbStatus('inactive');
        API.post('/usb-auth/logout', { session_id: linkedSessionId }).catch(()=>{});
        dispatch(logout());
        navigate('/login', { replace: true });
      } else {
        setUsbStatus('waiting');
      }
    }
  }, [user?.id, dispatch, navigate, linkedSessionId, hasBeenActive]);

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
