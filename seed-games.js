const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://Today_Idk:TpdauT434odayTodayToday23@cluster0.rlgkop5.mongodb.net/tublox3?retryWrites=true&w=majority&appName=Cluster0';

const gameSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  type: { type: String, required: true },
  status: { type: String, default: 'active' },
  thumbnail: {
    style: { type: String, default: 'default' },
    bgColor: { type: String, default: '#080808' },
    label: { type: String, default: '' },
    sublabel: { type: String, default: '' }
  },
  config: { type: mongoose.Schema.Types.Mixed, default: {} },
  maxPlayers: { type: Number, default: 20 },
  order: { type: Number, default: 0 },
  totalPlays: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Game = mongoose.model('Game', gameSchema);

const games = [
  {
    slug: 'platformer',
    name: 'Platformer',
    description: 'Classic platformer with checkpoints',
    type: 'platformer',
    status: 'active',
    thumbnail: {
      style: 'platformer',
      bgColor: '#080808',
      label: 'PLATFORMER',
      sublabel: 'Jump · Run · Explore'
    },
    config: {
      gravity: 0.6,
      maxFallSpeed: 12,
      playerSpeed: 4,
      jumpForce: -12,
      spawnX: 100,
      spawnY: 200,
      platforms: [
        { x: 0, y: 500, w: 2400, h: 40, color: '#333333' },
        { x: 150, y: 400, w: 160, h: 20, color: '#444444' },
        { x: 400, y: 340, w: 160, h: 20, color: '#444444' },
        { x: 650, y: 280, w: 160, h: 20, color: '#444444' },
        { x: 350, y: 200, w: 120, h: 20, color: '#555555' },
        { x: 900, y: 400, w: 200, h: 20, color: '#444444' },
        { x: 1100, y: 320, w: 150, h: 20, color: '#444444' },
        { x: 1300, y: 250, w: 180, h: 20, color: '#555555' },
        { x: 1550, y: 380, w: 140, h: 20, color: '#444444' },
        { x: 1750, y: 300, w: 160, h: 20, color: '#444444' },
        { x: 1950, y: 220, w: 200, h: 20, color: '#555555' },
        { x: 2100, y: 400, w: 180, h: 20, color: '#444444' },
        { x: 0, y: 0, w: 20, h: 540, color: '#333333' },
        { x: 2380, y: 0, w: 20, h: 540, color: '#333333' },
        { x: 550, y: 150, w: 60, h: 60, color: '#666666' },
        { x: 800, y: 180, w: 80, h: 40, color: '#666666' },
        { x: 1600, y: 150, w: 60, h: 60, color: '#666666' }
      ],
      checkpoints: [
        { x: 100, y: 460, w: 40, h: 40 },
        { x: 900, y: 360, w: 40, h: 40 },
        { x: 1750, y: 260, w: 40, h: 40 }
      ],
      items: {}
    },
    maxPlayers: 20,
    order: 1
  },
  {
    slug: 'tupvp',
    name: 'TuPVP',
    description: 'Fight other players with swords!',
    type: 'pvp',
    status: 'active',
    thumbnail: {
      style: 'pvp',
      bgColor: '#080808',
      label: 'TuPVP',
      sublabel: 'Fight · Survive · Win'
    },
    config: {
      gravity: 0.6,
      maxFallSpeed: 12,
      playerSpeed: 4.5,
      jumpForce: -11,
      spawnX: 400,
      spawnY: 300,
      platforms: [
        { x: 0, y: 500, w: 1200, h: 40, color: '#333333' },
        { x: 200, y: 400, w: 120, h: 20, color: '#444444' },
        { x: 500, y: 350, w: 200, h: 20, color: '#444444' },
        { x: 880, y: 400, w: 120, h: 20, color: '#444444' },
        { x: 350, y: 260, w: 100, h: 20, color: '#555555' },
        { x: 700, y: 260, w: 100, h: 20, color: '#555555' },
        { x: 500, y: 180, w: 160, h: 20, color: '#666666' },
        { x: 0, y: 0, w: 20, h: 540, color: '#333333' },
        { x: 1180, y: 0, w: 20, h: 540, color: '#333333' }
      ],
      checkpoints: [],
      items: {
        sword: { name: 'Sword', damage: 20, range: 50, cooldown: 500 }
      }
    },
    maxPlayers: 20,
    order: 2
  }
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    await Game.deleteMany({});
    console.log('Cleared old games');

    for (const game of games) {
      const doc = new Game(game);
      await doc.save();
      console.log(`Created game: ${game.name} (${game.slug})`);
    }

    console.log('\nAll games seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();