const WebSocket = require('ws');

// Replace this with your actual token
const TOKEN = '2dcc816636bd2849134823f9d810b32e2fdc2a55aebc830a43e1ad9c2e69737b';
const WS_URL = 'ws://69.57.163.97:8760/'; // Pointing back to your live server

console.log('🔄 Connecting to ModemGrid Server...');
const ws = new WebSocket(WS_URL); // Connect without headers

// 1. Authenticate via Initial Message (Option B)
ws.on('open', () => {
    console.log('✅ Connected successfully! Sending register auth message...');
    ws.send(JSON.stringify({
        type: "register",
        token: TOKEN
    }));
    
    // 2. Send an initial status immediately
    sendStatusUpdate();

    // 3. Send status every 30 seconds as required
    setInterval(sendStatusUpdate, 30 * 1000);
});

// Helper function to send the status update
function sendStatusUpdate() {
    const statusPayload = {
        type: "status",
        dongle_count: 3,
        online_count: 3,
        pools: [
            { pool_id: 1, name: "mobilis", total_balance: 150000, online_count: 2, dongle_count: 2 },
            { pool_id: 2, name: "djezzy", total_balance: 85000, online_count: 1, dongle_count: 1 }
        ],
        dongles: [
            { dongle_id: "MODEM_MOBILIS_01", name: "Mobilis 1", operator: "mobilis", signal: 85, balance: 50000, status: "idle", online: true, pool_ids: [1] },
            { dongle_id: "MODEM_MOBILIS_02", name: "Mobilis 2", operator: "mobilis", signal: 90, balance: 100000, status: "idle", online: true, pool_ids: [1] },
            { dongle_id: "MODEM_DJEZZY_01", name: "Djezzy 1", operator: "djezzy", signal: 75, balance: 85000, status: "idle", online: true, pool_ids: [2] }
        ]
    };
    
    console.log('📤 [STATUS] Sending node status update to server...');
    ws.send(JSON.stringify(statusPayload));
}

ws.on('message', (data) => {
    const message = data.toString();
    console.log('📥 [MESSAGE RECEIVED]:', message);

    try {
        const parsed = JSON.parse(message);
        
        // 3. Listen for Flexy / Topup Requests from the server
        if (parsed.api_name && parsed.variables) {
            // The ModemGrid node is responsible for generating its own request_id
            const fakeRequestId = require('crypto').randomUUID();
            
            console.log(`⚡ [NEW TOPUP REQUEST]`);
            console.log(`   - Type: ${parsed.api_name}`);
            console.log(`   - Data:`, parsed.variables);

            // Simulate the modem processing time (2 seconds)
            setTimeout(() => {
                const responsePayload = {
                    request_id: fakeRequestId,
                    status: "completed", // Server expects 'completed', 'failed', or 'timeout'
                    result: `Success! Balance deducted.`,
                    error: null,
                    modem_id: "MODEM_MOBILIS_01" // The dongle that "processed" it
                };
                
                console.log(`📤 [TOPUP RESPONSE] Sending success response...`);
                ws.send(JSON.stringify(responsePayload));
            }, 2000);
        }
    } catch (e) {
        // Some messages might just be text or empty JSON
    }
});

// 4. Automatically reply to ping frames with pong
ws.on('ping', () => {
    // Note: The 'ws' library does this automatically, but logging it to see it happen
    console.log('🏓 [HEARTBEAT] Received ping, sending pong');
});

ws.on('close', (code, reason) => {
    console.log(`❌ Disconnected from server (Code: ${code}, Reason: ${reason})`);
});

ws.on('error', (err) => {
    console.error('⚠️ WebSocket Error:', err.message);
});
