const WebSocket = require('ws');

// Connect to the server using wss://grid.phonybest.dz or local fallback
const WSS_URL = process.env.WSS_URL || 'wss://grid.phonybest.dz/';
const TOKEN = process.env.WSS_TOKEN || '6bd9b9eb34e0e858655e25fba865fab97c667b28f15b394c50116b58c4a42228';

console.log(`Connecting to ModemGrid WSS at: ${WSS_URL}`);

const ws = new WebSocket(WSS_URL, {
    headers: {
        'Authorization': `Bearer ${TOKEN}`
    }
});

ws.on('open', function open() {
    console.log('✅ Connected to ModemGrid Server');

    // Send a status update immediately after connecting
    const statusUpdate = {
        type: "status",
        pools: [
            {
                pool_id: 1,
                operator: "mobilis",
                balance: 150000,
                online_count: 1,
                total_balance: 150000,
                dongle_count: 1
            }
        ],
        dongles: [
            {
                modem_id: "MODEM_TEST_01",
                dongle_id: "MODEM_TEST_01",
                operator: "mobilis",
                signal: 85,
                balance: 50000,
                status: "idle",
                online: true,
                pool_ids: [1]
            }
        ],
        dongle_count: 1,
        online_count: 1
    };

    console.log('📤 Sending status update...');
    ws.send(JSON.stringify(statusUpdate));
});

ws.on('message', function incoming(data) {
    console.log('📥 Received from server:', data.toString());
});

// Automatically reply to server pings (Heartbeat)
ws.on('ping', () => {
    console.log('🏓 Received ping, sending pong');
    ws.pong();
});

ws.on('close', () => {
    console.log('❌ Disconnected from server');
});
