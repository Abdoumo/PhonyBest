const fs = require('fs');

// 1. Patch requestQueue.js to return the full raw JSON data
let rqPath = './src/wss/requestQueue.js';
let rqCode = fs.readFileSync(rqPath, 'utf8');
rqCode = rqCode.replace(
  'duration,\n  });',
  'duration,\n    raw_data: data,\n  });'
);
fs.writeFileSync(rqPath, rqCode);

// 2. Patch flexyController.js to show the raw data in the response
let fcPath = './src/controllers/flexyController.js';
let fcCode = fs.readFileSync(fcPath, 'utf8');
fcCode = fcCode.replace(
  'wss_result: wssResult.result,',
  'wss_result: wssResult.raw_data,'
);
fs.writeFileSync(fcPath, fcCode);

console.log('✅ Server patched to show RAW modem responses!');
