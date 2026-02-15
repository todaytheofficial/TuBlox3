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
  avatar: { bodyColor: { type: String, default: '#FFFFFF' }, headColor: { type: String, default: '#FFFFFF' }, eyeColor: { type: String, default: '#000000' } },
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
  thumbnail: { style: { type: String, default: 'default' }, bgColor: { type: String, default: '#080808' }, label: { type: String, default: '' }, sublabel: { type: String, default: '' }, customImage: { type: String, default: '' } },
  config: {
    gravity: { type: Number, default: 0.6 }, maxFallSpeed: { type: Number, default: 12 },
    playerSpeed: { type: Number, default: 4 }, jumpForce: { type: Number, default: -12 },
    spawnX: { type: Number, default: 100 }, spawnY: { type: Number, default: 200 },
    platforms: { type: Array, default: [] }, checkpoints: { type: Array, default: [] },
    items: { type: mongoose.Schema.Types.Mixed, default: {} },
    spawnItems: { type: Array, default: [] }, collectibleItems: { type: Array, default: [] },
    models: { type: Array, default: [] }, avatars: { type: Array, default: [] },
    settings: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  maxPlayers: { type: Number, default: 20 },
  order: { type: Number, default: 0 },
  totalPlays: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
const Game = mongoose.model('Game', gameSchema);

const studioBlockSchema = new mongoose.Schema({
  id: String, x: { type: Number, default: 0 }, y: { type: Number, default: 0 },
  w: { type: Number, default: 100 }, h: { type: Number, default: 40 },
  color: { type: String, default: '#333333' }, opacity: { type: Number, default: 1 },
  text: { type: String, default: '' }, textFont: { type: String, default: 'Inter' },
  textSize: { type: Number, default: 14 }, textColor: { type: String, default: '#ffffff' },
  isSpawn: { type: Boolean, default: false }
}, { _id: false });

const studioItemSchema = new mongoose.Schema({
  id: String, type: { type: String, default: 'sword' },
  x: { type: Number, default: 0 }, y: { type: Number, default: 0 },
  giveOnStart: { type: Boolean, default: false },
  collectOnTouch: { type: Boolean, default: true },
  properties: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { _id: false });

const studioModelSchema = new mongoose.Schema({
  id: String, type: { type: String, default: 'door_key' },
  x: { type: Number, default: 0 }, y: { type: Number, default: 0 },
  w: { type: Number, default: 40 }, h: { type: Number, default: 80 },
  properties: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { _id: false });

const studioKeyframeSchema = new mongoose.Schema({
  time: { type: Number, default: 0 },
  duration: { type: Number, default: 0.5 },
  pose: { type: String, default: 'idle' },
  dx: { type: Number, default: 0 },
  dy: { type: Number, default: 0 },
  dir: { type: Number, default: 0 },
  easing: { type: String, default: 'linear' }
}, { _id: false });

// ==================== DIALOGUE SCHEMAS ====================

const dialogueLineSchema = new mongoose.Schema({
  speaker: { type: String, default: 'npc' },
  text: { type: String, default: '' },
  emotion: { type: String, default: 'neutral' },
  effect: { type: String, default: 'normal' },
  speed: { type: Number, default: 30 }
}, { _id: false });

const dialogueChoiceSchema = new mongoose.Schema({
  text: { type: String, default: '' },
  action: { type: String, default: 'continue' },
  jumpTo: { type: Number, default: 1 },
  itemId: { type: String, default: '' },
  varName: { type: String, default: '' },
  varValue: { type: String, default: '' }
}, { _id: false });

const dialogueSchema = new mongoose.Schema({
  triggerKey: { type: String, default: 'E' },
  triggerRadius: { type: Number, default: 80 },
  oneTime: { type: Boolean, default: false },
  npcName: { type: String, default: '' },
  nameColor: { type: String, default: '#a78bfa' },
  typingSpeed: { type: Number, default: 30 },
  lines: [dialogueLineSchema],
  hasChoices: { type: Boolean, default: false },
  choiceAfterLine: { type: Number, default: 1 },
  choicePrompt: { type: String, default: '' },
  choices: [dialogueChoiceSchema],
  endAction: { type: String, default: 'none' },
  endActionParams: { type: mongoose.Schema.Types.Mixed, default: {} },
  hasCondition: { type: Boolean, default: false },
  conditionType: { type: String, default: 'has_item' },
  conditionParams: { type: mongoose.Schema.Types.Mixed, default: {} },
  conditionFailText: { type: String, default: '' }
}, { _id: false });

// ==================== AVATAR SCHEMA (UPDATED) ====================

const studioAvatarSchema = new mongoose.Schema({
  id: String,
  x: { type: Number, default: 0 }, y: { type: Number, default: 0 },
  w: { type: Number, default: 22 }, h: { type: Number, default: 34 },
  direction: { type: Number, default: 1 },
  defaultAnim: { type: String, default: 'idle' },
  animSpeed: { type: Number, default: 1 },
  loop: { type: Boolean, default: true },
  interactive: { type: Boolean, default: false },
  usePlayerAvatar: { type: Boolean, default: false },
  bodyColor: { type: String, default: '#ffffff' },
  headColor: { type: String, default: '#ffffff' },
  eyeColor: { type: String, default: '#000000' },
  npcName: { type: String, default: '' },
  keyframes: [studioKeyframeSchema],
  dialogue: { type: dialogueSchema, default: null },
  properties: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { _id: false });

const studioGameSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ownerUsername: { type: String, required: true },
  title: { type: String, required: true, maxlength: 50 },
  description: { type: String, default: '', maxlength: 200 },
  thumbnailData: { type: String, default: '' },
  status: { type: String, enum: ['private', 'public'], default: 'private' },
  blocks: [studioBlockSchema],
  items: [studioItemSchema],
  models: [studioModelSchema],
  avatars: [studioAvatarSchema],
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

const EQUIP_CATS = ['shirt','pants','face','hair','hat','accessory','body_part'];

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

// ==================== TELEGRAM SCHEMAS ====================

const tgSubscriberSchema = new mongoose.Schema({
  chatId: { type: Number, required: true, unique: true },
  username: { type: String, default: '' },
  subscribed: { type: Boolean, default: true },
  notifications: { newGames: { type: Boolean, default: true }, playerMilestones: { type: Boolean, default: true }, dailyStats: { type: Boolean, default: true } },
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

function authMw(req, res, next) {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try { const d = jwt.verify(token, JWT_SECRET); req.userId = d.userId; req.username = d.username; next(); }
  catch { return res.status(401).json({ error: 'Invalid token' }); }
}

function dbReady(req, res, next) {
  if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: 'Database not ready' });
  next();
}

async function verifyHCaptcha(token) {
  if (!token) return false;
  try {
    const params = new URLSearchParams({ response: token, secret: HCAPTCHA_SECRET });
    const r = await fetch('https://hcaptcha.com/siteverify', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString() });
    return (await r.json()).success === true;
  } catch { return false; }
}

// ==================== DAILY STRIKES ====================

function getStrikeReward(s) { return s >= 15 ? 6 : s >= 10 ? 4 : s >= 5 ? 2 : 1; }
function getNextMilestone(s) { if (s < 5) return { day: 5, reward: 2 }; if (s < 10) return { day: 10, reward: 4 }; if (s < 15) return { day: 15, reward: 6 }; return { day: null, reward: 6 }; }
function getDayStart(d) { const x = new Date(d); return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime(); }

async function checkDailyReward(user) {
  const now = new Date(), todayStart = getDayStart(now);
  let rewarded = false, rewardAmount = 0, streakReset = false;
  if (!user.lastDailyReward) {
    user.dailyStrikes = 1; rewardAmount = getStrikeReward(1); user.urus += rewardAmount; user.lastDailyReward = now; rewarded = true;
  } else {
    const diff = Math.floor((todayStart - getDayStart(user.lastDailyReward)) / 86400000);
    if (diff === 0) { /* already claimed */ }
    else if (diff === 1) { user.dailyStrikes += 1; rewardAmount = getStrikeReward(user.dailyStrikes); user.urus += rewardAmount; user.lastDailyReward = now; rewarded = true; }
    else { user.dailyStrikes = 1; rewardAmount = 1; user.urus += 1; user.lastDailyReward = now; rewarded = true; streakReset = true; }
  }
  if (rewarded) await user.save();
  return { rewarded, rewardAmount, totalUrus: user.urus, dailyStrikes: user.dailyStrikes, streakReset, currentRewardRate: getStrikeReward(user.dailyStrikes), nextMilestone: getNextMilestone(user.dailyStrikes) };
}

// ==================== EQUIPPED HELPER ====================

async function getEquippedMap(userId) {
  const equipped = {};
  try {
    const equip = await UserEquip.findOne({ userId }).populate(EQUIP_CATS.join(' '));
    if (equip) {
      for (const cat of EQUIP_CATS) {
        if (equip[cat]) equipped[cat] = { id: equip[cat]._id, name: equip[cat].name, drawData: equip[cat].drawData, color: equip[cat + 'Color'] || (equip[cat].colors?.[0]) || '' };
      }
    }
  } catch {}
  return equipped;
}

// ==================== TELEGRAM BOT ====================

let tgBot = null, tgBotFunctions = null;
const botStats = { lastNotifiedGames: new Set(), peakOnline: {}, snapshotInterval: null, notifyInterval: null };

function getOnlineCounts() {
  const counts = {};
  for (const room of Object.values(rooms)) {
    const pc = Object.keys(room.players).length;
    if (pc > 0) counts[room.place] = (counts[room.place] || 0) + pc;
  }
  return counts;
}

function escTg(s) { return s ? String(s).replace(/[*_`\[]/g, '\\$&') : ''; }
function makeBar(pct) { const f = Math.round(pct / 10); return '#'.repeat(f) + '-'.repeat(10 - f); }

function initTelegramBot() {
  if (!TG_ENABLED) { console.log('[TG Bot] Disabled'); return null; }
  tgBot = new TelegramBot(TG_BOT_TOKEN, { polling: true });
  console.log('[TG Bot] Starting...');

  const cmds = {
    async start(chatId, msg) {
      try { await TgSubscriber.findOneAndUpdate({ chatId }, { chatId, username: msg.from?.username || '', subscribed: true }, { upsert: true, new: true }); } catch {}
      tgBot.sendMessage(chatId, `*TuStats Places Bot*\n\n/places /online /top /stats /place /history /search /peak /new /notify /help`, { parse_mode: 'Markdown' });
    },

    async places(chatId) {
      const games = await Game.find({ status: 'active' }).select('slug name type totalPlays maxPlayers').sort({ totalPlays: -1 });
      if (!games.length) return tgBot.sendMessage(chatId, 'Нет активных плейсов');
      const oc = getOnlineCounts();
      let text = '*Активные плейсы*\n\n';
      games.forEach((g, i) => {
        const on = oc[g.slug] || 0;
        text += `${i + 1}. *${escTg(g.name)}* (${g.type})\n   ${on > 0 ? '[ON]' : '[--]'} \`${on}/${g.maxPlayers}\` | ${g.totalPlays} plays\n   \`${g.slug}\`\n\n`;
      });
      tgBot.sendMessage(chatId, text + `Всего: ${games.length}`, { parse_mode: 'Markdown' });
    },

    async online(chatId) {
      const oc = getOnlineCounts(), total = Object.values(oc).reduce((a, b) => a + b, 0);
      if (!total) return tgBot.sendMessage(chatId, 'Никого нет онлайн');
      let text = `*Онлайн: ${total}*\n\n`;
      for (const [slug, count] of Object.entries(oc).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1])) {
        const g = await Game.findOne({ slug }).select('name maxPlayers');
        text += `*${escTg(g?.name || slug)}*\n   \`${count}/${g?.maxPlayers || 20}\` [${makeBar(count / (g?.maxPlayers || 20) * 100)}]\n\n`;
      }
      tgBot.sendMessage(chatId, text + `Комнат: ${Object.keys(rooms).length}`, { parse_mode: 'Markdown' });
    },

    async top(chatId) {
      const games = await Game.find({ status: 'active' }).select('slug name totalPlays type').sort({ totalPlays: -1 }).limit(10);
      if (!games.length) return tgBot.sendMessage(chatId, 'Нет плейсов');
      let text = '*Топ-10*\n\n';
      games.forEach((g, i) => { text += `${i < 3 ? ['1st', '2nd', '3rd'][i] : `${i + 1}.`} *${escTg(g.name)}* — \`${g.totalPlays.toLocaleString()}\` plays\n\n`; });
      tgBot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    },

    async stats(chatId) {
      const [totalUsers, totalGames, totalStudio, pubStudio, totalMarket, totalPurchases] = await Promise.all([
        User.countDocuments(), Game.countDocuments({ status: 'active' }), StudioGame.countDocuments(),
        StudioGame.countDocuments({ status: 'public', published: true }), MarketItem.countDocuments({ active: true }), UserInventory.countDocuments()
      ]);
      const oc = getOnlineCounts(), totalOn = Object.values(oc).reduce((a, b) => a + b, 0);
      const playsAgg = await Game.aggregate([{ $match: { status: 'active' } }, { $group: { _id: null, total: { $sum: '$totalPlays' } } }]);
      const last24h = new Date(Date.now() - 86400000);
      const [newU, activeU] = await Promise.all([User.countDocuments({ createdAt: { $gte: last24h } }), User.countDocuments({ lastLogin: { $gte: last24h } })]);
      tgBot.sendMessage(chatId, `*Статистика Tublox*\n\nПользователей: \`${totalUsers}\` (+${newU} / active ${activeU})\nПлейсов: \`${totalGames}\` (студия: ${totalStudio}, pub: ${pubStudio})\nЗапусков: \`${(playsAgg[0]?.total || 0).toLocaleString()}\`\nОнлайн: \`${totalOn}\` | Комнат: \`${Object.keys(rooms).length}\`\nМаркет: \`${totalMarket}\` товаров, \`${totalPurchases}\` покупок\n\n_${new Date().toLocaleString('ru-RU', { timeZone: 'UTC' })} UTC_`, { parse_mode: 'Markdown' });
    },

    async place(chatId, slug) {
      if (!slug) return tgBot.sendMessage(chatId, 'Используй: `/place slug`', { parse_mode: 'Markdown' });
      const game = await Game.findOne({ slug, status: 'active' });
      if (!game) return tgBot.sendMessage(chatId, `\`${escTg(slug)}\` не найден`, { parse_mode: 'Markdown' });
      const oc = getOnlineCounts(), online = oc[slug] || 0;
      const players = [];
      for (const room of Object.values(rooms)) { if (room.place === slug) for (const p of Object.values(room.players)) players.push(p.username); }
      let author = 'Tublox';
      if (slug.startsWith('studio_')) { const sg = await StudioGame.findById(slug.replace('studio_', '')).select('ownerUsername'); if (sg) author = sg.ownerUsername; }
      const history = await OnlineHistory.find({ place: slug }).sort({ timestamp: -1 }).limit(12);
      let text = `*${escTg(game.name)}*\n\n${escTg(game.description || '-')}\nАвтор: *${escTg(author)}* | Тип: \`${game.type}\`\nЗапусков: \`${game.totalPlays}\` | Макс: \`${game.maxPlayers}\`\n\n*Online: ${online}/${game.maxPlayers}* Пик: \`${botStats.peakOnline[slug] || online}\`\n`;
      if (players.length) { text += '\n*Игроки:*\n'; players.forEach(p => { text += `  - \`${escTg(p)}\`\n`; }); }
      if (history.length) {
        text += '\n```\n';
        const rev = [...history].reverse(), maxC = Math.max(1, ...rev.map(h => h.playerCount));
        rev.forEach(h => { const t = new Date(h.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }); const b = Math.round((h.playerCount / maxC) * 12); text += `${t} ${'#'.repeat(b)}${'.'.repeat(12 - b)} ${h.playerCount}\n`; });
        text += '```';
      }
      tgBot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    },

    async history(chatId, slug) {
      if (!slug) return tgBot.sendMessage(chatId, 'Используй: `/history slug`', { parse_mode: 'Markdown' });
      const game = await Game.findOne({ slug }).select('name');
      if (!game) return tgBot.sendMessage(chatId, 'Не найден');
      const hist = await OnlineHistory.find({ place: slug }).sort({ timestamp: -1 }).limit(48);
      if (!hist.length) return tgBot.sendMessage(chatId, 'Нет данных');
      const rev = [...hist].reverse(), maxC = Math.max(1, ...rev.map(h => h.playerCount));
      const avg = Math.round(rev.reduce((a, h) => a + h.playerCount, 0) / rev.length);
      let text = `*${escTg(game.name)}* — история\nПик: \`${maxC}\` Средн: \`${avg}\`\n\n\`\`\`\n`;
      rev.slice(-24).forEach(h => { const t = new Date(h.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }); const b = Math.round((h.playerCount / maxC) * 16); text += `${t} ${'#'.repeat(b)}${'.'.repeat(16 - b)} ${h.playerCount}\n`; });
      tgBot.sendMessage(chatId, text + '```', { parse_mode: 'Markdown' });
    },

    async search(chatId, q) {
      if (!q) return tgBot.sendMessage(chatId, '`/search название`', { parse_mode: 'Markdown' });
      const games = await Game.find({ status: 'active', name: { $regex: q, $options: 'i' } }).select('slug name type totalPlays').limit(10);
      if (!games.length) return tgBot.sendMessage(chatId, `Ничего: "${escTg(q)}"`, { parse_mode: 'Markdown' });
      const oc = getOnlineCounts();
      let text = `*Поиск: "${escTg(q)}"*\n\n`;
      games.forEach((g, i) => { text += `${i + 1}. *${escTg(g.name)}* ${oc[g.slug] ? '[ON]' : '[--]'} \`${oc[g.slug] || 0}\` | ${g.totalPlays} plays\n   \`/place ${g.slug}\`\n\n`; });
      tgBot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    },

    async peak(chatId) {
      const peaks = Object.entries(botStats.peakOnline);
      if (!peaks.length) return tgBot.sendMessage(chatId, 'Нет данных');
      let text = '*Пики за сегодня*\n\n';
      for (const [slug, peak] of peaks.sort((a, b) => b[1] - a[1])) {
        const g = await Game.findOne({ slug }).select('name');
        text += `*${escTg(g?.name || slug)}*: \`${peak}\`\n`;
      }
      tgBot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    },

    async newGames(chatId) {
      const recent = await Game.find({ status: 'active' }).select('slug name type totalPlays createdAt').sort({ createdAt: -1 }).limit(10);
      if (!recent.length) return tgBot.sendMessage(chatId, 'Нет');
      let text = '*Новые плейсы*\n\n';
      for (const g of recent) {
        let author = 'Tublox';
        if (g.slug.startsWith('studio_')) { const sg = await StudioGame.findById(g.slug.replace('studio_', '')).select('ownerUsername'); if (sg) author = sg.ownerUsername; }
        text += `*${escTg(g.name)}* — ${escTg(author)} | ${g.totalPlays} plays\n   \`/place ${g.slug}\`\n\n`;
      }
      tgBot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    },

    async notify(chatId, msg) {
      let sub = await TgSubscriber.findOne({ chatId });
      if (!sub) sub = await TgSubscriber.create({ chatId, username: msg.from?.username || '' });
      const kb = { inline_keyboard: [
        [{ text: `${sub.notifications.newGames ? '[V]' : '[X]'} Новые игры`, callback_data: 'toggle_newGames' }],
        [{ text: `${sub.notifications.playerMilestones ? '[V]' : '[X]'} Вехи`, callback_data: 'toggle_playerMilestones' }],
        [{ text: `${sub.notifications.dailyStats ? '[V]' : '[X]'} Сводка`, callback_data: 'toggle_dailyStats' }],
        [{ text: sub.subscribed ? 'Отписаться' : 'Подписаться', callback_data: 'toggle_subscribe' }]
      ]};
      tgBot.sendMessage(chatId, '*Уведомления*', { parse_mode: 'Markdown', reply_markup: kb });
    }
  };

  tgBot.onText(/\/start/, m => cmds.start(m.chat.id, m).catch(() => {}));
  tgBot.onText(/\/places/, m => cmds.places(m.chat.id).catch(() => tgBot.sendMessage(m.chat.id, 'Ошибка')));
  tgBot.onText(/\/online/, m => cmds.online(m.chat.id).catch(() => tgBot.sendMessage(m.chat.id, 'Ошибка')));
  tgBot.onText(/\/top/, m => cmds.top(m.chat.id).catch(() => tgBot.sendMessage(m.chat.id, 'Ошибка')));
  tgBot.onText(/\/stats/, m => cmds.stats(m.chat.id).catch(() => tgBot.sendMessage(m.chat.id, 'Ошибка')));
  tgBot.onText(/\/place(?:\s+(.+))?/, (m, match) => cmds.place(m.chat.id, match[1]?.trim()).catch(() => tgBot.sendMessage(m.chat.id, 'Ошибка')));
  tgBot.onText(/\/history(?:\s+(.+))?/, (m, match) => cmds.history(m.chat.id, match[1]?.trim()).catch(() => tgBot.sendMessage(m.chat.id, 'Ошибка')));
  tgBot.onText(/\/search(?:\s+(.+))?/, (m, match) => cmds.search(m.chat.id, match[1]?.trim()).catch(() => tgBot.sendMessage(m.chat.id, 'Ошибка')));
  tgBot.onText(/\/peak/, m => cmds.peak(m.chat.id).catch(() => tgBot.sendMessage(m.chat.id, 'Ошибка')));
  tgBot.onText(/\/new/, m => cmds.newGames(m.chat.id).catch(() => tgBot.sendMessage(m.chat.id, 'Ошибка')));
  tgBot.onText(/\/notify/, m => cmds.notify(m.chat.id, m).catch(() => tgBot.sendMessage(m.chat.id, 'Ошибка')));
  tgBot.onText(/\/help/, m => tgBot.sendMessage(m.chat.id, '*TuStats*\n\n/places /online /top /stats\n/place slug /history slug /search запрос\n/peak /new /notify', { parse_mode: 'Markdown' }));

  tgBot.on('callback_query', async (q) => {
    const chatId = q.message.chat.id;
    try {
      let sub = await TgSubscriber.findOne({ chatId });
      if (!sub) sub = await TgSubscriber.create({ chatId });
      if (q.data === 'toggle_subscribe') { sub.subscribed = !sub.subscribed; await sub.save(); tgBot.answerCallbackQuery(q.id, { text: sub.subscribed ? 'ON' : 'OFF' }); }
      else if (q.data.startsWith('toggle_')) { const k = q.data.slice(7); if (sub.notifications[k] !== undefined) { sub.notifications[k] = !sub.notifications[k]; sub.markModified('notifications'); await sub.save(); } tgBot.answerCallbackQuery(q.id, { text: 'OK' }); }
      const kb = { inline_keyboard: [
        [{ text: `${sub.notifications.newGames ? '[V]' : '[X]'} Новые игры`, callback_data: 'toggle_newGames' }],
        [{ text: `${sub.notifications.playerMilestones ? '[V]' : '[X]'} Вехи`, callback_data: 'toggle_playerMilestones' }],
        [{ text: `${sub.notifications.dailyStats ? '[V]' : '[X]'} Сводка`, callback_data: 'toggle_dailyStats' }],
        [{ text: sub.subscribed ? 'Отписаться' : 'Подписаться', callback_data: 'toggle_subscribe' }]
      ]};
      tgBot.editMessageReplyMarkup(kb, { chat_id: chatId, message_id: q.message.message_id }).catch(() => {});
    } catch { tgBot.answerCallbackQuery(q.id, { text: 'Ошибка' }); }
  });

  async function broadcast(text, filter = {}) {
    const subs = await TgSubscriber.find({ subscribed: true, ...filter });
    let sent = 0;
    for (const sub of subs) {
      try { await tgBot.sendMessage(sub.chatId, text, { parse_mode: 'Markdown' }); sent++; if (sent % 25 === 0) await new Promise(r => setTimeout(r, 1000)); }
      catch (e) { if (e.response?.statusCode === 403) { sub.subscribed = false; await sub.save(); } }
    }
  }

  async function notifyNewGame(sg) {
    if (!TG_ENABLED || botStats.lastNotifiedGames.has(String(sg._id))) return;
    botStats.lastNotifiedGames.add(String(sg._id));
    await broadcast(`*Новый плейс*\n\n*${escTg(sg.title)}* by *${escTg(sg.ownerUsername)}*\n${escTg(sg.description || '-')}\n\n\`/place studio_${sg._id}\``, { 'notifications.newGames': true });
  }

  async function checkPlayMilestones(slug, total) {
    const ms = [100, 250, 500, 1000, 2500, 5000, 10000].find(m => total === m);
    if (!ms) return;
    const game = await Game.findOne({ slug }).select('name');
    if (!game) return;
    let author = 'Tublox';
    if (slug.startsWith('studio_')) { const sg = await StudioGame.findById(slug.replace('studio_', '')).select('ownerUsername'); if (sg) author = sg.ownerUsername; }
    await broadcast(`*${escTg(game.name)}* — *${ms.toLocaleString()}* plays!\nАвтор: *${escTg(author)}*\n\`/place ${slug}\``, { 'notifications.playerMilestones': true });
  }

  botStats.snapshotInterval = setInterval(async () => {
    try {
      const oc = getOnlineCounts();
      const ops = [];
      for (const [slug, count] of Object.entries(oc)) { ops.push({ place: slug, playerCount: count }); if (!botStats.peakOnline[slug] || count > botStats.peakOnline[slug]) botStats.peakOnline[slug] = count; }
      const activeGames = await Game.find({ status: 'active' }).select('slug');
      for (const g of activeGames) { if (!oc[g.slug]) ops.push({ place: g.slug, playerCount: 0 }); }
      if (ops.length) await OnlineHistory.insertMany(ops);
    } catch (e) { console.error('[Snapshot]', e); }
  }, 30 * 60 * 1000);

  botStats.notifyInterval = setInterval(async () => {
    const now = new Date();
    if (now.getUTCHours() !== 0 || now.getUTCMinutes() >= 5) return;
    try {
      const [totalUsers, totalGames] = await Promise.all([User.countDocuments(), Game.countDocuments({ status: 'active' })]);
      const yesterday = new Date(Date.now() - 86400000);
      const [newU, newG] = await Promise.all([User.countDocuments({ createdAt: { $gte: yesterday } }), Game.countDocuments({ createdAt: { $gte: yesterday }, status: 'active' })]);
      const playsAgg = await Game.aggregate([{ $match: { status: 'active' } }, { $group: { _id: null, total: { $sum: '$totalPlays' } } }]);
      const maxPeak = Math.max(0, ...Object.values(botStats.peakOnline));
      await broadcast(`*Сводка*\n${now.toLocaleDateString('ru-RU', { timeZone: 'UTC' })}\n\nUsers: \`${totalUsers}\`(+${newU}) Places: \`${totalGames}\`(+${newG})\nPlays: \`${(playsAgg[0]?.total || 0).toLocaleString()}\` Peak: \`${maxPeak}\``, { 'notifications.dailyStats': true });
      botStats.peakOnline = {};
    } catch (e) { console.error('[Daily]', e); }
  }, 5 * 60 * 1000);

  tgBot.on('polling_error', e => console.error('[TG]', e.message));
  tgBot.on('error', e => console.error('[TG]', e.message));
  console.log('[TG Bot] Ready');
  return { notifyNewGame, checkPlayMilestones, broadcast };
}

