require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const { RedisStore } = require('connect-redis');
const { createClient } = require('redis');
const passport = require('passport');
const sequelize = require('./config/database');
const User = require('./models/User');
const Channel = require('./models/Channel');
const Conversation = require('./models/Conversation');
const Post = require('./models/Post');
const bodyParser = require('body-parser');
const path = require('path');

require('./config/passport')(passport);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Set up view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

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
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Initialize all plugins/addons
addonManager.loadAddons(app, io);

// Pass addon manager to views to allow rendering plugin hooks
app.use((req, res, next) => {
  res.locals.addonManager = addonManager;
  next();
});

// Import Routes
app.use('/auth', require('./routes/auth'));
app.use('/', require('./routes/forum'));

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});