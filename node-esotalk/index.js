const fs = require('fs');
const path = require('path');

// ──────────────────────────────────────
// STARTUP LOGIC: SETUP WIZARD OR MAIN APP
// ──────────────────────────────────────
if (!fs.existsSync(path.join(__dirname, '.env'))) {
    // Start Setup Wizard
    require('./setupServer')();
} else {
    // Start Main Application
    require('dotenv').config();
    const express = require('express');
    const http = require('http');
    const { Server } = require('socket.io');
    const session = require('express-session');
    const { RedisStore } = require('connect-redis');
    const { createClient } = require('redis');
    const passport = require('passport');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const sequelize = require('./config/database');
const User = require('./models/User');
const Channel = require('./models/Channel');
const Conversation = require('./models/Conversation');
const Post = require('./models/Post');
const Message = require('./models/Message');
const Report = require('./models/Report');
const AuditLog = require('./models/AuditLog');
const Poll = require('./models/Poll');
const Bookmark = require('./models/Bookmark');
const Draft = require('./models/Draft');
const Notification = require('./models/Notification');
const Subscription = require('./models/Subscription');
const PasswordReset = require('./models/PasswordReset');
const PostEdit = require('./models/PostEdit');
const bodyParser = require('body-parser');
const path = require('path');

require('./config/passport')(passport);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Set up view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ──────────────────────────────────────
// SECURITY MIDDLEWARE
// ──────────────────────────────────────
app.use(helmet({
    contentSecurityPolicy: false, // Disabled to allow inline scripts from addons
    crossOriginEmbedderPolicy: false
}));

// Global Rate Limiter: 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP. Please try again after 15 minutes.'
});

// Strict Auth Limiter: 10 login attempts per 15 minutes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Too many login attempts. Please try again after 15 minutes.'
});

app.use(cookieParser());

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Initialize Redis client
let redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});
redisClient.connect().catch(console.error);

// Session
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  console.error('FATAL: SESSION_SECRET is not set in .env');
  process.exit(1);
}

const sessionMiddleware = session({
  secret: sessionSecret,
  store: new RedisStore({
    client: redisClient,
    prefix: "esotalk:",
  }),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
});

app.use(sessionMiddleware);

app.use(passport.initialize());
app.use(passport.session());

// Make user available in all EJS templates
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

// Share session with Socket.IO
const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);
io.use(wrap(sessionMiddleware));
io.use(wrap(passport.initialize()));
io.use(wrap(passport.session()));

// Pass user to views
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

// Sync database
sequelize.sync().then(() => {
  console.log('Database synced');
});

const addonManager = require('./addons/AddonManager');

// Socket.io integration
io.on('connection', (socket) => {
  console.log('A user connected');

  const sessionUserId = socket.request?.session?.passport?.user;
  if (!sessionUserId) {
    socket.disconnect(true);
    return;
  }

  // Join private room for DMs — only the authenticated user's own room
  socket.join(`user_${sessionUserId}`);

  // Online status tracking — only broadcast the authenticated user's ID
  socket.broadcast.emit('userOnline', sessionUserId);

  // Typing indicators
  socket.on('typing', (data) => {
    io.to(`user_${data.receiverId}`).emit('userTyping', { senderId: sessionUserId, senderName: data.senderName });
  });

  socket.on('stopTyping', (data) => {
    io.to(`user_${data.receiverId}`).emit('userStopTyping', { senderId: sessionUserId });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Make io accessible to routes
app.set('io', io);

// Initialize all plugins/addons
addonManager.loadAddons(app, io);

// Pass addon manager to views to allow rendering plugin hooks
app.use((req, res, next) => {
  res.locals.addonManager = addonManager;
  next();
});

// Import Routes
app.use('/auth', authLimiter, require('./routes/auth'));
app.use('/admin', require('./routes/admin'));
app.use('/messages', require('./routes/messages'));
app.use('/notifications', require('./routes/notifications'));
app.use('/upload', require('./routes/uploads'));
app.use('/profile', require('./routes/profile'));
app.use('/', globalLimiter, require('./routes/forum'));

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).send('Internal Server Error');
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
}