const fs = require('fs');
const path = require('path');

const BACKEND_PATH = path.join(__dirname, 'backend');
let rqPath = path.join(BACKEND_PATH, 'src/wss/requestQueue.js');

if (fs.existsSync(rqPath)) {
  let rqCode = fs.readFileSync(rqPath, 'utf8');
  
  // Update enqueue method to send ID
  if (!rqCode.includes('request_id: String(queueId)')) {
    rqCode = rqCode.replace(
      '// Build the message to send to the node (per WSS protocol — no request_id, node generates it)\n  const message = {\n    api_name: apiName,\n    variables: variables,\n  };',
      '// Build the message to send to the node\n  // We send request_id and id so the node can deduplicate requests\n  const message = {\n    request_id: String(queueId),\n    id: String(queueId),\n    api_name: apiName,\n    variables: variables,\n  };'
    );
  }

  // Update handleResult for exact matching
  if (!rqCode.includes('const exactKey = `_queue_${request_id}`;')) {
    const oldMatching = `  // Since ModemGrid generates request_id and we stored by queueId,
  // we need to match by nodeId — find the oldest pending request for this node
  let matchedEntry = null;
  let matchedKey = null;

  for (const [key, entry] of pendingRequests.entries()) {
    if (entry.nodeId === nodeId && key.startsWith('_queue_')) {
      matchedEntry = entry;
      matchedKey = key;
      break; // FIFO — first entry for this node
    }
  }`;

    const newMatching = `  let matchedEntry = null;
  let matchedKey = null;

  // First try exact match if the node echoed the request_id we sent
  const exactKey = \`_queue_\${request_id}\`;
  if (pendingRequests.has(exactKey)) {
    matchedEntry = pendingRequests.get(exactKey);
    matchedKey = exactKey;
  } else {
    // Fallback to FIFO if the node generated a random UUID
    for (const [key, entry] of pendingRequests.entries()) {
      if (entry.nodeId === nodeId && key.startsWith('_queue_')) {
        matchedEntry = entry;
        matchedKey = key;
        break; // FIFO — first entry for this node
      }
    }
  }`;
    
    rqCode = rqCode.replace(oldMatching, newMatching);
  }

  fs.writeFileSync(rqPath, rqCode);
  console.log('✅ Patched backend/src/wss/requestQueue.js to send and match Request IDs!');
} else {
  console.log('⚠️ Could not find requestQueue.js');
}
