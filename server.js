const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = 3000;
const JWT_SECRET = 'tublox3_secret_key_2024';
const MONGO_URI = 'mongodb+srv://Today_Idk:TpdauT434odayTodayToday23@cluster0.rlgkop5.mongodb.net/tublox3?retryWrites=true&w=majority&appName=Cluster0';

const HCAPTCHA_SECRET = 'ES_7fac1684da37404ba4e09ddaa116cade';
const HCAPTCHA_SITEKEY = '20900438-205e-4c6e-bf50-7d3e922c9c08';

const TG_BOT_TOKEN = '8498206608:AAFvWZnQsQJK-7g_neNggtV5MT-UnUhJPrU';
const TG_ENABLED = !!TG_BOT_TOKEN;

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
    sublabel: { type: String, default: '' },
    customImage: { type: String, default: '' }
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
    items: { type: mongoose.Schema.Types.Mixed, default: {} },
    spawnItems: { type: Array, default: [] },
    collectibleItems: { type: Array, default: [] },
    models: { type: Array, default: [] },
    settings: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  maxPlayers: { type: Number, default: 20 },
  order: { type: Number, default: 0 },
  totalPlays: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
const Game = mongoose.model('Game', gameSchema);

const studioItemSchema = new mongoose.Schema({
  id: String, type: { type: String, default: 'sword' },
  x: { type: Number, default: 0 }, y: { type: Number, default: 0 },
  giveOnStart: { type: Boolean, default: false },
  collectOnTouch: { type: Boolean, default: true },
  properties: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { _id: false });

const studioBlockSchema = new mongoose.Schema({
  id: String, x: { type: Number, default: 0 }, y: { type: Number, default: 0 },
  w: { type: Number, default: 100 }, h: { type: Number, default: 40 },
  color: { type: String, default: '#333333' }, opacity: { type: Number, default: 1 },
  text: { type: String, default: '' }, textFont: { type: String, default: 'Inter' },
  textSize: { type: Number, default: 14 }, textColor: { type: String, default: '#ffffff' },
  isSpawn: { type: Boolean, default: false }
}, { _id: false });

const studioModelSchema = new mongoose.Schema({
  id: String, type: { type: String, default: 'door_key' },
  x: { type: Number, default: 0 }, y: { type: Number, default: 0 },
  w: { type: Number, default: 40 }, h: { type: Number, default: 80 },
  properties: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { _id: false });

const studioGameSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ownerUsername: { type: String, required: true },
  title: { type: String, required: true, maxlength: 50 },
  description: { type: String, default: '', maxlength: 200 },
  thumbnailData: { type: String, default: '' },
  status: { type: String, enum: ['private', 'public'], default: 'private' },
  blocks: [studioBlockSchema], items: [studioItemSchema], models: [studioModelSchema],
  settings: { type: mongoose.Schema.Types.Mixed, default: {
    gravity: 0.6, playerSpeed: 4, jumpForce: -12, spawnX: 100, spawnY: 400,
    bgColor: '#0a0a0a', worldWidth: 2400, worldHeight: 600
  }},
  plays: { type: Number, default: 0 },
  published: { type: Boolean, default: false },
  publishedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
const StudioGame = mongoose.model('StudioGame', studioGameSchema);

// ==================== MARKET SCHEMAS ====================

const marketItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  category: { type: String, enum: ['shirt', 'pants', 'face', 'hair', 'hat', 'accessory', 'body_part'], required: true },
  subcategory: { type: String, default: '' },
  price: { type: Number, required: true, min: 0 },
  rarity: { type: String, enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'], default: 'common' },
  thumbnail: { type: String, default: '' },
  drawData: { type: mongoose.Schema.Types.Mixed, default: {} },
  colors: { type: [String], default: [] },
  isLimited: { type: Boolean, default: false },
  stock: { type: Number, default: -1 },
  sold: { type: Number, default: 0 },
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  creatorName: { type: String, default: 'Tublox' },
  active: { type: Boolean, default: true },
  featured: { type: Boolean, default: false },
  tags: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now }
});
const MarketItem = mongoose.model('MarketItem', marketItemSchema);

const userInventorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketItem', required: true },
  purchasedAt: { type: Date, default: Date.now },
  equipped: { type: Boolean, default: false },
  color: { type: String, default: '' }
});
userInventorySchema.index({ userId: 1, itemId: 1 }, { unique: true });
const UserInventory = mongoose.model('UserInventory', userInventorySchema);

const userEquipSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  shirt: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketItem', default: null },
  pants: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketItem', default: null },
  face: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketItem', default: null },
  hair: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketItem', default: null },
  hat: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketItem', default: null },
  accessory: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketItem', default: null },
  body_part: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketItem', default: null },
  shirtColor: { type: String, default: '' },
  pantsColor: { type: String, default: '' },
  hairColor: { type: String, default: '' },
  hatColor: { type: String, default: '' },
  accessoryColor: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now }
});
const UserEquip = mongoose.model('UserEquip', userEquipSchema);

// ==================== TELEGRAM BOT SCHEMAS ====================

const tgSubscriberSchema = new mongoose.Schema({
  chatId: { type: Number, required: true, unique: true },
  username: { type: String, default: '' },
  subscribed: { type: Boolean, default: true },
  notifications: {
    newGames: { type: Boolean, default: true },
    playerMilestones: { type: Boolean, default: true },
    dailyStats: { type: Boolean, default: true }
  },
  createdAt: { type: Date, default: Date.now }
});
const TgSubscriber = mongoose.model('TgSubscriber', tgSubscriberSchema);

const onlineHistorySchema = new mongoose.Schema({
  place: { type: String, required: true },
  playerCount: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now }
});
onlineHistorySchema.index({ place: 1, timestamp: -1 });
onlineHistorySchema.index({ timestamp: 1 }, { expireAfterSeconds: 604800 });
const OnlineHistory = mongoose.model('OnlineHistory', onlineHistorySchema);

// ==================== ASSET STORE ====================

const ASSET_STORE = [
  { id: 'sword', name: 'Sword', category: 'weapon', icon: 'sword', description: 'Melee weapon', defaults: { damage: 20, range: 50, cooldown: 500 } },
  { id: 'flashlight', name: 'Flashlight', category: 'tool', icon: 'flashlight', description: 'Illuminates dark areas', defaults: { radius: 200, brightness: 1 } },
  { id: 'shield', name: 'Shield', category: 'defense', icon: 'shield', description: 'Blocks damage', defaults: { blockChance: 0.5, durability: 100 } },
  { id: 'speed_boost', name: 'Speed Boost', category: 'powerup', icon: 'speed', description: 'Increases speed', defaults: { multiplier: 1.5, duration: 5000 } },
  { id: 'jump_boost', name: 'Jump Boost', category: 'powerup', icon: 'jump', description: 'Increases jump', defaults: { multiplier: 1.5, duration: 5000 } },
  { id: 'coin', name: 'Coin', category: 'collectible', icon: 'coin', description: 'Currency', defaults: { value: 1 } },
  { id: 'heart', name: 'Heart', category: 'collectible', icon: 'heart', description: 'Restores health', defaults: { healAmount: 25 } },
  { id: 'key', name: 'Key', category: 'tool', icon: 'key', description: 'Opens doors', defaults: {} },
  { id: 'battery', name: 'Battery', category: 'tool', icon: 'battery', description: 'Recharges flashlight', defaults: { recharge: 25 } },
  { id: 'note', name: 'Note', category: 'collectible', icon: 'note', description: 'Readable note', defaults: { text: 'An old note...' } }
];

// ==================== MIDDLEWARE ====================

app.use(express.json({ limit: '5mb' }));
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
  } catch (e) { return res.status(401).json({ error: 'Invalid token' }); }
}

// ==================== HCAPTCHA ====================

async function verifyHCaptcha(token) {
  if (!token) return false;
  try {
    const params = new URLSearchParams();
    params.append('response', token);
    params.append('secret', HCAPTCHA_SECRET);
    const r = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    const data = await r.json();
    return data.success === true;
  } catch (e) {
    console.error('[hCaptcha]', e);
    return false;
  }
}

// ==================== DAILY STRIKES ====================

function getStrikeReward(s) { if (s >= 15) return 6; if (s >= 10) return 4; if (s >= 5) return 2; return 1; }
function getNextMilestone(s) { if (s < 5) return { day: 5, reward: 2 }; if (s < 10) return { day: 10, reward: 4 }; if (s < 15) return { day: 15, reward: 6 }; return { day: null, reward: 6 }; }
function getDayStart(d) { const x = new Date(d); return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime(); }

