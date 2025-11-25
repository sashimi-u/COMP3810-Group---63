const mongoose = require('mongoose');
const path = require('path');

const Task = require(path.join(__dirname, '..', 'Task'));
const User = require(path.join(__dirname, '..', 'User'));

async function main() {
  const mongoUrl = process.env.MONGO_URL;
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';

  if (!mongoUrl) {
    console.error('Environment variable MONGO_URL is required for this migration script.');
    process.exit(1);
  }

  console.log('Connecting to', mongoUrl);
  await mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    // find admin user
    let admin = await User.findOne({ username: adminUsername });
    if (!admin) {
      // fallback to any user
      admin = await User.findOne({});
    }

    if (!admin) {
      console.error('No users found in DB. Please create an admin or a user first.');
      process.exit(2);
    }

    const adminId = admin._id;
    console.log('Using user', admin.username, '(', adminId.toString(), ') to assign createdBy for existing tasks');

    const res = await Task.updateMany({ $or: [ { createdBy: { $exists: false } }, { createdBy: null } ] }, { $set: { createdBy: adminId } });
    console.log('Matched:', res.matchedCount || res.n, 'Modified:', res.modifiedCount || res.nModified);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    try { await mongoose.disconnect(); } catch (e) {}
  }
}

main();
