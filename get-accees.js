// run-once-grant-access.js
// Запустить один раз: node run-once-grant-access.js

const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://Today_Idk:TpdauT434odayTodayToday23@cluster0.rlgkop5.mongodb.net/tublox3?retryWrites=true&w=majority&appName=Cluster0';
const TARGET_USERNAME = 'today_idk';

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const User = mongoose.model('User');
  const Place = mongoose.model('Place');

  const user = await User.findOne({ username: TARGET_USERNAME });
  if (!user) {
    console.log(`User "${TARGET_USERNAME}" not found`);
    process.exit(1);
  }

  console.log(`Found user: ${user.username} (${user._id})`);

  const places = await Place.find({});
  console.log(`Total games: ${places.length}`);

  let updated = 0;

  for (const place of places) {
    // Не трогаем если уже владелец
    if (place.owner && place.owner.toString() === user._id.toString()) {
      console.log(`  [SKIP] "${place.name}" — already owner`);
      continue;
    }

    // Проверяем есть ли уже в editors
    if (!place.editors) place.editors = [];

    const alreadyEditor = place.editors.some(
      e => e.toString() === user._id.toString()
    );

    if (alreadyEditor) {
      console.log(`  [SKIP] "${place.name}" — already editor`);
      continue;
    }

    place.editors.push(user._id);
    await place.save();
    updated++;
    console.log(`  [ADDED] "${place.name}" — added as editor`);
  }

  console.log(`\nDone. Updated ${updated} games.`);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});