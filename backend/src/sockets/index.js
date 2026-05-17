/**
 * Socket.IO event handlers for Flexy GSM Platform
 */
module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join user-specific room
    socket.on('join_room', (userId) => {
      socket.join(`user_${userId}`);
      console.log(`User ${userId} joined room`);
    });

    // Admin room
    socket.on('join_admin', () => {
      socket.join('admin');
      console.log(`Admin joined: ${socket.id}`);
    });

    // Transaction events
    socket.on('new_transaction', (data) => {
      io.to('admin').emit('transaction_update', data);
      if (data.client_id) {
        io.to(`user_${data.client_id}`).emit('transaction_update', data);
      }
    });

    // Wallet events
    socket.on('wallet_update', (data) => {
      io.to(`user_${data.user_id}`).emit('wallet_changed', data);
    });

    // SIM status events
    socket.on('sim_status', (data) => {
      io.to('admin').emit('sim_status_update', data);
    });

    // Bulk progress
    socket.on('bulk_progress', (data) => {
      io.to(`user_${data.user_id}`).emit('bulk_progress_update', data);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });
};
