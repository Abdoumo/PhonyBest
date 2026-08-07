const WebSocket = require('ws');

// Connect to the server using the token in the headers
const ws = new WebSocket('ws://69.57.163.97:8760/', {
    headers: {
        'Authorization': 'Bearer 6bd9b9eb34e0e858655e25fba865fab97c667b28f15b394c50116b58c4a42228'
    }
});

ws.on('open', function open() {
    console.log('✅ Connected to ModemGrid Server');

    // Send a status update immediately after connecting
    const statusUpdate = {
        type: "status",
        pools: [
            {
                operator: "mobilis",
                balance: 150000,
                online_count: 1
            }
        ],
        dongles: [
            {
                modem_id: "MODEM_TEST_01",
                operator: "mobilis",
                signal: 85,
                balance: 50000,
                status: "idle"
            }
        ]
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
