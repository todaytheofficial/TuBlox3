// get-access.js
// Запустить один раз: node get-access.js

const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://Today_Idk:TpdauT434odayTodayToday23@cluster0.rlgkop5.mongodb.net/tublox3?retryWrites=true&w=majority&appName=Cluster0';
const TARGET_USERNAME = 'today_idk';

// ===== Нужно ОПРЕДЕЛИТЬ схемы, а не просто вызывать mongoose.model() =====

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  avatar: mongoose.Schema.Types.Mixed,
  bio: String,
  urus: Number,
  dailyStrikes: Number,
  lastDailyReward: Date,
  gamesPlayed: Number,
  createdAt: Date,
  lastLogin: Date
});
const User = mongoose.model('User', userSchema);

// В server.js нет модели "Place" — игры студии хранятся в "StudioGame"
const studioGameSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  ownerUsername: String,
  title: String,
  description: String,
  editors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  status: String,
  published: Boolean,
  blocks: Array,
  items: Array,
  models: Array,
  avatars: Array,
  settings: mongoose.Schema.Types.Mixed,
  plays: Number,
  createdAt: Date,
  updatedAt: Date
});
const StudioGame = mongoose.model('StudioGame', studioGameSchema);

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const user = await User.findOne({ username: TARGET_USERNAME });
  if (!user) {
    console.log(`User "${TARGET_USERNAME}" not found`);
    process.exit(1);
  }

  console.log(`Found user: ${user.username} (${user._id})`);

  // Берём ВСЕ студийные игры (коллекция "studiogames" в MongoDB)
  const games = await StudioGame.find({});
  console.log(`Total studio games: ${games.length}`);

  let updated = 0;

  for (const game of games) {
    // Не трогаем если уже владелец
    if (game.owner && game.owner.toString() === user._id.toString()) {
      console.log(`  [SKIP] "${game.title}" — already owner`);
      continue;
    }

    // Инициализируем editors если нет
    if (!game.editors) game.editors = [];

    const alreadyEditor = game.editors.some(
      e => e.toString() === user._id.toString()
    );

    if (alreadyEditor) {
      console.log(`  [SKIP] "${game.title}" — already editor`);
      continue;
    }

    game.editors.push(user._id);
    await game.save();
    updated++;
    console.log(`  [ADDED] "${game.title}" — added as editor`);
  }

  console.log(`\nDone. Updated ${updated} games.`);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});