# ModemGrid WSS Integration — Implementation Plan

## Problem & Context

The Flexy GSM platform currently has a **fully functional REST API, database, and admin dashboard**, but the actual GSM gateway is **not wired up** — the [flexyController.js](file:///c:/Users/abdou/Downloads/BigGsm/backend/src/controllers/flexyController.js#L53) has a `// TODO: Integrate with actual GSM gateway here` and simply marks transactions as `success` immediately.

The goal is to integrate **ModemGrid PRO** nodes (which run the physical USB dongles) via the WSS protocol documented in [WSS_SERVER_GUIDE](file:///c:/Users/abdou/Downloads/BigGsm/WSS_SERVER_GUIDE%20(1).md). Multiple ModemGrid nodes connect to our server, register their dongles/pools, and wait for topup commands.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        YOUR EXPRESS SERVER                          │
│                                                                     │
│  ┌───────────┐  ┌──────────────┐  ┌──────────────┐                 │
│  │ REST API  │  │  Socket.IO   │  │   WSS Server │ ◄─── port 8760  │
│  │ (Express) │  │  (Dashboard) │  │  (ws library)│                 │
│  │ port 8000 │  │  port 8000   │  │              │                 │
│  └─────┬─────┘  └──────┬───────┘  └──────┬───────┘                 │
│        │               │                 │                          │
│  ┌─────▼───────────────▼─────────────────▼───────┐                 │
│  │              Core Services Layer              │                 │
│  │                                               │                 │
│  │  ┌──────────────┐  ┌──────────────────────┐   │                 │
│  │  │ Auth Service  │  │  Node Manager        │   │                 │
│  │  │ (WSS tokens)  │  │  (connected nodes)   │   │                 │
│  │  └──────────────┘  └──────────────────────┘   │                 │
│  │                                               │                 │
│  │  ┌──────────────┐  ┌──────────────────────┐   │                 │
│  │  │ Pool Manager │  │  Dongle Manager      │   │                 │
│  │  │ (pool state) │  │  (dongle state)      │   │                 │
│  │  └──────────────┘  └──────────────────────┘   │                 │
│  │                                               │                 │
│  │  ┌──────────────┐  ┌──────────────────────┐   │                 │
│  │  │Request Queue │  │  Routing Engine      │   │                 │
│  │  │ (FIFO+prio)  │  │  (operator, balance) │   │                 │
│  │  └──────────────┘  └──────────────────────┘   │                 │
│  └───────────────────────────────────────────────┘                 │
│                          │                                          │
│                    ┌─────▼─────┐                                    │
│                    │ PostgreSQL│                                    │
│                    └───────────┘                                    │
└─────────────────────────────────────────────────────────────────────┘
         ▲              ▲              ▲
    WSS  │         WSS  │         WSS  │
         │              │              │
    ┌────┴────┐   ┌─────┴────┐   ┌─────┴────┐
    │ Node A  │   │  Node B  │   │  Node C  │
    │ Mobilis │   │  Djezzy  │   │  Ooredoo │
    │ 3 dongs │   │  2 dongs │   │  5 dongs │
    └─────────┘   └──────────┘   └──────────┘
```

---

## User Review Required

> [!IMPORTANT]
> **WSS Port**: I propose running the WSS server on port **8760** (same as the guide examples) as a separate WebSocket server alongside the existing Express + Socket.IO on port 8000. This avoids any conflict with the existing Socket.IO setup. Acceptable?

> [!IMPORTANT]
> **Node Token Management**: I propose a simple approach — admin creates node tokens via the admin dashboard, stored in the DB with a hashed version. Each ModemGrid instance is configured with its token. No auto-enrollment. OK?

> [!WARNING]
> **Existing `sim_cards` table**: The current DB has a `sim_cards` table for local dongles. The ModemGrid integration replaces this concept entirely (ModemGrid reports its own dongles). I will **keep the `sim_cards` table** untouched for backward compatibility but the new WSS integration will use new tables (`wss_nodes`, `wss_dongles`, `wss_pools`). The flexy/idoom controllers will be modified to route through ModemGrid instead of the old `sim_cards` lookup.

---

## Open Questions

> [!IMPORTANT]
> **Fallback behavior**: When no ModemGrid nodes are online, should flexy/idoom requests be queued (waiting for a node to come back) or fail immediately with an error? I propose: **queue with a configurable timeout (default 60s), then fail**.

> [!IMPORTANT]
> **Multi-operator routing**: Should the Routing Engine strictly match by operator name (e.g. only send Mobilis topups to Mobilis pools), or should the admin be able to configure custom api_name → operator mappings in the dashboard?

---

## Proposed Changes

### 1. Database — New Tables

#### [MODIFY] [init.js](file:///c:/Users/abdou/Downloads/BigGsm/backend/src/database/init.js)

Add 6 new tables:

| Table | Purpose |
|-------|---------|
| `wss_nodes` | Registered ModemGrid nodes (id, name, token_hash, status, ip, last_seen, etc.) |
| `wss_dongles` | Live dongle state synced from nodes (dongle_id, node_id, operator, online, balance, etc.) |
| `wss_pools` | Live pool state synced from nodes (pool_id, node_id, name, api_names, dongle_count, etc.) |
| `wss_request_queue` | Pending/active topup requests waiting for ModemGrid execution |
| `wss_request_log` | Completed request history with results, timing, modem used |
| `wss_events` | Audit log for node connect/disconnect/error events |

---

### 2. Backend — WSS Core Modules

#### [NEW] [wssServer.js](file:///c:/Users/abdou/Downloads/BigGsm/backend/src/wss/wssServer.js)

The WebSocket Secure server that listens on port 8760:
- Accepts connections from ModemGrid nodes at `ws://host:8760/ws/client`
- Validates Bearer token from HTTP upgrade headers
- Delegates message handling to Node Manager
- Manages WebSocket lifecycle (connect, message, close, error)
- Integrated ping/pong heartbeat monitoring

#### [NEW] [authService.js](file:///c:/Users/abdou/Downloads/BigGsm/backend/src/wss/authService.js)

Token validation for WSS connections:
- Validates token from HTTP `Authorization` header during upgrade
- Validates token from `register` message body
- Looks up token_hash in `wss_nodes` table
- Returns the associated node record or rejects

#### [NEW] [nodeManager.js](file:///c:/Users/abdou/Downloads/BigGsm/backend/src/wss/nodeManager.js)

In-memory + DB tracking of connected nodes:
- `handleRegister(ws, data)` — stores pools/dongles, marks node online
- `handleStatusUpdate(ws, data)` — refreshes pool/dongle state
- `handleDisconnect(ws)` — marks node offline, cleans up pending requests
- `getOnlineNodes()` — returns all active node connections
- `getNodeByOperator(operator)` — finds nodes with matching pools
- Emits Socket.IO events to admin dashboard on state changes

#### [NEW] [poolManager.js](file:///c:/Users/abdou/Downloads/BigGsm/backend/src/wss/poolManager.js)

Pool state management:
- Syncs pool data from node status updates into `wss_pools` table
- `getPoolsByOperator(operator)` — finds pools that can handle an operator
- `getPoolByApiName(apiName)` — finds pools supporting a specific API
- `getPoolCapacity(poolId)` — returns online dongle count and total balance

#### [NEW] [dongleManager.js](file:///c:/Users/abdou/Downloads/BigGsm/backend/src/wss/dongleManager.js)

Dongle state management:
- Syncs dongle data from node status updates into `wss_dongles` table
- `getDonglesByNode(nodeId)` — all dongles for a node
- `getDonglesByOperator(operator)` — all online dongles for an operator
- `getTotalBalance(operator)` — aggregate balance across all nodes for an operator

#### [NEW] [requestQueue.js](file:///c:/Users/abdou/Downloads/BigGsm/backend/src/wss/requestQueue.js)

Request queue and tracking:
- `enqueue(request)` — adds a topup request to the queue, returns a promise
- `dequeue()` — picks the next request to process
- `handleResult(requestId, result)` — matches incoming results from nodes to pending requests
- Timeout handling — fails requests that exceed the configured timeout
- Resolves the original HTTP response promise when a result arrives
- Concurrency control — limits how many requests per node are in-flight

#### [NEW] [routingEngine.js](file:///c:/Users/abdou/Downloads/BigGsm/backend/src/wss/routingEngine.js)

Smart routing logic:
- `selectBestTarget(operator, amount, apiName)` — returns `{ node, pool }`:
  1. Filter nodes by `online` status
  2. Filter pools by `operator` match or `api_name` support
  3. Filter by `online_count > 0` (has available dongles)
  4. Filter by `total_balance >= amount` (enough credit)
  5. Sort by `highest_balance` descending (prefer nodes with most capacity)
  6. Return best candidate
- Supports operator-based routing (Mobilis → Mobilis pools)
- Supports api_name-based routing (custom APIs)

---

### 3. Backend — Modified Controllers

#### [MODIFY] [flexyController.js](file:///c:/Users/abdou/Downloads/BigGsm/backend/src/controllers/flexyController.js)

Replace the `// TODO: Integrate with actual GSM gateway here` block:
- Instead of immediately marking as `success`, call `routingEngine.selectBestTarget(operator, amount)`
- Send the topup request to the selected node via WSS
- Wait for the result (via `requestQueue` promise with timeout)
- Update transaction status based on actual ModemGrid response
- If no node available → queue or fail based on config
- Store `modem_id` and `node_id` in transaction metadata

#### [MODIFY] [idoomController.js](file:///c:/Users/abdou/Downloads/BigGsm/backend/src/controllers/idoomController.js)

Same pattern as flexy — route through ModemGrid instead of simulating success.

#### [MODIFY] [dashboardController.js](file:///c:/Users/abdou/Downloads/BigGsm/backend/src/controllers/dashboardController.js)

Add ModemGrid stats to the dashboard response:
- `connectedNodes` — count of online nodes
- `totalDongles` / `onlineDongles` — aggregate dongle counts
- `totalBalance` by operator — aggregate balances
- `pendingRequests` — count of queued requests

---

### 4. Backend — New REST API Routes

#### [NEW] [wssNodes.js](file:///c:/Users/abdou/Downloads/BigGsm/backend/src/routes/wssNodes.js)

Admin-only routes for node management:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/wss/nodes` | List all registered nodes + live status |
| `POST` | `/api/v1/wss/nodes` | Register a new node (generates token) |
| `DELETE` | `/api/v1/wss/nodes/:id` | Remove a node |
| `GET` | `/api/v1/wss/nodes/:id/dongles` | Get dongles for a specific node |
| `GET` | `/api/v1/wss/pools` | List all pools across all nodes |
| `GET` | `/api/v1/wss/dongles` | List all dongles across all nodes |
| `GET` | `/api/v1/wss/stats` | Aggregate stats (nodes, dongles, balances) |
| `GET` | `/api/v1/wss/queue` | Current request queue |
| `GET` | `/api/v1/wss/events` | Recent events log |

#### [NEW] [wssNodesController.js](file:///c:/Users/abdou/Downloads/BigGsm/backend/src/controllers/wssNodesController.js)

Controller implementing the above routes.

---

### 5. Backend — Server Integration

#### [MODIFY] [server.js](file:///c:/Users/abdou/Downloads/BigGsm/backend/server.js)

- Import and start the WSS server alongside Express
- Mount new route: `app.use('/api/v1/wss', require('./src/routes/wssNodes'))`
- Pass `io` (Socket.IO) to WSS modules for real-time dashboard updates

#### [MODIFY] [.env](file:///c:/Users/abdou/Downloads/BigGsm/backend/.env)

Add new environment variables:
```
WSS_PORT=8760
WSS_REQUEST_TIMEOUT=60000
WSS_MAX_CONCURRENT_PER_NODE=5
```

---

### 6. Admin Frontend — ModemGrid Dashboard Page

#### [NEW] [ModemGridPage.jsx](file:///c:/Users/abdou/Downloads/BigGsm/admin_front/src/pages/ModemGridPage.jsx)

A premium real-time dashboard page showing:

**Header Stats Cards** (4 cards):
- Connected Nodes (with online/offline count)
- Total Dongles (online/total)
- Total Balance (per operator breakdown)
- Pending Requests (in queue)

**Nodes Table** — Live view of all registered nodes:
- Node name, IP, status (online/offline indicator with pulse animation)
- Dongles count, online count, total balance
- Last seen timestamp
- Actions: view details, disconnect, remove

**Dongles Panel** — Expandable per-node:
- Dongle ID, operator, online status (green/red dot)
- Current balance (with color coding: green > 50, yellow > 20, red < 20)
- Pool membership

**Pools Panel** — Grouped view:
- Pool name, API names supported
- Dongle count, online count
- Total balance, highest balance

**Request Queue** — Live updating:
- Pending requests with operator, amount, phone number
- Status (queued, in-progress, completed, failed, timeout)
- Duration / time in queue

**Events Log** — Recent 50 events:
- Node connected/disconnected
- Request sent/completed/failed
- Balance alerts

**Add Node Modal** — Form to register a new node:
- Node name
- Generates and displays the token (copy button)

All sections update in real-time via Socket.IO.

#### [MODIFY] [App.jsx](file:///c:/Users/abdou/Downloads/BigGsm/admin_front/src/App.jsx)

Add route: `<Route path="modemgrid" element={<ModemGridPage />} />`

#### [MODIFY] [Layout.jsx](file:///c:/Users/abdou/Downloads/BigGsm/admin_front/src/layouts/Layout.jsx)

Add "ModemGrid" sidebar item with a router/antenna icon.

#### [MODIFY] [index.css](file:///c:/Users/abdou/Downloads/BigGsm/admin_front/src/index.css)

Add styles for:
- Pulse animation for online/offline status indicators
- Node status cards with glassmorphism
- Balance color coding
- Request queue table styles
- Event log timeline styling

---

## File Summary

### New Files (10)
| File | Description |
|------|-------------|
| `backend/src/wss/wssServer.js` | WSS server on port 8760 |
| `backend/src/wss/authService.js` | Token validation for nodes |
| `backend/src/wss/nodeManager.js` | Node lifecycle + state management |
| `backend/src/wss/poolManager.js` | Pool state sync and queries |
| `backend/src/wss/dongleManager.js` | Dongle state sync and queries |
| `backend/src/wss/requestQueue.js` | Request queuing + result matching |
| `backend/src/wss/routingEngine.js` | Smart node/pool selection |
| `backend/src/routes/wssNodes.js` | REST API routes for WSS management |
| `backend/src/controllers/wssNodesController.js` | Controller for WSS routes |
| `admin_front/src/pages/ModemGridPage.jsx` | Real-time ModemGrid dashboard |

### Modified Files (8)
| File | Changes |
|------|---------|
| `backend/src/database/init.js` | +6 new tables, +indexes |
| `backend/server.js` | +WSS server startup, +new route |
| `backend/.env` | +3 env vars |
| `backend/package.json` | +`ws` dependency |
| `backend/src/controllers/flexyController.js` | Route through ModemGrid |
| `backend/src/controllers/idoomController.js` | Route through ModemGrid |
| `backend/src/controllers/dashboardController.js` | +ModemGrid stats |
| `admin_front/src/App.jsx` | +ModemGrid route |
| `admin_front/src/layouts/Layout.jsx` | +Sidebar item |
| `admin_front/src/index.css` | +ModemGrid styles |

---

## Verification Plan

### Automated Tests
```bash
# 1. Start backend and verify WSS server boots
cd backend && npm run dev
# Check console output for "WSS server listening on :8760"

# 2. Verify new DB tables are created
# Check console output for "All tables created successfully"

# 3. Verify new REST API endpoints
curl http://localhost:8000/api/v1/wss/stats
curl http://localhost:8000/api/v1/wss/nodes
```

### Manual Verification
1. **Admin Dashboard** — Navigate to `/modemgrid`, verify the page renders with empty state
2. **Add Node** — Click "Add Node", create a test node, verify token is generated
3. **WSS Connection** — Configure a ModemGrid instance with the generated token and point it to `ws://server:8760/ws/client`, verify the node appears as "online" in the dashboard
4. **Flexy Send** — Send a flexy topup from the dashboard, verify it routes through the connected ModemGrid node and the result appears in the transaction history
5. **Real-time Updates** — Verify that node status changes (connect/disconnect/dongle changes) appear live in the dashboard without page refresh
6. **Disconnect Handling** — Kill the ModemGrid node, verify the dashboard shows it as offline within ~30 seconds
