const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

// ensure correct path to models
const User = require(path.join(__dirname, '..', 'models', 'User'));

async function main() {
  const [,, username, password, role = 'normal'] = process.argv;
  if (!username || !password) {
    console.error('Usage: node scripts/createUser.js <username> <password> [role]');
    process.exit(1);
  }

  const mongoUrl = 'mongodb://localhost:27017/taskmanager';
  await mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    const existing = await User.findOne({ username });
    if (existing) {
      console.error(`User with username "${username}" already exists.`);
      process.exit(1);
    }

    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);

    const user = new User({ username, passwordHash: hash, role });
    await user.save();
    console.log(`Created user: ${username} (role: ${role})`);
    process.exit(0);
  } catch (err) {
    console.error('Error creating user:', err);
    process.exit(1);
  } finally {
    // close mongoose connection
    try { await mongoose.disconnect(); } catch (e) {}
  }
}

main();
