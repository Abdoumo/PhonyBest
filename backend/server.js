require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');
const { createTables } = require('./src/database/init');
const cookieParser = require('cookie-parser');

const app = express();
app.set('trust proxy', true);
app.use(cookieParser());
const server = http.createServer(app);

// Security & CORS Configuration
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
].filter(Boolean);

const isOriginAllowed = (origin) => {
  if (!origin) return true; // Allow non-browser requests (e.g. server-to-server, mobile, curl)
  if (allowedOrigins.includes(origin)) return true;
  // Allow localhost with any dev port or same-origin domain
  if (/^http:\/\/localhost(:\d+)?$/.test(origin) || /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
    return true;
  }
  return false;
};

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) callback(null, true);
      else callback(new Error('Socket connection blocked by CORS'));
    },
    methods: ['GET', 'POST'],
    credentials: true
  },
});
require('./src/sockets')(io);

// Make io accessible to routes
app.set('io', io);

// Security middleware (Helmet with HSTS and CSP)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'same-site' },
  hsts: process.env.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc: ["'self'", 'ws:', 'wss:', 'https:'],
      fontSrc: ["'self'", 'data:', 'https:'],
      objectSrc: ["'none'"],
      frameAncestors: ["'self'"]
    }
  }
}));

const corsOptions = {
  origin: function (origin, callback) {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Global limit: 1000 requests per 15 minutes
  message: { error: 'Too many requests' },
});
app.use('/api/', limiter);

// Strict rate limiting for authentication (Brute Force Protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login attempts per window
  message: { error: 'Too many login attempts, please try again after 15 minutes' },
});

// Static files with nosniff header protection
app.use('/uploads', express.static('uploads', {
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
}));

// Swagger UI
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./openapi.json');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));


// API Routes
app.use('/api/v1/auth/login', authLimiter); // Apply strict limiter only to login
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
app.use('/api/v1/wss', require('./src/routes/wssNodes'));
app.use('/api/v1/analytics', require('./src/routes/analytics'));
app.use('/api/v1/stock', require('./src/routes/stock'));
app.use('/api/v1/admin/offer-mappings', require('./src/routes/offerMappings'));

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

      // Start WSS ModemGrid server
      const wssServer = require('./src/wss/wssServer');
      wssServer.start(io);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();