async function checkDailyReward(user) {
  const now = new Date();
  const todayStart = getDayStart(now);
  let rewarded = false, rewardAmount = 0, streakReset = false;
  if (!user.lastDailyReward) {
    user.dailyStrikes = 1; rewardAmount = getStrikeReward(1); user.urus += rewardAmount; user.lastDailyReward = now; rewarded = true;
  } else {
    const diffDays = Math.floor((todayStart - getDayStart(user.lastDailyReward)) / 86400000);
    if (diffDays === 0) { rewarded = false; }
    else if (diffDays === 1) { user.dailyStrikes += 1; rewardAmount = getStrikeReward(user.dailyStrikes); user.urus += rewardAmount; user.lastDailyReward = now; rewarded = true; }
    else { user.dailyStrikes = 1; rewardAmount = getStrikeReward(1); user.urus += rewardAmount; user.lastDailyReward = now; rewarded = true; streakReset = true; }
  }
  if (rewarded) await user.save();
  return { rewarded, rewardAmount, totalUrus: user.urus, dailyStrikes: user.dailyStrikes, streakReset, currentRewardRate: getStrikeReward(user.dailyStrikes), nextMilestone: getNextMilestone(user.dailyStrikes) };
}

// ==================== TELEGRAM BOT ====================

let tgBot = null;
let tgBotFunctions = null;

const botStats = {
  lastNotifiedGames: new Set(),
  peakOnline: {},
  snapshotInterval: null,
  notifyInterval: null
};

function getOnlineCounts() {
  const counts = {};
  for (const [, room] of Object.entries(rooms)) {
    const pc = Object.keys(room.players).length;
    if (pc > 0) counts[room.place] = (counts[room.place] || 0) + pc;
  }
  return counts;
}

