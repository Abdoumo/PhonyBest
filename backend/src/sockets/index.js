const jwt = require('jsonwebtoken');

/**
 * Socket.IO event handlers with strict JWT authentication and RBAC
 */
module.exports = (io) => {
  // Enforce JWT authentication on connection handshake
  io.use((socket, next) => {
    try {
      const authHeader = socket.handshake.headers?.authorization;
      const token = socket.handshake.auth?.token || 
                    (authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null) ||
                    socket.handshake.query?.token;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      return next(new Error('Invalid authentication token'));
    }
  });

  io.on('connection', (socket) => {
    const { userId, role } = socket.user;
    console.log(`🔌 Authenticated client connected: ${socket.id} (User: ${userId}, Role: ${role})`);

    // Automatically join the user's private channel
    socket.join(`user_${userId}`);

    // Admin room: Strictly restricted to users with ADMIN role
    socket.on('join_admin', () => {
      if (socket.user.role === 'ADMIN') {
        socket.join('admin');
        console.log(`🛡️ Admin joined admin room: ${socket.id}`);
      } else {
        console.warn(`⚠️ Unauthorized attempt to join admin room by user ${userId}`);
      }
    });

    // Join room: Only allow joining own room or by ADMIN
    socket.on('join_room', (targetUserId) => {
      const targetId = parseInt(targetUserId, 10);
      if (socket.user.role === 'ADMIN' || targetId === userId) {
        socket.join(`user_${targetId}`);
      } else {
        console.warn(`⚠️ User ${userId} attempted to join room user_${targetId}`);
      }
    });

    // Client-to-server transaction/wallet events: Only allow ADMIN to emit broadcasts directly
    socket.on('new_transaction', (data) => {
      if (socket.user.role === 'ADMIN') {
        io.to('admin').emit('transaction_update', data);
        if (data.client_id) {
          io.to(`user_${data.client_id}`).emit('transaction_update', data);
        }
      }
    });

    socket.on('wallet_update', (data) => {
      if (socket.user.role === 'ADMIN') {
        io.to(`user_${data.user_id}`).emit('wallet_changed', data);
      }
    });

    socket.on('sim_status', (data) => {
      if (socket.user.role === 'ADMIN') {
        io.to('admin').emit('sim_status_update', data);
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id} (User: ${userId})`);
    });
  });
};
