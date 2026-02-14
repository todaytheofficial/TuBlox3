const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = 3000;
const JWT_SECRET = 'tublox3_secret_key_2024';
const MONGO_URI = 'mongodb+srv://Today_Idk:TpdauT434odayTodayToday23@cluster0.rlgkop5.mongodb.net/tublox3?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(MONGO_URI)
  .then(() => console.log('[DB] MongoDB connected'))
  .catch(err => console.error('[DB] MongoDB error:', err));

// ==================== SCHEMAS ====================

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, minlength: 3, maxlength: 20 },
  password: { type: String, required: true },
  avatar: {
    bodyColor: { type: String, default: '#FFFFFF' },
    headColor: { type: String, default: '#FFFFFF' },
    eyeColor: { type: String, default: '#000000' }
  },
  bio: { type: String, default: '', maxlength: 200 },
  urus: { type: Number, default: 0 },
  dailyStrikes: { type: Number, default: 0 },
  lastDailyReward: { type: Date, default: null },
  gamesPlayed: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

const gameSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  type: { type: String, enum: ['platformer', 'pvp', 'obby', 'sandbox'], required: true },
  status: { type: String, enum: ['active', 'coming_soon', 'disabled'], default: 'active' },
  thumbnail: {
    style: { type: String, default: 'default' },
    bgColor: { type: String, default: '#080808' },
    label: { type: String, default: '' },
    sublabel: { type: String, default: '' }
  },
  config: {
    gravity: { type: Number, default: 0.6 },
    maxFallSpeed: { type: Number, default: 12 },
    playerSpeed: { type: Number, default: 4 },
    jumpForce: { type: Number, default: -12 },
    spawnX: { type: Number, default: 100 },
    spawnY: { type: Number, default: 200 },
    platforms: { type: Array, default: [] },
    checkpoints: { type: Array, default: [] },
    items: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  maxPlayers: { type: Number, default: 20 },
  order: { type: Number, default: 0 },
  totalPlays: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Game = mongoose.model('Game', gameSchema);

// ==================== MIDDLEWARE ====================

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

function authMiddleware(req, res, next) {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.username = decoded.username;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ==================== DAILY STRIKES LOGIC ====================

function getStrikeReward(strikes) {
  if (strikes >= 15) return 6;
  if (strikes >= 10) return 4;
  if (strikes >= 5) return 2;
  return 1;
}

function getNextMilestone(strikes) {
  if (strikes < 5) return { day: 5, reward: 2 };
  if (strikes < 10) return { day: 10, reward: 4 };
  if (strikes < 15) return { day: 15, reward: 6 };
  return { day: null, reward: 6 };
}

function getDayStart(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

async function checkDailyReward(user) {
  const now = new Date();
  const todayStart = getDayStart(now);

  let rewarded = false;
  let rewardAmount = 0;
  let streakReset = false;

  if (!user.lastDailyReward) {
    user.dailyStrikes = 1;
    rewardAmount = getStrikeReward(1);
    user.urus += rewardAmount;
    user.lastDailyReward = now;
    rewarded = true;
  } else {
    const lastStart = getDayStart(user.lastDailyReward);
    const diffDays = Math.floor((todayStart - lastStart) / (24 * 60 * 60 * 1000));

    if (diffDays === 0) {
      rewarded = false;
    } else if (diffDays === 1) {
      user.dailyStrikes += 1;
      rewardAmount = getStrikeReward(user.dailyStrikes);
      user.urus += rewardAmount;
      user.lastDailyReward = now;
      rewarded = true;
    } else {
      user.dailyStrikes = 1;
      rewardAmount = getStrikeReward(1);
      user.urus += rewardAmount;
      user.lastDailyReward = now;
      rewarded = true;
      streakReset = true;
    }
  }

  if (rewarded) {
    await user.save();
  }

  return {
    rewarded,
    rewardAmount,
    totalUrus: user.urus,
    dailyStrikes: user.dailyStrikes,
    streakReset,
    currentRewardRate: getStrikeReward(user.dailyStrikes),
    nextMilestone: getNextMilestone(user.dailyStrikes)
  };
}

// ==================== PAGES ====================

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/pages/landing.html')));
app.get('/home', (req, res) => res.sendFile(path.join(__dirname, 'public/pages/home.html')));
app.get('/auth', (req, res) => res.sendFile(path.join(__dirname, 'public/pages/auth.html')));
app.get('/profile', (req, res) => res.sendFile(path.join(__dirname, 'public/pages/profile.html')));
app.get('/avatar', (req, res) => res.sendFile(path.join(__dirname, 'public/pages/avatar.html')));
app.get('/game', (req, res) => res.sendFile(path.join(__dirname, 'public/pages/game.html')));

// ==================== AUTH API ====================

app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    if (username.length < 3 || username.length > 20) return res.status(400).json({ error: 'Username must be 3-20 chars' });
    if (password.length < 4) return res.status(400).json({ error: 'Password must be 4+ chars' });
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return res.status(400).json({ error: 'Letters, numbers, underscores only' });

    const existing = await User.findOne({ username: username.toLowerCase() });
    if (existing) return res.status(400).json({ error: 'Username taken' });

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ username: username.toLowerCase(), password: hashed });
    await user.save();

    const reward = await checkDailyReward(user);

    const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: false, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ success: true, username: user.username, dailyReward: reward });
  } catch (e) {
    console.error('[Register]', e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Fill all fields' });

    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });

    user.lastLogin = new Date();
    await user.save();

    const reward = await checkDailyReward(user);

    const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: false, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ success: true, username: user.username, dailyReward: reward });
  } catch (e) {
    console.error('[Login]', e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.status(404).json({ error: 'Not found' });

    const reward = await checkDailyReward(user);

    res.json({
      username: user.username,
      avatar: user.avatar,
      bio: user.bio,
      urus: user.urus,
      dailyStrikes: user.dailyStrikes,
      dailyReward: reward,
      gamesPlayed: user.gamesPlayed,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

app.post('/api/avatar', authMiddleware, async (req, res) => {
  try {
    const { bodyColor, headColor, eyeColor } = req.body;
    await User.findByIdAndUpdate(req.userId, {
      avatar: {
        bodyColor: bodyColor || '#FFFFFF',
        headColor: headColor || '#FFFFFF',
        eyeColor: eyeColor || '#000000'
      }
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/bio', authMiddleware, async (req, res) => {
  try {
    const { bio } = req.body;
    if (bio && bio.length > 200) return res.status(400).json({ error: 'Too long' });
    await User.findByIdAndUpdate(req.userId, { bio: bio || '' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== GAMES API ====================

app.get('/api/games', async (req, res) => {
  try {
    const games = await Game.find({ status: { $ne: 'disabled' } })
      .select('slug name description type status thumbnail order totalPlays maxPlayers')
      .sort({ order: 1 });
    res.json(games);
  } catch (e) {
    console.error('[Games API]', e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/games/:slug', async (req, res) => {
  try {
    const game = await Game.findOne({ slug: req.params.slug, status: 'active' });
    if (!game) return res.status(404).json({ error: 'Game not found' });
    res.json(game);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/online', (req, res) => {
  const counts = {};
  for (const [roomId, room] of Object.entries(rooms)) {
    counts[room.place] = (counts[room.place] || 0) + Object.keys(room.players).length;
  }
  res.json(counts);
});

// ==================== GAME WORLDS (DB + CACHE) ====================

const PLACES_CACHE = {};

async function getPlaceConfig(slug) {
  if (PLACES_CACHE[slug]) return PLACES_CACHE[slug];

  const game = await Game.findOne({ slug, status: 'active' });
  if (!game) return null;

  const placeData = {
    name: game.name,
    type: game.type,
    gravity: game.config.gravity,
    maxFallSpeed: game.config.maxFallSpeed,
    playerSpeed: game.config.playerSpeed,
    jumpForce: game.config.jumpForce,
    spawnX: game.config.spawnX,
    spawnY: game.config.spawnY,
    platforms: game.config.platforms,
    checkpoints: game.config.checkpoints || [],
    items: game.config.items || {},
    maxPlayers: game.maxPlayers
  };

  PLACES_CACHE[slug] = placeData;
  return placeData;
}

function clearPlaceCache(slug) {
  delete PLACES_CACHE[slug];
}

// ==================== MULTIPLAYER ====================

const rooms = {};
const playerRooms = {};
// Anti-duplicate: userId -> socketId mapping
const activeUserSessions = {};

function getOrCreateRoom(placeName, maxPlayers = 20) {
  for (const [roomId, room] of Object.entries(rooms)) {
    if (room.place === placeName && Object.keys(room.players).length < maxPlayers) return roomId;
  }
  const roomId = `${placeName}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  rooms[roomId] = { players: {}, place: placeName };
  return roomId;
}

function removePlayerFromAllRooms(socketId) {
  const roomId = playerRooms[socketId];
  if (roomId && rooms[roomId]) {
    const player = rooms[roomId].players[socketId];
    delete rooms[roomId].players[socketId];
    io.to(roomId).emit('player-left', { id: socketId });
    if (Object.keys(rooms[roomId].players).length === 0) {
      delete rooms[roomId];
    }
  }
  delete playerRooms[socketId];
}

io.on('connection', (socket) => {

  // ---- JOIN GAME ----
  socket.on('join-game', async (data) => {
    try {
      const { token, place } = data;
      if (!token || !place) return;

      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (e) {
        return socket.emit('error-msg', 'Invalid token');
      }

      const userId = decoded.userId;
      const user = await User.findById(userId).select('-password');
      if (!user) return socket.emit('error-msg', 'User not found');

      const placeData = await getPlaceConfig(place);
      if (!placeData) return socket.emit('error-msg', 'TuGame not found');

      // === ANTI-DUPLICATE: kick old session ===
      const oldSocketId = activeUserSessions[userId];
      if (oldSocketId && oldSocketId !== socket.id) {
        const oldSocket = io.sockets.sockets.get(oldSocketId);
        if (oldSocket) {
          oldSocket.emit('kicked', 'You joined from another tab');
          removePlayerFromAllRooms(oldSocketId);
          oldSocket.disconnect(true);
        }
        delete activeUserSessions[userId];
      }

      // Check if this socket is already in a room
      if (playerRooms[socket.id]) {
        removePlayerFromAllRooms(socket.id);
      }

      // Register active session
      activeUserSessions[userId] = socket.id;
      socket._userId = userId;

      // Increment plays (only once per actual join, not per tab spam)
      user.gamesPlayed += 1;
      await user.save();
      await Game.updateOne({ slug: place }, { $inc: { totalPlays: 1 } });

      const roomId = getOrCreateRoom(place, placeData.maxPlayers);
      socket.join(roomId);
      playerRooms[socket.id] = roomId;

      let inventory = [null, null, null, null];
      if (placeData.type === 'pvp' && placeData.items && placeData.items.sword) {
        inventory[0] = {
          id: 'sword',
          name: placeData.items.sword.name,
          damage: placeData.items.sword.damage,
          range: placeData.items.sword.range,
          cooldown: placeData.items.sword.cooldown
        };
      }

      const playerData = {
        id: socket.id,
        username: user.username,
        x: placeData.spawnX,
        y: placeData.spawnY,
        vx: 0,
        vy: 0,
        width: 32,
        height: 48,
        onGround: false,
        direction: 1,
        state: 'idle',
        frame: 0,
        checkpoint: { x: placeData.spawnX, y: placeData.spawnY },
        currentCheckpointIndex: -1,
        avatar: user.avatar,
        hp: 100,
        maxHp: 100,
        inventory,
        activeSlot: 0,
        attacking: false,
        lastAttackTime: 0
      };

      rooms[roomId].players[socket.id] = playerData;

      socket.emit('game-init', {
        place: placeData,
        placeName: place,
        player: playerData,
        players: rooms[roomId].players,
        roomId
      });

      socket.to(roomId).emit('player-joined', playerData);
    } catch (e) {
      console.error('[join-game]', e);
      socket.emit('error-msg', 'Failed to join');
    }
  });

  // ---- PLAYER UPDATE ----
  socket.on('player-update', (data) => {
    const roomId = playerRooms[socket.id];
    if (!roomId || !rooms[roomId]) return;
    const p = rooms[roomId].players[socket.id];
    if (!p) return;

    p.x = data.x;
    p.y = data.y;
    p.vx = data.vx;
    p.vy = data.vy;
    p.direction = data.direction;
    p.state = data.state;
    p.frame = data.frame;
    p.onGround = data.onGround;
    p.activeSlot = data.activeSlot || 0;
    p.attacking = data.attacking || false;

    if (p.y > 700) {
      p.x = p.checkpoint.x;
      p.y = p.checkpoint.y;
      p.vx = 0;
      p.vy = 0;
      p.hp = p.maxHp;
      socket.emit('player-respawn', { x: p.x, y: p.y, hp: p.hp });
    }

    socket.to(roomId).emit('player-moved', {
      id: socket.id,
      x: p.x,
      y: p.y,
      vx: p.vx,
      vy: p.vy,
      direction: p.direction,
      state: p.state,
      frame: p.frame,
      activeSlot: p.activeSlot,
      attacking: p.attacking,
      hp: p.hp
    });
  });

  // ---- ATTACK ----
  socket.on('attack', async () => {
    const roomId = playerRooms[socket.id];
    if (!roomId || !rooms[roomId]) return;
    const atk = rooms[roomId].players[socket.id];
    if (!atk) return;

    const now = Date.now();
    const item = atk.inventory[atk.activeSlot];
    if (!item || item.id !== 'sword' || now - atk.lastAttackTime < item.cooldown) return;

    atk.lastAttackTime = now;
    atk.attacking = true;
    setTimeout(() => { atk.attacking = false; }, 300);

    const placeData = await getPlaceConfig(rooms[roomId].place);

    for (const [id, target] of Object.entries(rooms[roomId].players)) {
      if (id === socket.id) continue;

      const dx = target.x - atk.x;
      const dy = target.y - atk.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const inFront = (atk.direction === 1 && dx > 0) || (atk.direction === -1 && dx < 0);

      if (dist < item.range + 30 && inFront && Math.abs(dy) < 40) {
        target.hp -= item.damage;
        const kb = atk.direction * 8;
        io.to(id).emit('player-hit', { hp: target.hp, knockX: kb, knockY: -5 });

        if (target.hp <= 0) {
          target.hp = target.maxHp;
          if (placeData) {
            target.x = placeData.spawnX;
            target.y = placeData.spawnY;
          }
          target.vx = 0;
          target.vy = 0;
          io.to(id).emit('player-respawn', { x: target.x, y: target.y, hp: target.hp });
          io.to(roomId).emit('kill-feed', { killer: atk.username, victim: target.username });
        }
      }
    }

    socket.to(roomId).emit('player-attack', { id: socket.id });
  });

  // ---- CHECKPOINT ----
  socket.on('checkpoint-reached', (data) => {
    const roomId = playerRooms[socket.id];
    if (!roomId || !rooms[roomId]) return;
    const p = rooms[roomId].players[socket.id];
    if (p) p.checkpoint = { x: data.x, y: data.y };
  });

  // ---- CHAT ----
  socket.on('chat-message', (data) => {
    const roomId = playerRooms[socket.id];
    if (!roomId || !rooms[roomId]) return;
    const p = rooms[roomId].players[socket.id];
    if (!p || !data.msg || !data.msg.trim() || data.msg.length > 200) return;
    io.to(roomId).emit('chat-message', { username: p.username, msg: data.msg.trim() });
  });

  // ---- SWITCH SLOT ----
  socket.on('switch-slot', (data) => {
    const roomId = playerRooms[socket.id];
    if (!roomId || !rooms[roomId]) return;
    const p = rooms[roomId].players[socket.id];
    if (p && typeof data.slot === 'number' && data.slot >= 0 && data.slot < 4) {
      p.activeSlot = data.slot;
    }
  });

  // ---- DISCONNECT ----
  socket.on('disconnect', () => {
    // Clean up active session tracking
    if (socket._userId && activeUserSessions[socket._userId] === socket.id) {
      delete activeUserSessions[socket._userId];
    }
    removePlayerFromAllRooms(socket.id);
  });
});

// ==================== START ====================

server.listen(PORT, () => console.log(`[Tublox3] http://localhost:${PORT}`));