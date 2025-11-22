const mongoose = require('mongoose');
const path = require('path');

// ensure correct path to models
const User = require(path.join(__dirname, '..', 'models', 'User'));

async function main() {
  const [,, username] = process.argv;
  if (!username) {
    console.error('Usage: node scripts/ensureAdmin.js <username>');
    process.exit(1);
  }

  const mongoUrl = 'mongodb://localhost:27017/taskmanager';
  await mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    const user = await User.findOne({ username });
    if (!user) {
      console.error(`User with username "${username}" not found.`);
      process.exit(2);
    }

    if (user.role === 'admin') {
      console.log(`User "${username}" is already an admin.`);
      process.exit(0);
    }

    user.role = 'admin';
    await user.save();
    console.log(`Updated user "${username}" -> role: admin`);
    process.exit(0);
  } catch (err) {
    console.error('Error ensuring admin:', err);
    process.exit(1);
  } finally {
    try { await mongoose.disconnect(); } catch (e) {}
  }
}

main();
