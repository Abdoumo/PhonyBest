const fs = require('fs');
const path = require('path');

// Target paths based on the standard ranijay server layout
const BACKEND_PATH = path.join(__dirname, 'backend');
const FRONTEND_PATH = path.join(__dirname, 'admin_front');

// 1. Patch flexyController.js
let fcPath = path.join(BACKEND_PATH, 'src/controllers/flexyController.js');
if (fs.existsSync(fcPath)) {
  let fcCode = fs.readFileSync(fcPath, 'utf8');
  if (!fcCode.includes('getModemStatus')) {
    fcCode = fcCode.replace(
      'module.exports = { sendFlexy, getFlexyHistory, bulkFlexy };',
      `/**
 * GET /api/v1/flexy/modem-status
 */
const getModemStatus = async (req, res) => {
  try {
    const summary = await require('../wss/routingEngine').getRoutingSummary();
    res.json({ success: true, summary });
  } catch (err) {
    console.error('Get modem status error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { sendFlexy, getFlexyHistory, bulkFlexy, getModemStatus };`
    );
    fs.writeFileSync(fcPath, fcCode);
    console.log('✅ Patched backend/src/controllers/flexyController.js');
  }
} else {
  console.log('⚠️ Could not find flexyController.js - make sure you run this from the PhonyBest root');
}

// 2. Patch flexy.js (Routes)
let routePath = path.join(BACKEND_PATH, 'src/routes/flexy.js');
if (fs.existsSync(routePath)) {
  let routeCode = fs.readFileSync(routePath, 'utf8');
  if (!routeCode.includes('getModemStatus')) {
    routeCode = routeCode.replace(
      "const { sendFlexy, getFlexyHistory, bulkFlexy } = require('../controllers/flexyController');",
      "const { sendFlexy, getFlexyHistory, bulkFlexy, getModemStatus } = require('../controllers/flexyController');"
    ).replace(
      "module.exports = router;",
      "router.get('/modem-status', getModemStatus);\n\nmodule.exports = router;"
    );
    fs.writeFileSync(routePath, routeCode);
    console.log('✅ Patched backend/src/routes/flexy.js');
  }
}

// 3. Patch FlexyPage.jsx (Frontend)
let flexyPagePath = path.join(FRONTEND_PATH, 'src/pages/FlexyPage.jsx');
if (fs.existsSync(flexyPagePath)) {
  let pageCode = fs.readFileSync(flexyPagePath, 'utf8');
  if (!pageCode.includes('modemStatus')) {
    // Inject state
    pageCode = pageCode.replace(
      'const [showDropdown, setShowDropdown] = useState(false);',
      'const [showDropdown, setShowDropdown] = useState(false);\n  const [modemStatus, setModemStatus] = useState(null);'
    );
    
    // Inject API call
    pageCode = pageCode.replace(
      `.catch(e => console.error(e));\n  }, []);`,
      `.catch(e => console.error(e));\n\n    const fetchModemStatus = () => {\n      API.get('/flexy/modem-status')\n        .then(r => setModemStatus(r.data.summary))\n        .catch(e => console.error(e));\n    };\n\n    fetchModemStatus();\n    const interval = setInterval(fetchModemStatus, 15000);\n    return () => clearInterval(interval);\n  }, []);`
    );

    // Inject UI updates
    const oldUI = `{operators.map(op => (
              <div key={op.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'var(--bg-input)', borderRadius: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: op.color }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{t(op.name)}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>البادئة: {op.prefix}x</div>
                </div>
              </div>
            ))}`;

    const newUI = `{operators.map(op => {
              const opStats = modemStatus?.operators?.find(o => o.operator.toLowerCase() === op.id);
              const isOnline = modemStatus?.available && opStats && parseInt(opStats.online_count) > 0;
              const balance = opStats ? parseFloat(opStats.total_balance).toFixed(2) : '0.00';

              return (
                <div key={op.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, background: 'var(--bg-input)', borderRadius: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: op.color }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{t(op.name)}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>البادئة: {op.prefix}x</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'left', fontSize: 13 }}>
                    {isOnline ? (
                      <div>
                        <span style={{ color: 'var(--success)' }}>● متصل</span>
                        <div style={{ fontWeight: 600, fontFamily: 'monospace', marginTop: 2 }}>{balance} DA</div>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--danger)' }}>○ غير متصل</span>
                    )}
                  </div>
                </div>
              );
            })}`;
            
    pageCode = pageCode.replace(oldUI, newUI);
    fs.writeFileSync(flexyPagePath, pageCode);
    console.log('✅ Patched admin_front/src/pages/FlexyPage.jsx');
  }
}

console.log('====================================');
console.log('Patch complete! Next steps:');
console.log('1. cd backend && pm2 restart flexy-backend');
console.log('2. cd ../admin_front && npm install && npm run build');
console.log('3. Refresh your browser on the Flexy page!');
