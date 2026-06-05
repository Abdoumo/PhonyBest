require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');
const { createTables } = require('./src/database/init');

const app = express();
const server = http.createServer(app);

// Socket.IO
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});
require('./src/sockets')(io);

// Make io accessible to routes
app.set('io', io);

// Security middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: '*', credentials: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Too many requests' },
});
app.use('/api/', limiter);

// Static files
app.use('/uploads', express.static('uploads'));

// API Routes
app.use('/api/v1/auth', require('./src/routes/auth'));
app.use('/api/v1/users', require('./src/routes/users'));
app.use('/api/v1/flexy', require('./src/routes/flexy'));
app.use('/api/v1/idoom', require('./src/routes/idoom'));
app.use('/api/v1/cards', require('./src/routes/cards'));
app.use('/api/v1/wallet', require('./src/routes/wallet'));
app.use('/api/v1/commissions', require('./src/routes/commissions'));
app.use('/api/v1/ads', require('./src/routes/ads'));
app.use('/api/v1/dashboard', require('./src/routes/dashboard'));
app.use('/api/v1/settings', require('./src/routes/settings'));
app.use('/api/v1/transactions', require('./src/routes/transactions'));
app.use('/api/v1/usb-auth', require('./src/routes/usbAuth'));
app.use('/api/v1/notifications', require('./src/routes/notifications'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await createTables();
    server.listen(PORT, () => {
      console.log(`🚀 Flexy GSM Backend running on port ${PORT}`);
      console.log(`📡 Socket.IO ready`);
      console.log(`🔗 API: http://localhost:${PORT}/api/v1`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();