function escTg(str) {
  if (!str) return '';
  return String(str).replace(/\*/g, '\\*').replace(/_/g, '\\_').replace(/`/g, '\\`').replace(/\[/g, '\\[');
}

function makeBar(pct) {
  const f = Math.round(pct / 10);
  return '#'.repeat(f) + '-'.repeat(10 - f);
}

function initTelegramBot() {
  if (!TG_ENABLED) {
    console.log('[TG Bot] Disabled - no token');
    return null;
  }

  tgBot = new TelegramBot(TG_BOT_TOKEN, { polling: true });
  console.log('[TG Bot] Starting...');

  // /start
  tgBot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      await TgSubscriber.findOneAndUpdate(
        { chatId },
        { chatId, username: msg.from?.username || '', subscribed: true },
        { upsert: true, new: true }
      );
    } catch(e) {}

    const text = `*TuStats Places Bot*

Слежу за всеми плейсами Tublox в реальном времени.

*Команды:*
/places - Все активные плейсы
/online - Текущий онлайн
/top - Топ плейсов по играм
/stats - Общая статистика
/place slug - Детали плейса
/history slug - История онлайна
/search запрос - Поиск плейсов
/peak - Пиковый онлайн за сегодня
/new - Недавно созданные
/notify - Настройки уведомлений
/help - Справка

Вы подписаны на уведомления.`;

    tgBot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  });

  // /places
  tgBot.onText(/\/places/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const games = await Game.find({ status: 'active' }).select('slug name type totalPlays maxPlayers').sort({ totalPlays: -1 });
      if (games.length === 0) return tgBot.sendMessage(chatId, 'Нет активных плейсов');

      const oc = getOnlineCounts();
      let text = '*Активные плейсы Tublox*\n\n';

      games.forEach((g, i) => {
        const online = oc[g.slug] || 0;
        const dot = online > 0 ? '[ON]' : '[--]';
        text += `${i + 1}. *${escTg(g.name)}* (${g.type})\n`;
        text += `   ${dot} Online: \`${online}/${g.maxPlayers}\` | Plays: \`${g.totalPlays}\`\n`;
        text += `   slug: \`${g.slug}\`\n\n`;
      });

      text += `Всего плейсов: ${games.length}`;
      tgBot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    } catch(e) {
      console.error('[TG /places]', e);
      tgBot.sendMessage(chatId, 'Ошибка загрузки');
    }
  });

  // /online
  tgBot.onText(/\/online/, async (msg) => {
    const chatId = msg.chat.id;
    const oc = getOnlineCounts();
    const totalOnline = Object.values(oc).reduce((a, b) => a + b, 0);
    const totalRooms = Object.keys(rooms).length;

    if (totalOnline === 0) return tgBot.sendMessage(chatId, 'Сейчас никого нет онлайн.\nКомнат: 0');

    let text = `*Онлайн: ${totalOnline} игроков*\n\n`;
    const sorted = Object.entries(oc).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]);

    for (const [slug, count] of sorted) {
      const game = await Game.findOne({ slug }).select('name maxPlayers');
      const name = game ? game.name : slug;
      const max = game ? game.maxPlayers : 20;
      const pct = Math.round((count / max) * 100);
      text += `*${escTg(name)}*\n`;
      text += `   \`${count}/${max}\` [${makeBar(pct)}]\n\n`;
    }

    text += `Комнат: ${totalRooms}`;
    tgBot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  });

  // /top
  tgBot.onText(/\/top/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const games = await Game.find({ status: 'active' }).select('slug name totalPlays type').sort({ totalPlays: -1 }).limit(10);
      if (games.length === 0) return tgBot.sendMessage(chatId, 'Нет плейсов');

      let text = '*Топ-10 плейсов*\n\n';
      games.forEach((g, i) => {
        const pos = i < 3 ? ['1st', '2nd', '3rd'][i] : `${i + 1}.`;
        text += `${pos} *${escTg(g.name)}* (${g.type})\n`;
        text += `   \`${g.totalPlays.toLocaleString()}\` plays\n\n`;
      });
      tgBot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    } catch(e) { tgBot.sendMessage(chatId, 'Ошибка'); }
  });

  // /stats
  tgBot.onText(/\/stats/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const totalUsers = await User.countDocuments();
      const totalGames = await Game.countDocuments({ status: 'active' });
      const totalStudioGames = await StudioGame.countDocuments();
      const publicStudioGames = await StudioGame.countDocuments({ status: 'public', published: true });
      const totalMarketItems = await MarketItem.countDocuments({ active: true });
      const totalPurchases = await UserInventory.countDocuments();
      const oc = getOnlineCounts();
      const totalOnline = Object.values(oc).reduce((a, b) => a + b, 0);
      const totalRooms = Object.keys(rooms).length;
      const playsAgg = await Game.aggregate([{ $match: { status: 'active' } }, { $group: { _id: null, total: { $sum: '$totalPlays' } } }]);
      const playsSum = playsAgg[0]?.total || 0;
      const last24h = new Date(Date.now() - 86400000);
      const newUsers24h = await User.countDocuments({ createdAt: { $gte: last24h } });
      const activeUsers24h = await User.countDocuments({ lastLogin: { $gte: last24h } });

      let text = `*Статистика Tublox*\n\n`;
      text += `*Пользователи*\n`;
      text += `  Всего: \`${totalUsers.toLocaleString()}\`\n`;
      text += `  Новых за 24ч: \`${newUsers24h}\`\n`;
      text += `  Активных за 24ч: \`${activeUsers24h}\`\n\n`;
      text += `*Плейсы*\n`;
      text += `  Активных: \`${totalGames}\`\n`;
      text += `  Студия всего: \`${totalStudioGames}\`\n`;
      text += `  Опубликовано: \`${publicStudioGames}\`\n`;
      text += `  Всего запусков: \`${playsSum.toLocaleString()}\`\n\n`;
      text += `*Онлайн*\n`;
      text += `  Сейчас: \`${totalOnline}\` игроков\n`;
      text += `  Комнат: \`${totalRooms}\`\n\n`;
      text += `*Маркет*\n`;
      text += `  Товаров: \`${totalMarketItems}\`\n`;
      text += `  Покупок: \`${totalPurchases.toLocaleString()}\`\n\n`;
      text += `_${new Date().toLocaleString('ru-RU', { timeZone: 'UTC' })} UTC_`;

      tgBot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    } catch(e) {
      console.error('[TG /stats]', e);
      tgBot.sendMessage(chatId, 'Ошибка');
    }
  });

  // /place <slug>
  tgBot.onText(/\/place(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const slug = match[1]?.trim();
    if (!slug) return tgBot.sendMessage(chatId, 'Используй: `/place slug`\nНайти slug: /places', { parse_mode: 'Markdown' });

    try {
      const game = await Game.findOne({ slug, status: 'active' });
      if (!game) return tgBot.sendMessage(chatId, `Плейс \`${escTg(slug)}\` не найден`, { parse_mode: 'Markdown' });

      const oc = getOnlineCounts();
      const online = oc[slug] || 0;

      const playersInPlace = [];
      for (const [, room] of Object.entries(rooms)) {
        if (room.place === slug) {
          for (const [, player] of Object.entries(room.players)) {
            playersInPlace.push(player.username);
          }
        }
      }

      let author = 'Tublox';
      if (slug.startsWith('studio_')) {
        const sg = await StudioGame.findById(slug.replace('studio_', '')).select('ownerUsername');
        if (sg) author = sg.ownerUsername;
      }

      const history = await OnlineHistory.find({ place: slug }).sort({ timestamp: -1 }).limit(24);
      const peakToday = botStats.peakOnline[slug] || online;

      let text = `*${escTg(game.name)}*\n\n`;
      text += `${escTg(game.description || 'Нет описания')}\n\n`;
      text += `Slug: \`${slug}\`\n`;
      text += `Автор: *${escTg(author)}*\n`;
      text += `Тип: \`${game.type}\`\n`;
      text += `Запусков: \`${game.totalPlays.toLocaleString()}\`\n`;
      text += `Макс игроков: \`${game.maxPlayers}\`\n\n`;
      text += `*Online: ${online}/${game.maxPlayers}*\n`;
      text += `Пик сегодня: \`${peakToday}\`\n`;

      if (playersInPlace.length > 0) {
        text += `\n*Игроки:*\n`;
        playersInPlace.forEach(p => { text += `  - \`${escTg(p)}\`\n`; });
      }

      if (history.length > 0) {
        text += `\n*Онлайн за последние часы:*\n\`\`\`\n`;
        const chartData = history.slice(0, 12).reverse();
        const maxC = Math.max(1, ...chartData.map(h => h.playerCount));
        chartData.forEach(h => {
          const t = new Date(h.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
          const bl = Math.round((h.playerCount / maxC) * 12);
          text += `${t} ${'#'.repeat(bl)}${'.'.repeat(12 - bl)} ${h.playerCount}\n`;
        });
        text += `\`\`\``;
      }

      text += `\n_${new Date().toLocaleString('ru-RU', { timeZone: 'UTC' })} UTC_`;
      tgBot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    } catch(e) {
      console.error('[TG /place]', e);
      tgBot.sendMessage(chatId, 'Ошибка');
    }
  });

  // /history <slug>
  tgBot.onText(/\/history(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const slug = match[1]?.trim();
    if (!slug) return tgBot.sendMessage(chatId, 'Используй: `/history slug`', { parse_mode: 'Markdown' });

    try {
      const game = await Game.findOne({ slug }).select('name');
      if (!game) return tgBot.sendMessage(chatId, 'Плейс не найден');

      const history = await OnlineHistory.find({ place: slug }).sort({ timestamp: -1 }).limit(48);
      if (history.length === 0) return tgBot.sendMessage(chatId, `Нет данных для *${escTg(game.name)}*`, { parse_mode: 'Markdown' });

      const rev = [...history].reverse();
      const maxC = Math.max(1, ...rev.map(h => h.playerCount));
      const avg = Math.round(rev.reduce((a, h) => a + h.playerCount, 0) / rev.length);
      const peakEntry = history.find(h => h.playerCount === maxC);

      let text = `*История онлайна: ${escTg(game.name)}*\n\n`;
      text += `Пик: \`${maxC}\` игроков`;
      if (peakEntry) text += ` (${new Date(peakEntry.timestamp).toLocaleString('ru-RU', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })})`;
      text += `\nСреднее: \`${avg}\` игроков\n\n\`\`\`\n`;

      const show = rev.slice(-24);
      show.forEach(h => {
        const t = new Date(h.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
        const bl = Math.round((h.playerCount / maxC) * 16);
        text += `${t} ${'#'.repeat(bl)}${'.'.repeat(16 - bl)} ${h.playerCount}\n`;
      });
      text += `\`\`\`\n_Данные за ${history.length} записей_`;
      tgBot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    } catch(e) { tgBot.sendMessage(chatId, 'Ошибка'); }
  });

  // /search
  tgBot.onText(/\/search(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const q = match[1]?.trim();
    if (!q) return tgBot.sendMessage(chatId, 'Используй: `/search название`', { parse_mode: 'Markdown' });

    try {
      const games = await Game.find({ status: 'active', name: { $regex: q, $options: 'i' } }).select('slug name type totalPlays').limit(10);
      if (games.length === 0) return tgBot.sendMessage(chatId, `Ничего не найдено: "${escTg(q)}"`, { parse_mode: 'Markdown' });

      const oc = getOnlineCounts();
      let text = `*Поиск: "${escTg(q)}"*\n\n`;
      games.forEach((g, i) => {
        const online = oc[g.slug] || 0;
        const dot = online > 0 ? '[ON]' : '[--]';
        text += `${i + 1}. *${escTg(g.name)}*\n`;
        text += `   ${dot} Online: \`${online}\` | Plays: \`${g.totalPlays}\`\n`;
        text += `   \`/place ${g.slug}\`\n\n`;
      });
      tgBot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    } catch(e) { tgBot.sendMessage(chatId, 'Ошибка'); }
  });

  // /peak
  tgBot.onText(/\/peak/, async (msg) => {
    const chatId = msg.chat.id;
    const peaks = Object.entries(botStats.peakOnline);
    if (peaks.length === 0) return tgBot.sendMessage(chatId, 'Нет данных — бот только запустился');

    const sorted = peaks.sort((a, b) => b[1] - a[1]);
    let text = '*Пиковый онлайн за сегодня*\n\n';
    for (const [slug, peak] of sorted) {
      const game = await Game.findOne({ slug }).select('name');
      text += `*${escTg(game?.name || slug)}*: \`${peak}\` игроков\n`;
    }
    const totalPeak = sorted.reduce((a, [, p]) => a + p, 0);
    text += `\nОбщий пик: \`${totalPeak}\``;
    tgBot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  });

  // /new
  tgBot.onText(/\/new/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const recent = await Game.find({ status: 'active' }).select('slug name type totalPlays createdAt').sort({ createdAt: -1 }).limit(10);
      if (recent.length === 0) return tgBot.sendMessage(chatId, 'Нет плейсов');

      let text = '*Недавно созданные плейсы*\n\n';
      for (const g of recent) {
        let author = 'Tublox';
        if (g.slug.startsWith('studio_')) {
          const sg = await StudioGame.findById(g.slug.replace('studio_', '')).select('ownerUsername');
          if (sg) author = sg.ownerUsername;
        }
        const date = new Date(g.createdAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
        text += `*${escTg(g.name)}*\n`;
        text += `   Автор: ${escTg(author)} | ${date} | ${g.totalPlays} plays\n`;
        text += `   \`/place ${g.slug}\`\n\n`;
      }
      tgBot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    } catch(e) { tgBot.sendMessage(chatId, 'Ошибка'); }
  });

  // /notify
  tgBot.onText(/\/notify/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      let sub = await TgSubscriber.findOne({ chatId });
      if (!sub) sub = await TgSubscriber.create({ chatId, username: msg.from?.username || '' });

      const kb = {
        inline_keyboard: [
          [{ text: `${sub.notifications.newGames ? '[V]' : '[X]'} Новые игры`, callback_data: 'toggle_newGames' }],
          [{ text: `${sub.notifications.playerMilestones ? '[V]' : '[X]'} Вехи игроков`, callback_data: 'toggle_playerMilestones' }],
          [{ text: `${sub.notifications.dailyStats ? '[V]' : '[X]'} Ежедневная сводка`, callback_data: 'toggle_dailyStats' }],
          [{ text: sub.subscribed ? 'Отписаться от всего' : 'Подписаться', callback_data: 'toggle_subscribe' }]
        ]
      };
      tgBot.sendMessage(chatId, '*Настройки уведомлений*\n\nНажми кнопку для переключения:', { parse_mode: 'Markdown', reply_markup: kb });
    } catch(e) { tgBot.sendMessage(chatId, 'Ошибка'); }
  });

  // /help
  tgBot.onText(/\/help/, (msg) => {
    const text = `*TuStats Places - Справка*

*Обзор:*
/places - Список плейсов
/online - Кто играет сейчас
/top - Топ-10 по популярности
/new - Новые плейсы

*Детали:*
/place slug - Инфо о плейсе
/history slug - График онлайна 48ч
/search запрос - Поиск

*Статистика:*
/stats - Общая статистика
/peak - Пики за сегодня

*Настройки:*
/notify - Уведомления

Slug - уникальный ID плейса, смотри /places

Бот уведомляет о:
- Новых опубликованных играх
- Достижениях 100/500/1000 plays
- Ежедневной сводке в 00:00 UTC`;
    tgBot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown' });
  });

  // Callback queries
  tgBot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    try {
      let sub = await TgSubscriber.findOne({ chatId });
      if (!sub) sub = await TgSubscriber.create({ chatId });

      if (data === 'toggle_subscribe') {
        sub.subscribed = !sub.subscribed;
        await sub.save();
        tgBot.answerCallbackQuery(query.id, { text: sub.subscribed ? 'Подписка включена' : 'Подписка выключена' });
      } else if (data.startsWith('toggle_')) {
        const key = data.replace('toggle_', '');
        if (sub.notifications[key] !== undefined) {
          sub.notifications[key] = !sub.notifications[key];
          sub.markModified('notifications');
          await sub.save();
          tgBot.answerCallbackQuery(query.id, { text: `${sub.notifications[key] ? 'Включено' : 'Выключено'}: ${key}` });
        }
      }

      const kb = {
        inline_keyboard: [
          [{ text: `${sub.notifications.newGames ? '[V]' : '[X]'} Новые игры`, callback_data: 'toggle_newGames' }],
          [{ text: `${sub.notifications.playerMilestones ? '[V]' : '[X]'} Вехи игроков`, callback_data: 'toggle_playerMilestones' }],
          [{ text: `${sub.notifications.dailyStats ? '[V]' : '[X]'} Ежедневная сводка`, callback_data: 'toggle_dailyStats' }],
          [{ text: sub.subscribed ? 'Отписаться от всего' : 'Подписаться', callback_data: 'toggle_subscribe' }]
        ]
      };
      tgBot.editMessageReplyMarkup(kb, { chat_id: chatId, message_id: query.message.message_id }).catch(() => {});
    } catch(e) { tgBot.answerCallbackQuery(query.id, { text: 'Ошибка' }); }
  });

  // Broadcast
  async function broadcastNotification(text, filter = {}) {
    try {
      const subs = await TgSubscriber.find({ subscribed: true, ...filter });
      let sent = 0;
      for (const sub of subs) {
        try {
          await tgBot.sendMessage(sub.chatId, text, { parse_mode: 'Markdown' });
          sent++;
          if (sent % 25 === 0) await new Promise(r => setTimeout(r, 1000));
        } catch(e) {
          if (e.response?.statusCode === 403) { sub.subscribed = false; await sub.save(); }
        }
      }
      console.log(`[TG Bot] Broadcast: ${sent}/${subs.length}`);
    } catch(e) { console.error('[TG Broadcast]', e); }
  }

  // Notify new game
  async function notifyNewGame(studioGame) {
    if (!TG_ENABLED || !tgBot) return;
    if (botStats.lastNotifiedGames.has(String(studioGame._id))) return;
    botStats.lastNotifiedGames.add(String(studioGame._id));

    const text = `*Новый плейс опубликован*

*${escTg(studioGame.title)}*
Автор: *${escTg(studioGame.ownerUsername)}*
${escTg(studioGame.description || 'Без описания')}

\`/place studio_${studioGame._id}\``;

    await broadcastNotification(text, { 'notifications.newGames': true });
  }

  // Check milestones
  async function checkPlayMilestones(slug, totalPlays) {
    if (!TG_ENABLED || !tgBot) return;
    const milestones = [100, 250, 500, 1000, 2500, 5000, 10000];
    const ms = milestones.find(m => totalPlays === m);
    if (!ms) return;

    const game = await Game.findOne({ slug }).select('name');
    if (!game) return;

    let author = 'Tublox';
    if (slug.startsWith('studio_')) {
      const sg = await StudioGame.findById(slug.replace('studio_', '')).select('ownerUsername');
      if (sg) author = sg.ownerUsername;
    }

    const text = `*Веха достигнута*

*${escTg(game.name)}* набрал *${ms.toLocaleString()}* запусков
Автор: *${escTg(author)}*

\`/place ${slug}\``;

    await broadcastNotification(text, { 'notifications.playerMilestones': true });
  }

  // Snapshots every 30 min
  botStats.snapshotInterval = setInterval(async () => {
    try {
      const oc = getOnlineCounts();
      for (const [slug, count] of Object.entries(oc)) {
        await new OnlineHistory({ place: slug, playerCount: count }).save();
        if (!botStats.peakOnline[slug] || count > botStats.peakOnline[slug]) botStats.peakOnline[slug] = count;
      }
      const activeGames = await Game.find({ status: 'active' }).select('slug');
      for (const g of activeGames) {
        if (!oc[g.slug]) await new OnlineHistory({ place: g.slug, playerCount: 0 }).save();
      }
    } catch(e) { console.error('[TG Snapshot]', e); }
  }, 30 * 60 * 1000);

  // Daily stats at midnight
  botStats.notifyInterval = setInterval(async () => {
    const now = new Date();
    if (now.getUTCHours() === 0 && now.getUTCMinutes() < 5) {
      try {
        const totalUsers = await User.countDocuments();
        const totalGames = await Game.countDocuments({ status: 'active' });
        const yesterday = new Date(Date.now() - 86400000);
        const newUsers = await User.countDocuments({ createdAt: { $gte: yesterday } });
        const newGames = await Game.countDocuments({ createdAt: { $gte: yesterday }, status: 'active' });
        const playsAgg = await Game.aggregate([{ $match: { status: 'active' } }, { $group: { _id: null, total: { $sum: '$totalPlays' } } }]);
        const peaks = Object.entries(botStats.peakOnline);
        const maxPeak = peaks.length > 0 ? Math.max(...peaks.map(([, p]) => p)) : 0;

        let text = `*Ежедневная сводка Tublox*\n`;
        text += `${now.toLocaleDateString('ru-RU', { timeZone: 'UTC' })}\n\n`;
        text += `Пользователей: \`${totalUsers}\` (+${newUsers})\n`;
        text += `Плейсов: \`${totalGames}\` (+${newGames})\n`;
        text += `Запусков: \`${(playsAgg[0]?.total || 0).toLocaleString()}\`\n`;
        text += `Макс онлайн: \`${maxPeak}\`\n`;

        if (peaks.length > 0) {
          const topP = peaks.sort((a, b) => b[1] - a[1])[0];
          const topG = await Game.findOne({ slug: topP[0] }).select('name');
          text += `Популярный: *${escTg(topG?.name || topP[0])}* (\`${topP[1]}\` пик)\n`;
        }

        await broadcastNotification(text, { 'notifications.dailyStats': true });
        botStats.peakOnline = {};
      } catch(e) { console.error('[TG Daily]', e); }
    }
  }, 5 * 60 * 1000);

  tgBot.on('polling_error', (err) => { console.error('[TG Bot] Polling:', err.message); });
  tgBot.on('error', (err) => { console.error('[TG Bot] Error:', err.message); });

  console.log('[TG Bot] Ready');
  return { notifyNewGame, checkPlayMilestones, broadcastNotification };
}