// ==================== PAGES ====================

const pages = {
  '/': 'landing', '/home': 'home', '/auth': 'auth', '/profile': 'profile', '/avatar': 'avatar',
  '/game': 'game', '/create': 'create', '/studio': 'studio', '/studio/edit': 'studio-editor', '/market': 'market'
};
for (const [route, page] of Object.entries(pages)) app.get(route, (_, res) => res.sendFile(path.join(__dirname, `public/pages/${page}.html`)));
app.get('/profile/:username', (_, res) => res.sendFile(path.join(__dirname, 'public/pages/profile.html')));
app.get('/games/:slug', (_, res) => res.sendFile(path.join(__dirname, 'public/pages/game-details.html')));
app.get('/market/:itemId', (_, res) => res.sendFile(path.join(__dirname, 'public/pages/market-item.html')));

// ==================== AUTH API ====================

app.post('/api/register', dbReady, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    if (username.length < 3 || username.length > 20) return res.status(400).json({ error: 'Username must be 3-20 chars' });
    if (password.length < 4) return res.status(400).json({ error: 'Password must be 4+ chars' });
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return res.status(400).json({ error: 'Letters, numbers, underscores only' });
    if (await User.findOne({ username: username.toLowerCase() })) return res.status(400).json({ error: 'Username taken' });
    const user = new User({ username: username.toLowerCase(), password: await bcrypt.hash(password, 10) });
    await user.save();
    const reward = await checkDailyReward(user);
    const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: false, maxAge: 604800000 });
    res.json({ success: true, username: user.username, dailyReward: reward });
  } catch (e) { console.error('[Register]', e); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/login', dbReady, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Fill all fields' });
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(400).json({ error: 'Invalid credentials' });
    user.lastLogin = new Date(); await user.save();
    const reward = await checkDailyReward(user);
    const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: false, maxAge: 604800000 });
    res.json({ success: true, username: user.username, dailyReward: reward });
  } catch (e) { console.error('[Login]', e); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/me', authMw, dbReady, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.status(404).json({ error: 'Not found' });
    const [reward, equipped] = await Promise.all([checkDailyReward(user), getEquippedMap(req.userId)]);
    res.json({ username: user.username, avatar: user.avatar, bio: user.bio, urus: user.urus, dailyStrikes: user.dailyStrikes, dailyReward: reward, gamesPlayed: user.gamesPlayed, createdAt: user.createdAt, lastLogin: user.lastLogin, equipped });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/logout', (_, res) => { res.clearCookie('token'); res.json({ success: true }); });

app.post('/api/avatar', authMw, async (req, res) => {
  try {
    const { bodyColor, headColor, eyeColor } = req.body;
    await User.findByIdAndUpdate(req.userId, { avatar: { bodyColor: bodyColor || '#FFFFFF', headColor: headColor || '#FFFFFF', eyeColor: eyeColor || '#000000' } });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/bio', authMw, async (req, res) => {
  try {
    const { bio } = req.body;
    if (bio && bio.length > 200) return res.status(400).json({ error: 'Too long' });
    await User.findByIdAndUpdate(req.userId, { bio: bio || '' });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/profile/:username', dbReady, async (req, res) => {
  try {
    const username = req.params.username.toLowerCase();
    const user = await User.findOne({ username }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    const [publishedRaw, equipped] = await Promise.all([
      StudioGame.find({ owner: user._id, status: 'public', published: true }).select('title description thumbnailData plays createdAt updatedAt').sort({ updatedAt: -1 }).limit(20),
      getEquippedMap(user._id)
    ]);
    const publishedGames = publishedRaw.map(g => ({ id: g._id, slug: `studio_${g._id}`, title: g.title, description: g.description, thumbnailData: g.thumbnailData, plays: g.plays, createdAt: g.createdAt, updatedAt: g.updatedAt }));
    let isOnline = false, currentGame = null;
    for (const room of Object.values(rooms)) { for (const p of Object.values(room.players)) { if (p.username === username) { isOnline = true; currentGame = room.place; break; } } if (isOnline) break; }
    res.json({ username: user.username, avatar: user.avatar, bio: user.bio, urus: user.urus, dailyStrikes: user.dailyStrikes, gamesPlayed: user.gamesPlayed, createdAt: user.createdAt, lastLogin: user.lastLogin, publishedGames, isOnline, currentGame, equipped });
  } catch (e) { console.error('[profile]', e); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/games/:slug/details', dbReady, async (req, res) => {
  try {
    const game = await Game.findOne({ slug: req.params.slug, status: 'active' }).select('slug name description type thumbnail totalPlays maxPlayers createdAt updatedAt');
    if (!game) return res.status(404).json({ error: 'Game not found' });
    let author = 'Tublox';
    if (req.params.slug.startsWith('studio_')) { const sg = await StudioGame.findById(req.params.slug.replace('studio_', '')).select('ownerUsername'); if (sg) author = sg.ownerUsername; }
    let onlineCount = 0;
    for (const room of Object.values(rooms)) { if (room.place === req.params.slug) onlineCount += Object.keys(room.players).length; }
    res.json({ ...game.toObject(), author, onlineCount });
  } catch (e) { console.error('[game-details]', e); res.status(500).json({ error: 'Server error' }); }
});

// ==================== GAMES API ====================

app.get('/api/games', dbReady, async (_, res) => {
  try { res.json(await Game.find({ status: { $ne: 'disabled' } }).select('slug name description type status thumbnail order totalPlays maxPlayers').sort({ order: 1 })); }
  catch { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/games/:slug', dbReady, async (req, res) => {
  try {
    const game = await Game.findOne({ slug: req.params.slug, status: 'active' });
    if (!game) return res.status(404).json({ error: 'Game not found' });
    res.json(game);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/online', (_, res) => { res.json(getOnlineCounts()); });
app.get('/api/assets', (_, res) => { res.json(ASSET_STORE); });

// ==================== STUDIO API ====================

app.get('/api/studio/my-games', authMw, dbReady, async (req, res) => {
  try { res.json(await StudioGame.find({ owner: req.userId }).select('title description thumbnailData status plays published publishedAt createdAt updatedAt').sort({ updatedAt: -1 })); }
  catch { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/studio/create', authMw, dbReady, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('username');
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (await StudioGame.countDocuments({ owner: req.userId }) >= 20) return res.status(400).json({ error: 'Max 20 games' });
    const game = new StudioGame({
      owner: req.userId, ownerUsername: user.username, title: 'Untitled Game',
      blocks: [{ id: 'block_' + Date.now(), x: 0, y: 500, w: 2400, h: 40, color: '#333333', opacity: 1 }],
      items: [], models: [], avatars: [],
      settings: { gravity: 0.6, playerSpeed: 4, jumpForce: -12, spawnX: 100, spawnY: 400, bgColor: '#0a0a0a', worldWidth: 2400, worldHeight: 600 }
    });
    await game.save();
    res.json({ success: true, gameId: game._id });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/studio/game/:id', authMw, dbReady, async (req, res) => {
  try {
    const game = await StudioGame.findOne({ _id: req.params.id, owner: req.userId });
    if (!game) return res.status(404).json({ error: 'Game not found' });
    res.json(game);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/studio/save/:id', authMw, dbReady, async (req, res) => {
  try {
    const game = await StudioGame.findOne({ _id: req.params.id, owner: req.userId });
    if (!game) return res.status(404).json({ error: 'Game not found' });
    const { title, description, blocks, items, models, avatars, settings, thumbnailData } = req.body;
    if (title !== undefined) game.title = String(title).substring(0, 50);
    if (description !== undefined) game.description = String(description).substring(0, 200);
    if (Array.isArray(blocks)) game.blocks = blocks;
    if (Array.isArray(items)) game.items = items;
    if (Array.isArray(models)) game.models = models;
    if (Array.isArray(avatars)) game.avatars = avatars;
    if (settings && typeof settings === 'object') game.settings = settings;
    if (thumbnailData) game.thumbnailData = thumbnailData.substring(0, 200000);
    game.updatedAt = new Date();
    for (const f of ['blocks', 'items', 'models', 'avatars', 'settings']) game.markModified(f);
    await game.save();
    if (game.published && game.status === 'public') await syncStudioToLiveGame(game);
    res.json({ success: true });
  } catch (e) { console.error('[Save]', e); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/studio/publish/:id', authMw, dbReady, async (req, res) => {
  try {
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
    game.markModified('avatars');
    await game.save();
    if (status === 'public') {
      await syncStudioToLiveGame(game);
      if (tgBotFunctions) tgBotFunctions.notifyNewGame(game).catch(() => {});
    } else { await Game.deleteOne({ slug: `studio_${game._id}` }); clearPlaceCache(`studio_${game._id}`); }
    res.json({ success: true, status: game.status, published: game.published });
  } catch (e) { console.error('[Publish]', e); res.status(500).json({ error: 'Server error' }); }
});

async function syncStudioToLiveGame(game) {
  const slug = `studio_${game._id}`;
  const gi = Array.isArray(game.items) ? game.items : [];
  const gm = Array.isArray(game.models) ? game.models : [];
  const ga = Array.isArray(game.avatars) ? game.avatars : [];
  const gs = game.settings || {};
  const spawnItems = gi.filter(i => i?.giveOnStart);
  const collectibleItems = gi.filter(i => i && !i.giveOnStart && i.collectOnTouch !== false);

  const platforms = (Array.isArray(game.blocks) ? game.blocks : []).map(b => ({
    x: b.x, y: b.y, w: b.w, h: b.h, color: b.color, opacity: b.opacity,
    text: b.text, textFont: b.textFont, textSize: b.textSize, textColor: b.textColor
  }));

  const avatars = ga.map(av => {
    const avatarData = {
      id: av.id, x: av.x, y: av.y, w: av.w || 22, h: av.h || 34,
      direction: av.direction || 1, defaultAnim: av.defaultAnim || 'idle',
      animSpeed: av.animSpeed || 1, loop: av.loop !== false,
      interactive: av.interactive || false, usePlayerAvatar: av.usePlayerAvatar || false,
      bodyColor: av.bodyColor || '#ffffff', headColor: av.headColor || '#ffffff',
      eyeColor: av.eyeColor || '#000000', npcName: av.npcName || '',
      keyframes: (av.keyframes || []).map(kf => ({
        time: kf.time || 0, duration: kf.duration || 0.5, pose: kf.pose || 'idle',
        dx: kf.dx || 0, dy: kf.dy || 0, dir: kf.dir || 0, easing: kf.easing || 'linear'
      })),
      properties: av.properties || {}
    };

    // Include dialogue data if interactive
    if (av.interactive && av.dialogue) {
      avatarData.dialogue = {
        triggerKey: av.dialogue.triggerKey || 'E',
        triggerRadius: av.dialogue.triggerRadius || 80,
        oneTime: av.dialogue.oneTime || false,
        npcName: av.dialogue.npcName || '',
        nameColor: av.dialogue.nameColor || '#a78bfa',
        typingSpeed: av.dialogue.typingSpeed || 30,
        lines: (av.dialogue.lines || []).map(line => ({
          speaker: line.speaker || 'npc',
          text: line.text || '',
          emotion: line.emotion || 'neutral',
          effect: line.effect || 'normal',
          speed: line.speed || 30
        })),
        hasChoices: av.dialogue.hasChoices || false,
        choiceAfterLine: av.dialogue.choiceAfterLine || 1,
        choicePrompt: av.dialogue.choicePrompt || '',
        choices: (av.dialogue.choices || []).map(choice => ({
          text: choice.text || '',
          action: choice.action || 'continue',
          jumpTo: choice.jumpTo || 1,
          itemId: choice.itemId || '',
          varName: choice.varName || '',
          varValue: choice.varValue || ''
        })),
        endAction: av.dialogue.endAction || 'none',
        endActionParams: av.dialogue.endActionParams || {},
        hasCondition: av.dialogue.hasCondition || false,
        conditionType: av.dialogue.conditionType || 'has_item',
        conditionParams: av.dialogue.conditionParams || {},
        conditionFailText: av.dialogue.conditionFailText || ''
      };
    }

    return avatarData;
  });

  const gameConfig = {
    gravity: gs.gravity || 0.6, maxFallSpeed: 12, playerSpeed: gs.playerSpeed || 4, jumpForce: gs.jumpForce || -12,
    spawnX: gs.spawnX || 100, spawnY: gs.spawnY || 400,
    platforms, checkpoints: [], items: {},
    spawnItems: spawnItems.map(i => ({ type: i.type, properties: i.properties || {} })),
    collectibleItems: collectibleItems.map(i => ({ type: i.type, x: i.x, y: i.y, properties: i.properties || {}, collectOnTouch: i.collectOnTouch !== false })),
    models: gm.map(m => ({ id: m.id, type: m.type, x: m.x, y: m.y, w: m.w || 40, h: m.h || 80, properties: m.properties || {} })),
    avatars,
    settings: gs
  };
  gi.forEach(i => { if (i && !gameConfig.items[i.type]) { const asset = ASSET_STORE.find(a => a.id === i.type); gameConfig.items[i.type] = { name: asset?.name || i.type, ...(i.properties || {}) }; } });

  const td = { style: game.thumbnailData ? 'custom' : 'default', label: game.title.toUpperCase(), sublabel: `by ${game.ownerUsername}`, customImage: game.thumbnailData || '' };

  await Game.findOneAndUpdate({ slug }, {
    slug, name: game.title, description: game.description || `by ${game.ownerUsername}`,
    type: 'platformer', status: 'active', thumbnail: td, config: gameConfig,
    maxPlayers: 20, updatedAt: new Date(),
    $setOnInsert: { order: 100 + Math.floor(Math.random() * 900), createdAt: new Date() }
  }, { upsert: true, new: true });
  clearPlaceCache(slug);
}

app.delete('/api/studio/game/:id', authMw, dbReady, async (req, res) => {
  try {
    const game = await StudioGame.findOne({ _id: req.params.id, owner: req.userId });
    if (!game) return res.status(404).json({ error: 'Game not found' });
    await Promise.all([Game.deleteOne({ slug: `studio_${game._id}` }), StudioGame.deleteOne({ _id: game._id })]);
    clearPlaceCache(`studio_${game._id}`);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// ==================== MARKET API ====================

app.get('/api/market/captcha-key', (_, res) => { res.json({ sitekey: HCAPTCHA_SITEKEY }); });

app.get('/api/market/items', dbReady, async (req, res) => {
  try {
    const { category, sort, search, rarity } = req.query;
    const filter = { active: true };
    if (category && category !== 'all') filter.category = category;
    if (rarity && rarity !== 'all') filter.rarity = rarity;
    if (search) filter.name = { $regex: search, $options: 'i' };
    const sortMap = { price_low: { price: 1 }, price_high: { price: -1 }, newest: { createdAt: -1 }, popular: { sold: -1 } };
    res.json(await MarketItem.find(filter).select('name description category subcategory price rarity thumbnail drawData colors isLimited stock sold creatorName featured tags createdAt').sort(sortMap[sort] || { featured: -1, createdAt: -1 }).limit(100));
  } catch (e) { console.error('[market]', e); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/market/item/:id', dbReady, async (req, res) => {
  try {
    const item = await MarketItem.findOne({ _id: req.params.id, active: true });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/market/buy/:id', authMw, dbReady, async (req, res) => {
  try {
    const { captchaToken, selectedColor } = req.body;
    if (!(await verifyHCaptcha(captchaToken))) return res.status(400).json({ error: 'Captcha failed' });
    const item = await MarketItem.findOne({ _id: req.params.id, active: true });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (await UserInventory.findOne({ userId: req.userId, itemId: item._id })) return res.status(400).json({ error: 'Already owned' });
    if (item.isLimited && item.stock !== -1 && item.sold >= item.stock) return res.status(400).json({ error: 'Sold out' });
    const user = await User.findById(req.userId);
    if (!user || user.urus < item.price) return res.status(400).json({ error: 'Not enough Urus' });
    user.urus -= item.price; await user.save();
    await new UserInventory({ userId: req.userId, itemId: item._id, color: selectedColor || item.colors?.[0] || '' }).save();
    item.sold += 1; await item.save();
    res.json({ success: true, newBalance: user.urus, itemName: item.name });
  } catch (e) { if (e.code === 11000) return res.status(400).json({ error: 'Already owned' }); console.error('[buy]', e); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/market/inventory', authMw, dbReady, async (req, res) => {
  try {
    const [inventory, equip] = await Promise.all([
      UserInventory.find({ userId: req.userId }).populate('itemId', 'name description category subcategory price rarity thumbnail drawData colors creatorName').sort({ purchasedAt: -1 }),
      UserEquip.findOne({ userId: req.userId })
    ]);
    res.json({ items: inventory.filter(i => i.itemId).map(i => ({ inventoryId: i._id, item: i.itemId, purchasedAt: i.purchasedAt, equipped: i.equipped, color: i.color })), equipped: equip || {} });
  } catch (e) { console.error('[inventory]', e); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/market/equip', authMw, dbReady, async (req, res) => {
  try {
    const { itemId, action, color } = req.body;
    const item = await MarketItem.findById(itemId);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    let equip = await UserEquip.findOne({ userId: req.userId });
    if (!equip) equip = new UserEquip({ userId: req.userId });

    if (action === 'unequip') {
      equip[item.category] = null;
      const ck = item.category + 'Color';
      if (equip[ck] !== undefined) equip[ck] = '';
      equip.updatedAt = new Date(); await equip.save();
      await UserInventory.updateOne({ userId: req.userId, itemId }, { equipped: false });
      return res.json({ success: true });
    }

    if (!(await UserInventory.findOne({ userId: req.userId, itemId }))) return res.status(400).json({ error: 'Not owned' });
    if (equip[item.category]) await UserInventory.updateOne({ userId: req.userId, itemId: equip[item.category] }, { equipped: false });
    equip[item.category] = item._id;
    const ck = item.category + 'Color';
    if (color && equip[ck] !== undefined) equip[ck] = color;
    equip.updatedAt = new Date(); await equip.save();
    await UserInventory.updateOne({ userId: req.userId, itemId }, { equipped: true, ...(color ? { color } : {}) });
    res.json({ success: true });
  } catch (e) { console.error('[equip]', e); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/market/equipped/:username', dbReady, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username.toLowerCase() });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(await getEquippedMap(user._id));
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// ==================== ADMIN ====================

app.post('/api/admin/market/seed', authMw, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.username !== 'today_idk') return res.status(403).json({ error: 'Forbidden' });
    if (await MarketItem.countDocuments() > 0) return res.json({ message: 'Already seeded' });
    const seedItems = [
      { name: 'Basic Tee', description: 'Simple t-shirt', category: 'shirt', price: 5, rarity: 'common', colors: ['#FFFFFF','#222222','#EF4444','#3B82F6','#22C55E','#EAB308','#A855F7'], drawData: { type: 'basic_tee' }, tags: ['basic'] },
      { name: 'Hoodie', description: 'Cozy hoodie', category: 'shirt', price: 15, rarity: 'uncommon', colors: ['#333333','#1a1a2e','#4B0082','#8B0000','#006400'], drawData: { type: 'hoodie' }, tags: ['warm'] },
      { name: 'Jacket', description: 'Leather jacket', category: 'shirt', price: 25, rarity: 'rare', colors: ['#222222','#8B4513','#1a1a1a'], drawData: { type: 'jacket' }, tags: ['cool'] },
      { name: 'Stripe Shirt', description: 'Striped shirt', category: 'shirt', price: 10, rarity: 'common', colors: ['#FF4444','#4488FF','#44CC44','#FFAA00'], drawData: { type: 'stripe_shirt' }, tags: ['stripes'] },
      { name: 'Gold Armor', description: 'Golden chestplate', category: 'shirt', price: 100, rarity: 'legendary', colors: ['#FFD700'], drawData: { type: 'gold_armor' }, tags: ['armor'], featured: true, isLimited: true, stock: 50 },
      { name: 'Tank Top', description: 'Simple tank top', category: 'shirt', price: 3, rarity: 'common', colors: ['#FFFFFF','#222222','#EF4444','#3B82F6'], drawData: { type: 'tank_top' }, tags: ['basic'] },
      { name: 'Jeans', description: 'Blue jeans', category: 'pants', price: 8, rarity: 'common', colors: ['#1a3a5c','#222222','#4a4a4a'], drawData: { type: 'jeans' }, tags: ['basic'] },
      { name: 'Shorts', description: 'Comfortable shorts', category: 'pants', price: 5, rarity: 'common', colors: ['#333333','#8B4513','#2d5016'], drawData: { type: 'shorts' }, tags: ['casual'] },
      { name: 'Cargo Pants', description: 'Tactical cargo', category: 'pants', price: 12, rarity: 'uncommon', colors: ['#2d3319','#333333','#4a3728'], drawData: { type: 'cargo' }, tags: ['tactical'] },
      { name: 'Sweatpants', description: 'Comfy sweats', category: 'pants', price: 6, rarity: 'common', colors: ['#333333','#555555','#1a1a2e'], drawData: { type: 'sweatpants' }, tags: ['comfy'] },
      { name: 'Royal Legs', description: 'Royal leggings', category: 'pants', price: 80, rarity: 'legendary', colors: ['#4B0082'], drawData: { type: 'royal_legs' }, tags: ['royal'], featured: true, isLimited: true, stock: 30 },
      { name: 'Smile', description: 'Happy face', category: 'face', price: 10, rarity: 'common', drawData: { type: 'smile' }, tags: ['happy'] },
      { name: 'Cool Face', description: 'Sunglasses', category: 'face', price: 20, rarity: 'uncommon', drawData: { type: 'cool' }, tags: ['cool'] },
      { name: 'Angry', description: 'Fierce', category: 'face', price: 12, rarity: 'common', drawData: { type: 'angry' }, tags: ['angry'] },
      { name: 'Wink', description: 'Playful', category: 'face', price: 15, rarity: 'uncommon', drawData: { type: 'wink' }, tags: ['playful'] },
      { name: 'Robot Face', description: 'Digital', category: 'face', price: 50, rarity: 'epic', drawData: { type: 'robot' }, tags: ['robot'], featured: true },
      { name: 'Skull', description: 'Spooky', category: 'face', price: 35, rarity: 'rare', drawData: { type: 'skull' }, tags: ['spooky'] },
      { name: 'Spiky Hair', description: 'Spiky', category: 'hair', price: 15, rarity: 'common', colors: ['#222222','#8B4513','#FFD700','#FF4444','#FFFFFF'], drawData: { type: 'spiky' }, tags: ['spiky'] },
      { name: 'Long Hair', description: 'Flowing', category: 'hair', price: 18, rarity: 'uncommon', colors: ['#222222','#8B4513','#FFD700','#FF6B6B','#A855F7'], drawData: { type: 'long' }, tags: ['long'] },
      { name: 'Mohawk', description: 'Punk', category: 'hair', price: 22, rarity: 'uncommon', colors: ['#FF4444','#22C55E','#A855F7','#3B82F6','#222222'], drawData: { type: 'mohawk' }, tags: ['punk'] },
      { name: 'Curly', description: 'Afro', category: 'hair', price: 16, rarity: 'common', colors: ['#222222','#8B4513','#4a3728'], drawData: { type: 'curly' }, tags: ['curly'] },
      { name: 'Fire Hair', description: 'Flame', category: 'hair', price: 120, rarity: 'legendary', colors: ['#FF4500'], drawData: { type: 'fire' }, tags: ['fire'], featured: true, isLimited: true, stock: 20 },
      { name: 'Baseball Cap', description: 'Classic', category: 'hat', price: 8, rarity: 'common', colors: ['#222222','#EF4444','#3B82F6','#22C55E','#FFFFFF'], drawData: { type: 'baseball_cap' }, tags: ['cap'] },
      { name: 'Top Hat', description: 'Fancy', category: 'hat', price: 30, rarity: 'rare', colors: ['#222222','#4B0082'], drawData: { type: 'top_hat' }, tags: ['fancy'] },
      { name: 'Crown', description: 'Golden', category: 'hat', price: 150, rarity: 'legendary', colors: ['#FFD700'], drawData: { type: 'crown' }, tags: ['royal'], featured: true, isLimited: true, stock: 10 },
      { name: 'Beanie', description: 'Knit', category: 'hat', price: 10, rarity: 'common', colors: ['#333333','#EF4444','#3B82F6','#22C55E'], drawData: { type: 'beanie' }, tags: ['warm'] },
      { name: 'Ninja Headband', description: 'Stealth', category: 'hat', price: 20, rarity: 'uncommon', colors: ['#222222','#EF4444','#3B82F6'], drawData: { type: 'ninja_headband' }, tags: ['ninja'] },
      { name: 'Backpack', description: 'Adventure', category: 'accessory', price: 12, rarity: 'common', colors: ['#2d5016','#333333','#8B4513'], drawData: { type: 'backpack' }, tags: ['adventure'] },
      { name: 'Wings', description: 'Angel', category: 'accessory', price: 60, rarity: 'epic', colors: ['#FFFFFF','#222222','#FFD700'], drawData: { type: 'wings' }, tags: ['wings'], featured: true },
      { name: 'Cape', description: 'Hero', category: 'accessory', price: 25, rarity: 'rare', colors: ['#EF4444','#3B82F6','#222222','#4B0082'], drawData: { type: 'cape' }, tags: ['hero'] },
      { name: 'Scarf', description: 'Winter', category: 'accessory', price: 8, rarity: 'common', colors: ['#EF4444','#3B82F6','#22C55E','#FFFFFF','#333333'], drawData: { type: 'scarf' }, tags: ['warm'] },
      { name: 'Necklace', description: 'Pendant', category: 'accessory', price: 18, rarity: 'uncommon', colors: ['#FFD700','#C0C0C0','#CD7F32'], drawData: { type: 'necklace' }, tags: ['jewelry'] },
      { name: 'Robot Arms', description: 'Mechanical', category: 'body_part', price: 40, rarity: 'rare', colors: ['#888888','#444444'], drawData: { type: 'robot_arms' }, tags: ['robot'] },
      { name: 'Claws', description: 'Monster', category: 'body_part', price: 35, rarity: 'rare', colors: ['#333333','#8B4513'], drawData: { type: 'claws' }, tags: ['monster'] },
      { name: 'Tail', description: 'Animal', category: 'body_part', price: 20, rarity: 'uncommon', colors: ['#8B4513','#FFD700','#FFFFFF','#333333'], drawData: { type: 'tail' }, tags: ['animal'] },
    ];
    await MarketItem.insertMany(seedItems);
    res.json({ success: true, count: seedItems.length });
  } catch (e) { console.error('[seed]', e); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/admin/market/add', authMw, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.username !== 'today_idk') return res.status(403).json({ error: 'Forbidden' });
    const item = new MarketItem(req.body); await item.save();
    res.json({ success: true, id: item._id });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/admin/give-urus', authMw, async (req, res) => {
  try {
    const admin = await User.findById(req.userId);
    if (!admin || admin.username !== 'today_idk') return res.status(403).json({ error: 'Forbidden' });
    const { username, amount } = req.body;
    const target = await User.findOne({ username: (username || admin.username).toLowerCase() });
    if (!target) return res.status(404).json({ error: 'User not found' });
    target.urus += (amount || 0); await target.save();
    res.json({ success: true, username: target.username, newBalance: target.urus });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// ==================== TIME API ====================

let timerOffsetMs = 0;
const STUDIO_TARGET = Date.UTC(2026, 1, 14, 9, 25, 30, 0);
app.get('/api/time', (_, res) => { res.json({ remainingMs: (STUDIO_TARGET + timerOffsetMs) - Date.now(), serverNow: Date.now(), offsetMs: timerOffsetMs }); });

// ==================== GAME WORLDS ====================

const PLACES_CACHE = {};
async function getPlaceConfig(slug) {
  if (PLACES_CACHE[slug]) return PLACES_CACHE[slug];
  const game = await Game.findOne({ slug, status: 'active' });
  if (!game) return null;
  const c = game.config;
  const pd = {
    name: game.name, type: game.type, gravity: c.gravity, maxFallSpeed: c.maxFallSpeed,
    playerSpeed: c.playerSpeed, jumpForce: c.jumpForce, spawnX: c.spawnX, spawnY: c.spawnY,
    platforms: c.platforms || [], checkpoints: c.checkpoints || [], items: c.items || {},
    maxPlayers: game.maxPlayers, spawnItems: c.spawnItems || [], collectibleItems: c.collectibleItems || [],
    models: c.models || [], avatars: c.avatars || [], settings: c.settings || {},
    blocks: c.platforms || []
  };
  PLACES_CACHE[slug] = pd;
  return pd;
}
function clearPlaceCache(slug) { delete PLACES_CACHE[slug]; }

// ==================== MULTIPLAYER ====================

const rooms = {}, playerRooms = {}, activeUserSessions = {};

function getOrCreateRoom(placeName, maxPlayers = 20) {
  for (const [roomId, room] of Object.entries(rooms)) { if (room.place === placeName && Object.keys(room.players).length < maxPlayers) return roomId; }
  const roomId = `${placeName}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  rooms[roomId] = { players: {}, place: placeName };
  return roomId;
}

function removePlayerFromAllRooms(socketId) {
  const roomId = playerRooms[socketId];
  if (roomId && rooms[roomId]) {
    delete rooms[roomId].players[socketId];
    io.to(roomId).emit('player-left', { id: socketId });
    if (Object.keys(rooms[roomId].players).length === 0) delete rooms[roomId];
  }
  delete playerRooms[socketId];
}

io.on('connection', (socket) => {
  socket.on('join-game', async (data) => {
    try {
      if (mongoose.connection.readyState !== 1) return socket.emit('error-msg', 'Server starting up');
      const { token, place } = data;
      if (!token || !place) return;
      let decoded;
      try { decoded = jwt.verify(token, JWT_SECRET); } catch { return socket.emit('error-msg', 'Invalid token'); }
      const [user, placeData] = await Promise.all([
        User.findById(decoded.userId).select('-password'),
        getPlaceConfig(place)
      ]);
      if (!user) return socket.emit('error-msg', 'User not found');
      if (!placeData) return socket.emit('error-msg', 'TuGame not found');

      const oldSid = activeUserSessions[decoded.userId];
      if (oldSid && oldSid !== socket.id) { const o = io.sockets.sockets.get(oldSid); if (o) { o.emit('kicked', 'Joined from another tab'); removePlayerFromAllRooms(oldSid); o.disconnect(true); } }
      if (playerRooms[socket.id]) removePlayerFromAllRooms(socket.id);
      activeUserSessions[decoded.userId] = socket.id;
      socket._userId = decoded.userId;

      user.gamesPlayed += 1; await user.save();
      await Game.updateOne({ slug: place }, { $inc: { totalPlays: 1 } });
      if (tgBotFunctions) { const g = await Game.findOne({ slug: place }).select('totalPlays'); if (g) tgBotFunctions.checkPlayMilestones(place, g.totalPlays).catch(() => {}); }

      const roomId = getOrCreateRoom(place, placeData.maxPlayers);
      socket.join(roomId);
      playerRooms[socket.id] = roomId;

      let inventory = [null, null, null, null];
      if (placeData.spawnItems?.length) {
        placeData.spawnItems.forEach((si, i) => { if (i < 4 && si) { const asset = ASSET_STORE.find(a => a.id === si.type); inventory[i] = { id: si.type, name: asset?.name || si.type, ...(si.properties || {}) }; } });
      }
      if (placeData.type === 'pvp' && placeData.items?.sword && !inventory.some(i => i?.id === 'sword')) {
        const es = inventory.indexOf(null);
        if (es !== -1) inventory[es] = { id: 'sword', name: 'Sword', damage: placeData.items.sword.damage || 20, range: placeData.items.sword.range || 50, cooldown: placeData.items.sword.cooldown || 500 };
      }

      const equipped = await getEquippedMap(decoded.userId);

      const playerData = {
        id: socket.id, username: user.username,
        x: placeData.spawnX, y: placeData.spawnY, vx: 0, vy: 0,
        width: 32, height: 48, onGround: false, direction: 1, state: 'idle', frame: 0,
        checkpoint: { x: placeData.spawnX, y: placeData.spawnY }, currentCheckpointIndex: -1,
        avatar: user.avatar, hp: 100, maxHp: 100,
        inventory, activeSlot: 0, attacking: false, lastAttackTime: 0, equipped
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
    const now = Date.now(), item = atk.inventory[atk.activeSlot];
    if (!item || item.id !== 'sword' || now - atk.lastAttackTime < (item.cooldown || 500)) return;
    atk.lastAttackTime = now; atk.attacking = true; setTimeout(() => { atk.attacking = false; }, 300);
    const placeData = await getPlaceConfig(rooms[roomId].place);
    for (const [id, target] of Object.entries(rooms[roomId].players)) {
      if (id === socket.id) continue;
      const dx = target.x - atk.x, dy = target.y - atk.y, dist = Math.sqrt(dx * dx + dy * dy);
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
    const p = rooms[roomId].players[socket.id];
    if (p) p.checkpoint = { x: data.x, y: data.y };
  });

  socket.on('chat-message', (data) => {
    const roomId = playerRooms[socket.id]; if (!roomId || !rooms[roomId]) return;
    const p = rooms[roomId].players[socket.id];
    if (!p || !data.msg?.trim() || data.msg.length > 200) return;
    io.to(roomId).emit('chat-message', { username: p.username, msg: data.msg.trim() });
  });

  socket.on('switch-slot', (data) => {
    const roomId = playerRooms[socket.id]; if (!roomId || !rooms[roomId]) return;
    const p = rooms[roomId].players[socket.id];
    if (p && typeof data.slot === 'number' && data.slot >= 0 && data.slot < 4) p.activeSlot = data.slot;
  });

  socket.on('studio-join', async (data) => {
    try {
      if (!data.token || mongoose.connection.readyState !== 1) return;
      const decoded = jwt.verify(data.token, JWT_SECRET);
      const user = await User.findById(decoded.userId).select('username');
      if (!user) return;
      socket._studioUser = user.username; socket.join('studio-room');
      socket.emit('studio-sync', { offsetMs: timerOffsetMs, remainingMs: (STUDIO_TARGET + timerOffsetMs) - Date.now(), isAdmin: user.username === 'today_idk' });
    } catch {}
  });

  socket.on('studio-adjust-time', (data) => {
    if (!socket._studioUser || socket._studioUser !== 'today_idk') return;
    const { action, amount } = data; if (!action) return;
    const ms = parseInt(amount); if (isNaN(ms)) return;
    const map = { 'add-hours': 3600000, 'sub-hours': -3600000, 'add-minutes': 60000, 'sub-minutes': -60000, 'add-seconds': 1000, 'sub-seconds': -1000 };
    if (action === 'reset') timerOffsetMs = 0;
    else if (map[action]) timerOffsetMs += map[action] * ms;
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
    console.log('[DB] Connected');
    tgBotFunctions = initTelegramBot();
    server.listen(PORT, () => console.log(`[Tublox3] http://localhost:${PORT}`));
  } catch (err) { console.error('[DB] Failed:', err.message); process.exit(1); }
}
mongoose.connection.on('disconnected', () => console.warn('[DB] Disconnected'));
mongoose.connection.on('error', e => console.error('[DB]', e.message));
start();