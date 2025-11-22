const mongoose = require('mongoose');
const path = require('path');
const User = require(path.join(__dirname, '..', 'models', 'User'));

async function main() {
  const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/taskmanager';
  console.log('Connecting to', mongoUrl);
  try {
    await mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
    const res = await User.deleteMany({});
    console.log('Deleted users:', res.deletedCount);
  } catch (err) {
    console.error('Error clearing users:', err);
    process.exitCode = 1;
  } finally {
    try { await mongoose.disconnect(); } catch (e) {}
  }
}

main();