// ==================== PAGES ====================

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/pages/landing.html')));
app.get('/home', (req, res) => res.sendFile(path.join(__dirname, 'public/pages/home.html')));
app.get('/auth', (req, res) => res.sendFile(path.join(__dirname, 'public/pages/auth.html')));
app.get('/profile', (req, res) => res.sendFile(path.join(__dirname, 'public/pages/profile.html')));
app.get('/profile/:username', (req, res) => res.sendFile(path.join(__dirname, 'public/pages/profile.html')));
app.get('/avatar', (req, res) => res.sendFile(path.join(__dirname, 'public/pages/avatar.html')));
app.get('/game', (req, res) => res.sendFile(path.join(__dirname, 'public/pages/game.html')));
app.get('/create', (req, res) => res.sendFile(path.join(__dirname, 'public/pages/create.html')));
app.get('/studio', (req, res) => res.sendFile(path.join(__dirname, 'public/pages/studio.html')));
app.get('/studio/edit', (req, res) => res.sendFile(path.join(__dirname, 'public/pages/studio-editor.html')));
app.get('/games/:slug', (req, res) => res.sendFile(path.join(__dirname, 'public/pages/game-details.html')));
app.get('/market', (req, res) => res.sendFile(path.join(__dirname, 'public/pages/market.html')));
app.get('/market/:itemId', (req, res) => res.sendFile(path.join(__dirname, 'public/pages/market-item.html')));

// ==================== AUTH API ====================

