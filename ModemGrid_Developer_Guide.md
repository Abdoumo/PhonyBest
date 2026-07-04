# ModemGrid PRO Server Integration Guide

This document outlines how to connect a physical ModemGrid PRO node to the BigGsm Flexy backend.

## 1. Connection Details
- **Protocol:** WebSocket (WS)
- **URL:** `ws://69.57.163.97:8760/`

## 2. Authentication
You must authenticate your connection using the unique Token generated in the Admin Dashboard when adding the node.

There are **two ways** to authenticate:

**Option A: HTTP Header (Recommended)**
Send the token in the initial WebSocket HTTP Upgrade request:
```http
Authorization: Bearer YOUR_NODE_TOKEN
```

**Option B: Initial Message**
If your WebSocket client cannot modify HTTP headers, connect and immediately send a `register` JSON message:
```json
{
  "type": "register",
  "token": "YOUR_NODE_TOKEN"
}
```

*Note: If you do not authenticate immediately, the server will drop your connection.*

## 3. Communication Protocol

All communication over the WebSocket is formatted as JSON objects.

### A. Node Status Updates (Client -> Server)
The node must send a status update every 30 seconds to keep the dashboard synced with physical hardware states.

**Message format:**
```json
{
  "type": "status",
  "pools": [
    {
      "operator": "mobilis",
      "balance": 150000,
      "online_count": 5
    },
    {
      "operator": "djezzy",
      "balance": 85000,
      "online_count": 3
    }
  ],
  "dongles": [
    {
      "modem_id": "MODEM_01",
      "operator": "mobilis",
      "signal": 85,
      "balance": 50000,
      "status": "idle"
    }
  ]
}
```

### B. Topup Request (Server -> Client)
When a user requests a recharge (Flexy, Idoom), the server will route it to your node via WebSocket.

**Message format:**
```json
{
  "request_id": "123e4567-e89b-12d3-a456-426614174000",
  "apiName": "flexy",
  "vars": {
    "phone": "0550123456",
    "amount": 1000,
    "operator": "mobilis"
  }
}
```

### C. Topup Response (Client -> Server)
Once the modem executes the USSD/API call, your client must immediately reply with the result matching the `request_id`.

**Success format:**
```json
{
  "request_id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "success",
  "modem_id": "MODEM_01"
}
```

**Failure format:**
```json
{
  "request_id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "failed",
  "error": "Insufficient balance on SIM",
  "modem_id": "MODEM_01"
}
```

## 4. Connection Health (Ping/Pong)
The server runs a strict heartbeat monitor.
- The server will send a `ping` frame every 30 seconds.
- The node's WebSocket client **must** automatically reply with a `pong` frame.
- If the server misses a `pong`, it assumes the node is offline, terminates the connection, and clears its active queue.
