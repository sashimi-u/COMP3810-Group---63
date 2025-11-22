const mongoose = require('mongoose');
const path = require('path');

// load User model from project
const User = require(path.join(__dirname, '..', 'models', 'User'));

async function main() {
  const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/taskmanager';
  console.log('Connecting to', mongoUrl);
  try {
    await mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
    const users = await User.find({}, '-passwordHash').lean();
    console.log('Found', users.length, 'users');
    users.forEach(u => console.log(JSON.stringify(u, null, 2)));
  } catch (err) {
    console.error('Error querying users:', err);
    process.exitCode = 1;
  } finally {
    try { await mongoose.disconnect(); } catch (e) {}
  }
}

main();