app.post('/api/register', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: 'Database not ready' });
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
    res.cookie('token', token, { httpOnly: false, maxAge: 604800000 });
    res.json({ success: true, username: user.username, dailyReward: reward });
  } catch (e) { console.error('[Register]', e); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/login', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: 'Database not ready' });
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Fill all fields' });
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });
    user.lastLogin = new Date(); await user.save();
    const reward = await checkDailyReward(user);
    const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: false, maxAge: 604800000 });
    res.json({ success: true, username: user.username, dailyReward: reward });
  } catch (e) { console.error('[Login]', e); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/me', authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: 'Database not ready' });
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.status(404).json({ error: 'Not found' });
    const reward = await checkDailyReward(user);

    let equipped = {};
    try {
      const equip = await UserEquip.findOne({ userId: req.userId }).populate('shirt pants face hair hat accessory body_part');
      if (equip) {
        ['shirt','pants','face','hair','hat','accessory','body_part'].forEach(cat => {
          if (equip[cat]) equipped[cat] = { id: equip[cat]._id, name: equip[cat].name, drawData: equip[cat].drawData, color: equip[cat+'Color'] || (equip[cat].colors && equip[cat].colors[0]) || '' };
        });
      }
    } catch(e) {}

    res.json({ username: user.username, avatar: user.avatar, bio: user.bio, urus: user.urus, dailyStrikes: user.dailyStrikes, dailyReward: reward, gamesPlayed: user.gamesPlayed, createdAt: user.createdAt, lastLogin: user.lastLogin, equipped });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/logout', (req, res) => { res.clearCookie('token'); res.json({ success: true }); });

app.post('/api/avatar', authMiddleware, async (req, res) => {
  try {
    const { bodyColor, headColor, eyeColor } = req.body;
    await User.findByIdAndUpdate(req.userId, { avatar: { bodyColor: bodyColor || '#FFFFFF', headColor: headColor || '#FFFFFF', eyeColor: eyeColor || '#000000' } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/bio', authMiddleware, async (req, res) => {
  try {
    const { bio } = req.body;
    if (bio && bio.length > 200) return res.status(400).json({ error: 'Too long' });
    await User.findByIdAndUpdate(req.userId, { bio: bio || '' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/profile/:username', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: 'Database not ready' });
    const username = req.params.username.toLowerCase();
    const user = await User.findOne({ username }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    let publishedGames = [];
    try {
      const sg = await StudioGame.find({ owner: user._id, status: 'public', published: true }).select('title description thumbnailData plays createdAt updatedAt').sort({ updatedAt: -1 }).limit(20);
      publishedGames = sg.map(g => ({ id: g._id, slug: `studio_${g._id}`, title: g.title, description: g.description, thumbnailData: g.thumbnailData, plays: g.plays, createdAt: g.createdAt, updatedAt: g.updatedAt }));
    } catch (e) {}

    let equipped = {};
    try {
      const equip = await UserEquip.findOne({ userId: user._id }).populate('shirt pants face hair hat accessory body_part');
      if (equip) {
        ['shirt','pants','face','hair','hat','accessory','body_part'].forEach(cat => {
          if (equip[cat]) equipped[cat] = { id: equip[cat]._id, name: equip[cat].name, drawData: equip[cat].drawData, color: equip[cat+'Color'] || '' };
        });
      }
    } catch(e) {}

    let isOnline = false, currentGame = null;
    for (const [, room] of Object.entries(rooms)) {
      for (const [, player] of Object.entries(room.players)) {
        if (player.username === username) { isOnline = true; currentGame = room.place; break; }
      }
      if (isOnline) break;
    }

    res.json({ username: user.username, avatar: user.avatar, bio: user.bio, urus: user.urus, dailyStrikes: user.dailyStrikes, gamesPlayed: user.gamesPlayed, createdAt: user.createdAt, lastLogin: user.lastLogin, publishedGames, isOnline, currentGame, equipped });
  } catch (e) { console.error('[profile]', e); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/games/:slug/details', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: 'Database not ready' });
    const game = await Game.findOne({ slug: req.params.slug, status: 'active' }).select('slug name description type thumbnail totalPlays maxPlayers createdAt updatedAt');
    if (!game) return res.status(404).json({ error: 'Game not found' });
    let author = 'Tublox';
    if (req.params.slug.startsWith('studio_')) {
      const sg = await StudioGame.findById(req.params.slug.replace('studio_', '')).select('ownerUsername');
      if (sg) author = sg.ownerUsername;
    }
    let onlineCount = 0;
    for (const [, room] of Object.entries(rooms)) { if (room.place === req.params.slug) onlineCount += Object.keys(room.players).length; }
    res.json({ slug: game.slug, name: game.name, description: game.description, type: game.type, thumbnail: game.thumbnail, totalPlays: game.totalPlays, maxPlayers: game.maxPlayers, author, onlineCount, createdAt: game.createdAt, updatedAt: game.updatedAt });
  } catch (e) { console.error('[game-details]', e); res.status(500).json({ error: 'Server error' }); }
});

// ==================== GAMES API ====================

app.get('/api/games', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: 'Database not ready' });
    const games = await Game.find({ status: { $ne: 'disabled' } }).select('slug name description type status thumbnail order totalPlays maxPlayers').sort({ order: 1 });
    res.json(games);
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/games/:slug', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: 'Database not ready' });
    const game = await Game.findOne({ slug: req.params.slug, status: 'active' });
    if (!game) return res.status(404).json({ error: 'Game not found' });
    res.json(game);
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/online', (req, res) => {
  const counts = {};
  for (const [, room] of Object.entries(rooms)) { counts[room.place] = (counts[room.place] || 0) + Object.keys(room.players).length; }
  res.json(counts);
});

app.get('/api/assets', (req, res) => { res.json(ASSET_STORE); });

// ==================== STUDIO API ====================

app.get('/api/studio/my-games', authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: 'Database not ready' });
    const games = await StudioGame.find({ owner: req.userId }).select('title description thumbnailData status plays published publishedAt createdAt updatedAt').sort({ updatedAt: -1 });
    res.json(games);
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/studio/create', authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: 'Database not ready' });
    const user = await User.findById(req.userId).select('username');
    if (!user) return res.status(404).json({ error: 'User not found' });
    const count = await StudioGame.countDocuments({ owner: req.userId });
    if (count >= 20) return res.status(400).json({ error: 'Max 20 games' });
    const game = new StudioGame({
      owner: req.userId, ownerUsername: user.username, title: 'Untitled Game',
      blocks: [{ id: 'block_' + Date.now(), x: 0, y: 500, w: 2400, h: 40, color: '#333333', opacity: 1, text: '', textFont: 'Inter', textSize: 14, textColor: '#ffffff', isSpawn: false }],
      items: [], models: [],
      settings: { gravity: 0.6, playerSpeed: 4, jumpForce: -12, spawnX: 100, spawnY: 400, bgColor: '#0a0a0a', worldWidth: 2400, worldHeight: 600 }
    });
    await game.save();
    res.json({ success: true, gameId: game._id });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/studio/game/:id', authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: 'Database not ready' });
    const game = await StudioGame.findOne({ _id: req.params.id, owner: req.userId });
    if (!game) return res.status(404).json({ error: 'Game not found' });
    res.json(game);
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/studio/save/:id', authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: 'Database not ready' });
    const game = await StudioGame.findOne({ _id: req.params.id, owner: req.userId });
    if (!game) return res.status(404).json({ error: 'Game not found' });
    const { title, description, blocks, items, models, settings, thumbnailData } = req.body;
    if (title !== undefined) game.title = String(title).substring(0, 50);
    if (description !== undefined) game.description = String(description).substring(0, 200);
    if (Array.isArray(blocks)) game.blocks = blocks;
    if (Array.isArray(items)) game.items = items;
    if (Array.isArray(models)) game.models = models;
    if (settings && typeof settings === 'object') game.settings = settings;
    if (thumbnailData) game.thumbnailData = thumbnailData.substring(0, 200000);
    game.updatedAt = new Date();
    game.markModified('blocks'); game.markModified('items'); game.markModified('models'); game.markModified('settings');
    await game.save();
    if (game.published && game.status === 'public') await syncStudioToLiveGame(game);
    res.json({ success: true });
  } catch (e) { console.error('[Save]', e); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/studio/publish/:id', authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: 'Database not ready' });
    const game = await StudioGame.findOne({ _id: req.params.id, owner: req.userId });
    if (!game) return res.status(404).json({ error: 'Game not found' });
    const { status, title, description, thumbnailData } = req.body;
    if (!['public', 'private'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    if (title) game.title = title.substring(0, 50);
    if (description !== undefined) game.description = description.substring(0, 200);
    if (thumbnailData) game.thumbnailData = thumbnailData.substring(0, 200000);
    game.status = status;
    if (!game.published) { game.published = true; game.publishedAt = new Date(); }
    game.updatedAt = new Date();
    game.markModified('settings');
    await game.save();
    if (status === 'public') {
      await syncStudioToLiveGame(game);
      if (tgBotFunctions) tgBotFunctions.notifyNewGame(game).catch(e => console.error('[TG notify]', e));
    } else {
      await Game.deleteOne({ slug: `studio_${game._id}` }); clearPlaceCache(`studio_${game._id}`);
    }
    res.json({ success: true, status: game.status, published: game.published });
  } catch (e) { console.error('[Publish]', e); res.status(500).json({ error: 'Server error' }); }
});

async function syncStudioToLiveGame(game) {
  const slug = `studio_${game._id}`;
  const existing = await Game.findOne({ slug });
  const gi = Array.isArray(game.items) ? game.items : [];
  const gm = Array.isArray(game.models) ? game.models : [];
  const gs = game.settings || {};
  const spawnItems = gi.filter(i => i && i.giveOnStart);
  const collectibleItems = gi.filter(i => i && (i.collectOnTouch !== false) && !i.giveOnStart);
  const gameConfig = {
    gravity: gs.gravity || 0.6, maxFallSpeed: 12, playerSpeed: gs.playerSpeed || 4, jumpForce: gs.jumpForce || -12,
    spawnX: gs.spawnX || 100, spawnY: gs.spawnY || 400,
    platforms: (Array.isArray(game.blocks) ? game.blocks : []).map(b => ({ x: b.x, y: b.y, w: b.w, h: b.h, color: b.color, opacity: b.opacity, text: b.text, textFont: b.textFont, textSize: b.textSize, textColor: b.textColor })),
    checkpoints: [], items: {},
    spawnItems: spawnItems.map(i => ({ type: i.type, properties: i.properties || {} })),
    collectibleItems: collectibleItems.map(i => ({ type: i.type, x: i.x, y: i.y, properties: i.properties || {}, collectOnTouch: i.collectOnTouch !== false })),
    models: gm.map(m => ({ id: m.id, type: m.type, x: m.x, y: m.y, w: m.w || 40, h: m.h || 80, properties: m.properties || {} })),
    settings: gs
  };
  gi.forEach(i => { if (i && !gameConfig.items[i.type]) { const asset = ASSET_STORE.find(a => a.id === i.type); gameConfig.items[i.type] = { name: asset ? asset.name : i.type, ...(i.properties || {}) }; } });
  const td = { style: game.thumbnailData ? 'custom' : 'default', label: game.title.toUpperCase(), sublabel: `by ${game.ownerUsername}`, customImage: game.thumbnailData || '' };
  if (existing) {
    existing.name = game.title; existing.description = game.description || `by ${game.ownerUsername}`; existing.config = gameConfig; existing.updatedAt = new Date(); existing.status = 'active'; existing.thumbnail = td;
    existing.markModified('config'); existing.markModified('thumbnail'); await existing.save();
  } else {
    await new Game({ slug, name: game.title, description: game.description || `by ${game.ownerUsername}`, type: 'platformer', status: 'active', thumbnail: td, config: gameConfig, maxPlayers: 20, order: 100 + Math.floor(Math.random() * 900) }).save();
  }
  clearPlaceCache(slug);
}

app.delete('/api/studio/game/:id', authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: 'Database not ready' });
    const game = await StudioGame.findOne({ _id: req.params.id, owner: req.userId });
    if (!game) return res.status(404).json({ error: 'Game not found' });
    await Game.deleteOne({ slug: `studio_${game._id}` }); clearPlaceCache(`studio_${game._id}`);
    await StudioGame.deleteOne({ _id: game._id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// ==================== MARKET API ====================

app.get('/api/market/captcha-key', (req, res) => { res.json({ sitekey: HCAPTCHA_SITEKEY }); });

app.get('/api/market/items', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: 'Database not ready' });
    const { category, sort, search, rarity } = req.query;
    const filter = { active: true };
    if (category && category !== 'all') filter.category = category;
    if (rarity && rarity !== 'all') filter.rarity = rarity;
    if (search) filter.name = { $regex: search, $options: 'i' };
    let sortObj = { featured: -1, createdAt: -1 };
    if (sort === 'price_low') sortObj = { price: 1 }; else if (sort === 'price_high') sortObj = { price: -1 };
    else if (sort === 'newest') sortObj = { createdAt: -1 }; else if (sort === 'popular') sortObj = { sold: -1 };
    const items = await MarketItem.find(filter).select('name description category subcategory price rarity thumbnail drawData colors isLimited stock sold creatorName featured tags createdAt').sort(sortObj).limit(100);
    res.json(items);
  } catch (e) { console.error('[market-items]', e); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/market/item/:id', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: 'Database not ready' });
    const item = await MarketItem.findOne({ _id: req.params.id, active: true });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/market/buy/:id', authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: 'Database not ready' });
    const { captchaToken, selectedColor } = req.body;
    const captchaValid = await verifyHCaptcha(captchaToken);
    if (!captchaValid) return res.status(400).json({ error: 'Captcha verification failed' });
    const item = await MarketItem.findOne({ _id: req.params.id, active: true });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    const existing = await UserInventory.findOne({ userId: req.userId, itemId: item._id });
    if (existing) return res.status(400).json({ error: 'You already own this item' });
    if (item.isLimited && item.stock !== -1 && item.sold >= item.stock) return res.status(400).json({ error: 'Sold out' });
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.urus < item.price) return res.status(400).json({ error: 'Not enough Urus' });
    user.urus -= item.price; await user.save();
    await new UserInventory({ userId: req.userId, itemId: item._id, color: selectedColor || (item.colors.length > 0 ? item.colors[0] : '') }).save();
    item.sold += 1; await item.save();
    res.json({ success: true, newBalance: user.urus, itemName: item.name });
  } catch (e) {
    if (e.code === 11000) return res.status(400).json({ error: 'Already owned' });
    console.error('[market-buy]', e); res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/market/inventory', authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: 'Database not ready' });
    const inventory = await UserInventory.find({ userId: req.userId }).populate('itemId', 'name description category subcategory price rarity thumbnail drawData colors creatorName').sort({ purchasedAt: -1 });
    const equip = await UserEquip.findOne({ userId: req.userId });
    res.json({
      items: inventory.filter(i => i.itemId).map(i => ({ inventoryId: i._id, item: i.itemId, purchasedAt: i.purchasedAt, equipped: i.equipped, color: i.color })),
      equipped: equip || {}
    });
  } catch (e) { console.error('[market-inventory]', e); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/market/equip', authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: 'Database not ready' });
    const { itemId, action, color } = req.body;
    if (action === 'unequip') {
      const item = await MarketItem.findById(itemId);
      if (!item) return res.status(404).json({ error: 'Item not found' });
      let equip = await UserEquip.findOne({ userId: req.userId });
      if (equip) { equip[item.category] = null; if (equip[item.category+'Color'] !== undefined) equip[item.category+'Color'] = ''; equip.updatedAt = new Date(); await equip.save(); }
      await UserInventory.updateOne({ userId: req.userId, itemId }, { equipped: false });
      return res.json({ success: true });
    }
    const owned = await UserInventory.findOne({ userId: req.userId, itemId });
    if (!owned) return res.status(400).json({ error: 'Not owned' });
    const item = await MarketItem.findById(itemId);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    let equip = await UserEquip.findOne({ userId: req.userId });
    if (!equip) equip = new UserEquip({ userId: req.userId });
    if (equip[item.category]) { await UserInventory.updateOne({ userId: req.userId, itemId: equip[item.category] }, { equipped: false }); }
    equip[item.category] = item._id;
    if (color && equip[item.category+'Color'] !== undefined) equip[item.category+'Color'] = color;
    equip.updatedAt = new Date(); await equip.save();
    owned.equipped = true; if (color) owned.color = color; await owned.save();
    res.json({ success: true });
  } catch (e) { console.error('[market-equip]', e); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/market/equipped/:username', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: 'Database not ready' });
    const user = await User.findOne({ username: req.params.username.toLowerCase() });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const equip = await UserEquip.findOne({ userId: user._id }).populate('shirt pants face hair hat accessory body_part');
    if (!equip) return res.json({});
    const result = {};
    ['shirt','pants','face','hair','hat','accessory','body_part'].forEach(cat => {
      if (equip[cat]) result[cat] = { id: equip[cat]._id, name: equip[cat].name, drawData: equip[cat].drawData, color: equip[cat+'Color'] || '' };
    });
    res.json(result);
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// Admin
app.post('/api/admin/market/seed', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.username !== 'today_idk') return res.status(403).json({ error: 'Forbidden' });
    const count = await MarketItem.countDocuments();
    if (count > 0) return res.json({ message: 'Already seeded', count });
    const seedItems = [
      { name: 'Basic Tee', description: 'Simple t-shirt', category: 'shirt', price: 5, rarity: 'common', colors: ['#FFFFFF','#222222','#EF4444','#3B82F6','#22C55E','#EAB308','#A855F7'], drawData: { type: 'basic_tee' }, tags: ['basic'] },
      { name: 'Hoodie', description: 'Cozy hoodie', category: 'shirt', price: 15, rarity: 'uncommon', colors: ['#333333','#1a1a2e','#4B0082','#8B0000','#006400'], drawData: { type: 'hoodie' }, tags: ['warm'] },
      { name: 'Jacket', description: 'Leather jacket', category: 'shirt', price: 25, rarity: 'rare', colors: ['#222222','#8B4513','#1a1a1a'], drawData: { type: 'jacket' }, tags: ['cool'] },
      { name: 'Stripe Shirt', description: 'Striped shirt', category: 'shirt', price: 10, rarity: 'common', colors: ['#FF4444','#4488FF','#44CC44','#FFAA00'], drawData: { type: 'stripe_shirt' }, tags: ['stripes'] },
      { name: 'Gold Armor', description: 'Golden chestplate', category: 'shirt', price: 100, rarity: 'legendary', colors: ['#FFD700'], drawData: { type: 'gold_armor' }, tags: ['armor','legendary'], featured: true, isLimited: true, stock: 50 },
      { name: 'Tank Top', description: 'Simple tank top', category: 'shirt', price: 3, rarity: 'common', colors: ['#FFFFFF','#222222','#EF4444','#3B82F6'], drawData: { type: 'tank_top' }, tags: ['basic'] },
      { name: 'Jeans', description: 'Blue jeans', category: 'pants', price: 8, rarity: 'common', colors: ['#1a3a5c','#222222','#4a4a4a'], drawData: { type: 'jeans' }, tags: ['basic'] },
      { name: 'Shorts', description: 'Comfortable shorts', category: 'pants', price: 5, rarity: 'common', colors: ['#333333','#8B4513','#2d5016'], drawData: { type: 'shorts' }, tags: ['casual'] },
      { name: 'Cargo Pants', description: 'Tactical cargo', category: 'pants', price: 12, rarity: 'uncommon', colors: ['#2d3319','#333333','#4a3728'], drawData: { type: 'cargo' }, tags: ['tactical'] },
      { name: 'Sweatpants', description: 'Comfy sweats', category: 'pants', price: 6, rarity: 'common', colors: ['#333333','#555555','#1a1a2e'], drawData: { type: 'sweatpants' }, tags: ['comfy'] },
      { name: 'Royal Legs', description: 'Royal leggings', category: 'pants', price: 80, rarity: 'legendary', colors: ['#4B0082'], drawData: { type: 'royal_legs' }, tags: ['royal','legendary'], featured: true, isLimited: true, stock: 30 },
      { name: 'Smile', description: 'Happy face', category: 'face', price: 10, rarity: 'common', drawData: { type: 'smile' }, tags: ['happy'] },
      { name: 'Cool Face', description: 'Sunglasses', category: 'face', price: 20, rarity: 'uncommon', drawData: { type: 'cool' }, tags: ['cool'] },
      { name: 'Angry', description: 'Fierce expression', category: 'face', price: 12, rarity: 'common', drawData: { type: 'angry' }, tags: ['angry'] },
      { name: 'Wink', description: 'Playful wink', category: 'face', price: 15, rarity: 'uncommon', drawData: { type: 'wink' }, tags: ['playful'] },
      { name: 'Robot Face', description: 'Digital display', category: 'face', price: 50, rarity: 'epic', drawData: { type: 'robot' }, tags: ['robot'], featured: true },
      { name: 'Skull', description: 'Spooky skull', category: 'face', price: 35, rarity: 'rare', drawData: { type: 'skull' }, tags: ['spooky'] },
      { name: 'Spiky Hair', description: 'Spiky style', category: 'hair', price: 15, rarity: 'common', colors: ['#222222','#8B4513','#FFD700','#FF4444','#FFFFFF'], drawData: { type: 'spiky' }, tags: ['spiky'] },
      { name: 'Long Hair', description: 'Flowing hair', category: 'hair', price: 18, rarity: 'uncommon', colors: ['#222222','#8B4513','#FFD700','#FF6B6B','#A855F7'], drawData: { type: 'long' }, tags: ['long'] },
      { name: 'Mohawk', description: 'Punk mohawk', category: 'hair', price: 22, rarity: 'uncommon', colors: ['#FF4444','#22C55E','#A855F7','#3B82F6','#222222'], drawData: { type: 'mohawk' }, tags: ['punk'] },
      { name: 'Curly', description: 'Curly afro', category: 'hair', price: 16, rarity: 'common', colors: ['#222222','#8B4513','#4a3728'], drawData: { type: 'curly' }, tags: ['curly'] },
      { name: 'Fire Hair', description: 'Flame hair', category: 'hair', price: 120, rarity: 'legendary', colors: ['#FF4500'], drawData: { type: 'fire' }, tags: ['fire','legendary'], featured: true, isLimited: true, stock: 20 },
      { name: 'Baseball Cap', description: 'Classic cap', category: 'hat', price: 8, rarity: 'common', colors: ['#222222','#EF4444','#3B82F6','#22C55E','#FFFFFF'], drawData: { type: 'baseball_cap' }, tags: ['cap'] },
      { name: 'Top Hat', description: 'Fancy hat', category: 'hat', price: 30, rarity: 'rare', colors: ['#222222','#4B0082'], drawData: { type: 'top_hat' }, tags: ['fancy'] },
      { name: 'Crown', description: 'Golden crown', category: 'hat', price: 150, rarity: 'legendary', colors: ['#FFD700'], drawData: { type: 'crown' }, tags: ['royal','legendary'], featured: true, isLimited: true, stock: 10 },
      { name: 'Beanie', description: 'Knit beanie', category: 'hat', price: 10, rarity: 'common', colors: ['#333333','#EF4444','#3B82F6','#22C55E'], drawData: { type: 'beanie' }, tags: ['warm'] },
      { name: 'Ninja Headband', description: 'Stealth headband', category: 'hat', price: 20, rarity: 'uncommon', colors: ['#222222','#EF4444','#3B82F6'], drawData: { type: 'ninja_headband' }, tags: ['ninja'] },
      { name: 'Backpack', description: 'Adventure pack', category: 'accessory', price: 12, rarity: 'common', colors: ['#2d5016','#333333','#8B4513'], drawData: { type: 'backpack' }, tags: ['adventure'] },
      { name: 'Wings', description: 'Angel wings', category: 'accessory', price: 60, rarity: 'epic', colors: ['#FFFFFF','#222222','#FFD700'], drawData: { type: 'wings' }, tags: ['wings'], featured: true },
      { name: 'Cape', description: 'Hero cape', category: 'accessory', price: 25, rarity: 'rare', colors: ['#EF4444','#3B82F6','#222222','#4B0082'], drawData: { type: 'cape' }, tags: ['hero'] },
      { name: 'Scarf', description: 'Winter scarf', category: 'accessory', price: 8, rarity: 'common', colors: ['#EF4444','#3B82F6','#22C55E','#FFFFFF','#333333'], drawData: { type: 'scarf' }, tags: ['warm'] },
      { name: 'Necklace', description: 'Pendant necklace', category: 'accessory', price: 18, rarity: 'uncommon', colors: ['#FFD700','#C0C0C0','#CD7F32'], drawData: { type: 'necklace' }, tags: ['jewelry'] },
      { name: 'Robot Arms', description: 'Mechanical arms', category: 'body_part', price: 40, rarity: 'rare', colors: ['#888888','#444444'], drawData: { type: 'robot_arms' }, tags: ['robot'] },
      { name: 'Claws', description: 'Monster claws', category: 'body_part', price: 35, rarity: 'rare', colors: ['#333333','#8B4513'], drawData: { type: 'claws' }, tags: ['monster'] },
      { name: 'Tail', description: 'Animal tail', category: 'body_part', price: 20, rarity: 'uncommon', colors: ['#8B4513','#FFD700','#FFFFFF','#333333'], drawData: { type: 'tail' }, tags: ['animal'] },
    ];
    await MarketItem.insertMany(seedItems);
    res.json({ success: true, count: seedItems.length });
  } catch (e) { console.error('[seed]', e); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/admin/market/add', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.username !== 'today_idk') return res.status(403).json({ error: 'Forbidden' });
    const item = new MarketItem(req.body); await item.save();
    res.json({ success: true, id: item._id });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/admin/give-urus', authMiddleware, async (req, res) => {
  try {
    const admin = await User.findById(req.userId);
    if (!admin || admin.username !== 'today_idk') return res.status(403).json({ error: 'Forbidden' });
    const { username, amount } = req.body;
    const target = await User.findOne({ username: (username || admin.username).toLowerCase() });
    if (!target) return res.status(404).json({ error: 'User not found' });
    target.urus += (amount || 0);
    await target.save();
    res.json({ success: true, username: target.username, newBalance: target.urus });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// ==================== TIME API ====================

let timerOffsetMs = 0;
const STUDIO_TARGET = Date.UTC(2026, 1, 14, 9, 25, 30, 0);
app.get('/api/time', (req, res) => { res.json({ remainingMs: (STUDIO_TARGET + timerOffsetMs) - Date.now(), serverNow: Date.now(), offsetMs: timerOffsetMs }); });

// ==================== GAME WORLDS ====================

const PLACES_CACHE = {};
async function getPlaceConfig(slug) {
  if (PLACES_CACHE[slug]) return PLACES_CACHE[slug];
  const game = await Game.findOne({ slug, status: 'active' });
  if (!game) return null;
  const pd = { name: game.name, type: game.type, gravity: game.config.gravity, maxFallSpeed: game.config.maxFallSpeed, playerSpeed: game.config.playerSpeed, jumpForce: game.config.jumpForce, spawnX: game.config.spawnX, spawnY: game.config.spawnY, platforms: game.config.platforms || [], checkpoints: game.config.checkpoints || [], items: game.config.items || {}, maxPlayers: game.maxPlayers, spawnItems: game.config.spawnItems || [], collectibleItems: game.config.collectibleItems || [], models: game.config.models || [], settings: game.config.settings || {}, blocks: game.config.platforms || [] };
  PLACES_CACHE[slug] = pd; return pd;
}
function clearPlaceCache(slug) { delete PLACES_CACHE[slug]; }

// ==================== MULTIPLAYER ====================

const rooms = {}, playerRooms = {}, activeUserSessions = {};

function getOrCreateRoom(placeName, maxPlayers = 20) {
  for (const [roomId, room] of Object.entries(rooms)) { if (room.place === placeName && Object.keys(room.players).length < maxPlayers) return roomId; }
  const roomId = `${placeName}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  rooms[roomId] = { players: {}, place: placeName }; return roomId;
}

function removePlayerFromAllRooms(socketId) {
  const roomId = playerRooms[socketId];
  if (roomId && rooms[roomId]) { delete rooms[roomId].players[socketId]; io.to(roomId).emit('player-left', { id: socketId }); if (Object.keys(rooms[roomId].players).length === 0) delete rooms[roomId]; }
  delete playerRooms[socketId];
}

io.on('connection', (socket) => {
  socket.on('join-game', async (data) => {
    try {
      if (mongoose.connection.readyState !== 1) return socket.emit('error-msg', 'Server starting up');
      const { token, place } = data;
      if (!token || !place) return;
      let decoded;
      try { decoded = jwt.verify(token, JWT_SECRET); } catch (e) { return socket.emit('error-msg', 'Invalid token'); }
      const userId = decoded.userId;
      const user = await User.findById(userId).select('-password');
      if (!user) return socket.emit('error-msg', 'User not found');
      const placeData = await getPlaceConfig(place);
      if (!placeData) return socket.emit('error-msg', 'TuGame not found');

      const oldSocketId = activeUserSessions[userId];
      if (oldSocketId && oldSocketId !== socket.id) { const o = io.sockets.sockets.get(oldSocketId); if (o) { o.emit('kicked', 'Joined from another tab'); removePlayerFromAllRooms(oldSocketId); o.disconnect(true); } }
      if (playerRooms[socket.id]) removePlayerFromAllRooms(socket.id);
      activeUserSessions[userId] = socket.id; socket._userId = userId;
      user.gamesPlayed += 1; await user.save();
      await Game.updateOne({ slug: place }, { $inc: { totalPlays: 1 } });

      // Telegram milestone check
      if (tgBotFunctions) {
        const updatedGame = await Game.findOne({ slug: place }).select('totalPlays');
        if (updatedGame) tgBotFunctions.checkPlayMilestones(place, updatedGame.totalPlays).catch(() => {});
      }

      const roomId = getOrCreateRoom(place, placeData.maxPlayers);
      socket.join(roomId); playerRooms[socket.id] = roomId;

      let inventory = [null, null, null, null];
      if (placeData.spawnItems && placeData.spawnItems.length > 0) {
        placeData.spawnItems.forEach((si, idx) => { if (idx < 4 && si) { const asset = ASSET_STORE.find(a => a.id === si.type); inventory[idx] = { id: si.type, name: asset ? asset.name : si.type, ...(si.properties || {}) }; } });
      }
      if (placeData.type === 'pvp' && placeData.items?.sword && !inventory.some(i => i && i.id === 'sword')) {
        const es = inventory.indexOf(null);
        if (es !== -1) inventory[es] = { id: 'sword', name: 'Sword', damage: placeData.items.sword.damage || 20, range: placeData.items.sword.range || 50, cooldown: placeData.items.sword.cooldown || 500 };
      }

      let equipped = {};
      try {
        const equip = await UserEquip.findOne({ userId }).populate('shirt pants face hair hat accessory body_part');
        if (equip) {
          ['shirt','pants','face','hair','hat','accessory','body_part'].forEach(cat => {
            if (equip[cat]) equipped[cat] = { id: equip[cat]._id, name: equip[cat].name, drawData: equip[cat].drawData, color: equip[cat+'Color'] || '' };
          });
        }
      } catch(e) {}

      const playerData = {
        id: socket.id, username: user.username,
        x: placeData.spawnX, y: placeData.spawnY, vx: 0, vy: 0,
        width: 32, height: 48, onGround: false, direction: 1, state: 'idle', frame: 0,
        checkpoint: { x: placeData.spawnX, y: placeData.spawnY }, currentCheckpointIndex: -1,
        avatar: user.avatar, hp: 100, maxHp: 100,
        inventory, activeSlot: 0, attacking: false, lastAttackTime: 0,
        equipped
      };

      rooms[roomId].players[socket.id] = playerData;
      socket.emit('game-init', { place: placeData, placeName: place, player: playerData, players: rooms[roomId].players, roomId });
      socket.to(roomId).emit('player-joined', playerData);
    } catch (e) { console.error('[join-game]', e); socket.emit('error-msg', 'Failed to join'); }
  });

  socket.on('player-update', (data) => {
    const roomId = playerRooms[socket.id];
    if (!roomId || !rooms[roomId]) return;
    const p = rooms[roomId].players[socket.id];
    if (!p) return;
    p.x = data.x; p.y = data.y; p.vx = data.vx; p.vy = data.vy;
    p.direction = data.direction; p.state = data.state; p.frame = data.frame;
    p.onGround = data.onGround; p.activeSlot = data.activeSlot || 0; p.attacking = data.attacking || false;
    if (p.y > 700) { p.x = p.checkpoint.x; p.y = p.checkpoint.y; p.vx = 0; p.vy = 0; p.hp = p.maxHp; socket.emit('player-respawn', { x: p.x, y: p.y, hp: p.hp }); }
    socket.to(roomId).emit('player-moved', { id: socket.id, x: p.x, y: p.y, vx: p.vx, vy: p.vy, direction: p.direction, state: p.state, frame: p.frame, activeSlot: p.activeSlot, attacking: p.attacking, hp: p.hp, itemState: data.itemState || {} });
  });

  socket.on('attack', async () => {
    const roomId = playerRooms[socket.id];
    if (!roomId || !rooms[roomId]) return;
    const atk = rooms[roomId].players[socket.id];
    if (!atk) return;
    const now = Date.now();
    const item = atk.inventory[atk.activeSlot];
    if (!item || item.id !== 'sword' || now - atk.lastAttackTime < (item.cooldown || 500)) return;
    atk.lastAttackTime = now; atk.attacking = true; setTimeout(() => { atk.attacking = false; }, 300);
    const placeData = await getPlaceConfig(rooms[roomId].place);
    for (const [id, target] of Object.entries(rooms[roomId].players)) {
      if (id === socket.id) continue;
      const dx = target.x - atk.x, dy = target.y - atk.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const inFront = (atk.direction === 1 && dx > 0) || (atk.direction === -1 && dx < 0);
      if (dist < (item.range || 50) + 30 && inFront && Math.abs(dy) < 40) {
        target.hp -= (item.damage || 20);
        io.to(id).emit('player-hit', { hp: target.hp, knockX: atk.direction * 8, knockY: -5 });
        if (target.hp <= 0) {
          target.hp = target.maxHp;
          if (placeData) { target.x = placeData.spawnX; target.y = placeData.spawnY; }
          target.vx = 0; target.vy = 0;
          io.to(id).emit('player-respawn', { x: target.x, y: target.y, hp: target.hp });
          io.to(roomId).emit('kill-feed', { killer: atk.username, victim: target.username });
        }
      }
    }
    socket.to(roomId).emit('player-attack', { id: socket.id });
  });

  socket.on('collect-item', (data) => {
    const roomId = playerRooms[socket.id]; if (!roomId || !rooms[roomId]) return;
    const p = rooms[roomId].players[socket.id]; if (!p) return;
    const es = p.inventory.indexOf(null);
    if (es !== -1 && data.item) { p.inventory[es] = data.item; socket.emit('inventory-update', { inventory: p.inventory }); }
  });

  socket.on('checkpoint-reached', (data) => {
    const roomId = playerRooms[socket.id]; if (!roomId || !rooms[roomId]) return;
    const p = rooms[roomId].players[socket.id]; if (p) p.checkpoint = { x: data.x, y: data.y };
  });

  socket.on('chat-message', (data) => {
    const roomId = playerRooms[socket.id]; if (!roomId || !rooms[roomId]) return;
    const p = rooms[roomId].players[socket.id];
    if (!p || !data.msg || !data.msg.trim() || data.msg.length > 200) return;
    io.to(roomId).emit('chat-message', { username: p.username, msg: data.msg.trim() });
  });

  socket.on('switch-slot', (data) => {
    const roomId = playerRooms[socket.id]; if (!roomId || !rooms[roomId]) return;
    const p = rooms[roomId].players[socket.id];
    if (p && typeof data.slot === 'number' && data.slot >= 0 && data.slot < 4) p.activeSlot = data.slot;
  });

  socket.on('studio-join', async (data) => {
    try { if (!data.token) return; if (mongoose.connection.readyState !== 1) return;
      const decoded = jwt.verify(data.token, JWT_SECRET);
      const user = await User.findById(decoded.userId).select('username'); if (!user) return;
      socket._studioUser = user.username; socket.join('studio-room');
      socket.emit('studio-sync', { offsetMs: timerOffsetMs, remainingMs: (STUDIO_TARGET + timerOffsetMs) - Date.now(), isAdmin: user.username === 'today_idk' });
    } catch (e) {}
  });

  socket.on('studio-adjust-time', (data) => {
    if (!socket._studioUser || socket._studioUser !== 'today_idk') return;
    const { action, amount } = data; if (!action || amount === undefined) return;
    const ms = parseInt(amount); if (isNaN(ms)) return;
    switch (action) {
      case 'add-hours': timerOffsetMs += ms * 3600000; break; case 'sub-hours': timerOffsetMs -= ms * 3600000; break;
      case 'add-minutes': timerOffsetMs += ms * 60000; break; case 'sub-minutes': timerOffsetMs -= ms * 60000; break;
      case 'add-seconds': timerOffsetMs += ms * 1000; break; case 'sub-seconds': timerOffsetMs -= ms * 1000; break;
      case 'reset': timerOffsetMs = 0; break;
    }
    io.to('studio-room').emit('studio-timer-update', { offsetMs: timerOffsetMs, remainingMs: (STUDIO_TARGET + timerOffsetMs) - Date.now(), adjustedBy: socket._studioUser, action, amount: ms });
  });

  socket.on('disconnect', () => {
    if (socket._userId && activeUserSessions[socket._userId] === socket.id) delete activeUserSessions[socket._userId];
    removePlayerFromAllRooms(socket.id);
  });
});

// ==================== STARTUP ====================

async function start() {
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 15000, socketTimeoutMS: 45000, maxPoolSize: 10, retryWrites: true });
    console.log('[DB] MongoDB connected');
    tgBotFunctions = initTelegramBot();
    server.listen(PORT, () => { console.log(`[Tublox3] http://localhost:${PORT}`); });
  } catch (err) { console.error('[DB] Failed:', err.message); process.exit(1); }
}
mongoose.connection.on('disconnected', () => { console.warn('[DB] Disconnected'); });
mongoose.connection.on('error', (err) => { console.error('[DB] Error:', err.message); });
start();