/**
 * WSS Server for ModemGrid Integration
 * Listens on WSS_PORT (default 8760) for ModemGrid node connections
 */
const { WebSocketServer } = require('ws');
const url = require('url');
const authService = require('./authService');
const nodeManager = require('./nodeManager');
const requestQueue = require('./requestQueue');

let wss = null;

/**
 * Start the WSS server
 * @param {object} io - Socket.IO instance for real-time dashboard updates
 */
function start(io) {
  const port = parseInt(process.env.WSS_PORT) || 8760;

  // Initialize node manager with Socket.IO
  nodeManager.init(io);

  wss = new WebSocketServer({ port });

  wss.on('listening', () => {
    console.log(`📡 WSS ModemGrid server listening on port ${port}`);
  });

  wss.on('connection', async (ws, req) => {
    console.log(`🔌 WSS: New connection from ${req.socket.remoteAddress}`);

    // Store remote address on the ws for later use
    ws._socket = req.socket;

    // Try to authenticate from HTTP upgrade headers
    const headerToken = authService.extractTokenFromHeaders(req);
    if (headerToken) {
      const node = await authService.validateToken(headerToken);
      if (node) {
        ws._authenticated = true;
        ws._node = node;
        console.log(`🔑 WSS: Pre-authenticated node "${node.name}" from headers`);
      }
    }

    ws.on('message', async (raw) => {
      let data;
      try {
        data = JSON.parse(raw.toString());
      } catch (e) {
        console.warn('⚠️ WSS: Invalid JSON received');
        return;
      }

      try {
        // Handle registration message
        if (data.type === 'register') {
          // Authenticate from register message if not already done via headers
          if (!ws._authenticated) {
            const token = data.token;
            if (!token) {
              console.warn('⚠️ WSS: Register without token, closing');
              ws.close(4001, 'Authentication required');
              return;
            }
            const node = await authService.validateToken(token);
            if (!node) {
              console.warn('⚠️ WSS: Invalid token in register message, closing');
              ws.close(4001, 'Invalid token');
              return;
            }
            ws._authenticated = true;
            ws._node = node;
          }

          await nodeManager.handleRegister(ws, ws._node, data);
          return;
        }

        // All subsequent messages require authentication
        if (!ws._authenticated) {
          console.warn('⚠️ WSS: Message from unauthenticated connection, ignoring');
          return;
        }

        // Handle periodic status update
        if (data.type === 'status') {
          await nodeManager.handleStatusUpdate(ws, data);
          return;
        }

        // Handle result from a topup request
        if (data.request_id) {
          await requestQueue.handleResult(ws._nodeId, data);
          return;
        }

        // Unknown message type — log it
        console.log(`📨 WSS: Unknown message type from "${ws._nodeName}":`, data.type || 'no type');

      } catch (err) {
        console.error(`❌ WSS message handler error:`, err.message);
      }
    });

    ws.on('close', async (code, reason) => {
      console.log(`🔌 WSS: Connection closed (code: ${code}, reason: ${reason || 'none'})`);
      
      if (ws._nodeId) {
        // Cancel pending requests for this node
        await requestQueue.cancelPendingForNode(ws._nodeId);
        // Handle disconnect in node manager
        await nodeManager.handleDisconnect(ws);
      }
    });

    ws.on('error', (err) => {
      console.error(`❌ WSS connection error:`, err.message);
    });

    // Set up ping/pong for connection health monitoring
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });
  });

  // Heartbeat interval — check all connections every 30s
  const heartbeatInterval = setInterval(() => {
    if (!wss) return;
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        console.log(`⚠️ WSS: Terminating unresponsive connection`);
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  wss.on('error', (err) => {
    console.error('❌ WSS Server error:', err.message);
  });

  return wss;
}

/**
 * Stop the WSS server
 */
function stop() {
  if (wss) {
    wss.close();
    wss = null;
  }
}

/**
 * Get the WSS server instance
 */
function getServer() {
  return wss;
}

module.exports = { start, stop, getServer };
