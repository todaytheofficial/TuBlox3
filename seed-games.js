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
  },
  {
    slug: 'tuhorror',
    name: 'TuHorror',
    description: 'Survive in the dark. Your flashlight is your only friend.',
    type: 'horror',
    status: 'active',
    thumbnail: {
      style: 'horror',
      bgColor: '#020202',
      label: 'TuHORROR',
      sublabel: 'Dark · Scary · Survive'
    },
    config: {
      gravity: 0.5,
      maxFallSpeed: 10,
      playerSpeed: 3,
      jumpForce: -11,
      spawnX: 120,
      spawnY: 450,

      horror: true,
      darkness: true,
      ambientLight: 0.02,
      flashlightRadius: 220,
      flashlightBrightness: 1.2,
      flashlightSpread: 0.45,
      flashlightBattery: 100,
      batteryDrainRate: 0.8,
      batteryRechargeRate: 0.3,
      flickerChance: 0.003,
      breathingEffect: true,
      footstepShake: true,
      ambientParticles: true,

      scareEvents: [
        { type: 'shadow', x: 600, y: 440, triggerRadius: 150, once: true, message: 'What was that...?' },
        { type: 'flicker', x: 1200, y: 440, triggerRadius: 120, once: true, duration: 2000 },
        { type: 'sound_text', x: 1800, y: 440, triggerRadius: 100, once: true, message: '*creak...*' },
        { type: 'shadow', x: 2400, y: 440, triggerRadius: 130, once: true, message: 'You are not alone.' },
        { type: 'flicker', x: 3000, y: 440, triggerRadius: 100, once: true, duration: 3000 },
        { type: 'eyes', x: 2800, y: 350, triggerRadius: 200, once: true },
        { type: 'shadow', x: 3600, y: 440, triggerRadius: 140, once: true, message: 'It sees you.' },
        { type: 'chase_shadow', x: 4000, y: 440, triggerRadius: 150, once: true, speed: 2, duration: 4000 },
        { type: 'sound_text', x: 4500, y: 440, triggerRadius: 100, once: true, message: '*breathing behind you*' },
        { type: 'blackout', x: 5000, y: 440, triggerRadius: 120, once: true, duration: 3000, message: 'RUN.' }
      ],

      collectibleItems: [
        { type: 'battery', x: 500, y: 470, properties: { recharge: 30 } },
        { type: 'battery', x: 1100, y: 470, properties: { recharge: 25 } },
        { type: 'battery', x: 1700, y: 470, properties: { recharge: 35 } },
        { type: 'battery', x: 2300, y: 470, properties: { recharge: 30 } },
        { type: 'battery', x: 2900, y: 470, properties: { recharge: 25 } },
        { type: 'battery', x: 3500, y: 470, properties: { recharge: 40 } },
        { type: 'battery', x: 4200, y: 470, properties: { recharge: 30 } },
        { type: 'battery', x: 4800, y: 470, properties: { recharge: 50 } },
        { type: 'note', x: 800, y: 470, properties: { text: 'They come when the light dies.' } },
        { type: 'note', x: 2000, y: 470, properties: { text: 'Do not look behind you.' } },
        { type: 'note', x: 3200, y: 470, properties: { text: 'The exit is close. Keep moving.' } },
        { type: 'note', x: 4600, y: 470, properties: { text: 'You made it. Or did you?' } }
      ],

      platforms: [
        // === MAIN FLOOR — wide solid ground ===
        { x: 0, y: 500, w: 5600, h: 60, color: '#1a1a1a' },

        // === CEILING ===
        { x: 0, y: 200, w: 5600, h: 30, color: '#111111' },

        // === LEFT WALL ===
        { x: 0, y: 200, w: 30, h: 360, color: '#1a1a1a' },

        // === RIGHT WALL ===
        { x: 5570, y: 200, w: 30, h: 360, color: '#1a1a1a' },

        // === CORRIDOR WALLS (vertical dividers creating rooms) ===
        // Wall 1
        { x: 400, y: 230, w: 20, h: 200, color: '#1a1a1a' },
        // Gap at bottom for passage

        // Wall 2
        { x: 800, y: 280, w: 20, h: 220, color: '#1a1a1a' },

        // Wall 3
        { x: 1200, y: 230, w: 20, h: 180, color: '#1a1a1a' },

        // Wall 4
        { x: 1600, y: 260, w: 20, h: 240, color: '#1a1a1a' },

        // Wall 5
        { x: 2000, y: 230, w: 20, h: 200, color: '#1a1a1a' },

        // Wall 6
        { x: 2400, y: 280, w: 20, h: 220, color: '#1a1a1a' },

        // Wall 7
        { x: 2800, y: 240, w: 20, h: 190, color: '#1a1a1a' },

        // Wall 8
        { x: 3200, y: 260, w: 20, h: 240, color: '#1a1a1a' },

        // Wall 9
        { x: 3600, y: 230, w: 20, h: 200, color: '#1a1a1a' },

        // Wall 10
        { x: 4000, y: 280, w: 20, h: 220, color: '#1a1a1a' },

        // Wall 11
        { x: 4400, y: 240, w: 20, h: 190, color: '#1a1a1a' },

        // Wall 12
        { x: 4800, y: 260, w: 20, h: 240, color: '#1a1a1a' },

        // === SMALL PLATFORMS (stepping) ===
        { x: 300, y: 440, w: 80, h: 15, color: '#222222' },
        { x: 600, y: 420, w: 100, h: 15, color: '#222222' },
        { x: 1000, y: 430, w: 80, h: 15, color: '#222222' },
        { x: 1400, y: 410, w: 100, h: 15, color: '#252525' },
        { x: 1800, y: 440, w: 80, h: 15, color: '#222222' },
        { x: 2200, y: 420, w: 100, h: 15, color: '#222222' },
        { x: 2600, y: 430, w: 80, h: 15, color: '#252525' },
        { x: 3000, y: 410, w: 100, h: 15, color: '#222222' },
        { x: 3400, y: 440, w: 80, h: 15, color: '#222222' },
        { x: 3800, y: 420, w: 100, h: 15, color: '#252525' },
        { x: 4200, y: 430, w: 80, h: 15, color: '#222222' },
        { x: 4600, y: 410, w: 100, h: 15, color: '#222222' },

        // === DEBRIS on floor ===
        { x: 200, y: 485, w: 40, h: 15, color: '#181818' },
        { x: 900, y: 485, w: 50, h: 15, color: '#181818' },
        { x: 1500, y: 485, w: 35, h: 15, color: '#181818' },
        { x: 2100, y: 485, w: 45, h: 15, color: '#181818' },
        { x: 2700, y: 485, w: 40, h: 15, color: '#181818' },
        { x: 3300, y: 485, w: 50, h: 15, color: '#181818' },
        { x: 3900, y: 485, w: 35, h: 15, color: '#181818' },
        { x: 4500, y: 485, w: 45, h: 15, color: '#181818' },

        // === PILLARS in rooms ===
        { x: 550, y: 350, w: 12, h: 150, color: '#1a1a1a' },
        { x: 1050, y: 330, w: 12, h: 170, color: '#1a1a1a' },
        { x: 1850, y: 340, w: 12, h: 160, color: '#1a1a1a' },
        { x: 2550, y: 350, w: 12, h: 150, color: '#1a1a1a' },
        { x: 3050, y: 330, w: 12, h: 170, color: '#1a1a1a' },
        { x: 3850, y: 340, w: 12, h: 160, color: '#1a1a1a' },
        { x: 4550, y: 350, w: 12, h: 150, color: '#1a1a1a' },

        // === EXIT AREA ===
        { x: 5200, y: 460, w: 200, h: 15, color: '#2a4a2a' },
        { x: 5200, y: 440, w: 200, h: 20, color: '#1a3a1a', text: 'EXIT', textColor: '#4ade80', textSize: 14 }
      ],

      checkpoints: [
        { x: 80, y: 460, w: 40, h: 40 },
        { x: 1400, y: 460, w: 40, h: 40 },
        { x: 2800, y: 460, w: 40, h: 40 },
        { x: 4200, y: 460, w: 40, h: 40 }
      ],

      items: {
        flashlight: {
          name: 'Flashlight',
          radius: 220,
          brightness: 1.2,
          giveOnStart: true
        }
      }
    },
    maxPlayers: 10,
    order: 3
  },
  {
    slug: 'obby',
    name: 'Obby',
    description: 'Obstacle course',
    type: 'obby',
    status: 'coming_soon',
    thumbnail: {
      style: 'coming_soon',
      bgColor: '#080808',
      label: 'OBBY',
      sublabel: 'Coming Soon'
    },
    config: {
      gravity: 0.6,
      maxFallSpeed: 12,
      playerSpeed: 4,
      jumpForce: -12,
      spawnX: 100,
      spawnY: 200,
      platforms: [],
      checkpoints: [],
      items: {}
    },
    maxPlayers: 20,
    order: 4
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