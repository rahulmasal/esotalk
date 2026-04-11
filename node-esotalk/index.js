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
    contentSecurityPolicy: false // Disabled to allow inline scripts from addons
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
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  store: new RedisStore({
    client: redisClient,
    prefix: "esotalk:",
  }),
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true in production with HTTPS
}));

app.use(passport.initialize());
app.use(passport.session());

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
  
  // Join private room for DMs
  socket.on('joinRoom', (userId) => {
    socket.join(`user_${userId}`);
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
app.use('/upload', require('./routes/uploads'));
app.use('/profile', require('./routes/profile'));
app.use('/', globalLimiter, require('./routes/forum'));

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});