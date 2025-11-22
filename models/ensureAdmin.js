const mongoose = require('mongoose');

async function ensureAdminAtStartup(username) {
  if (!username) return;

  // Ensure mongoose is connected (1 = connected)
  if (mongoose.connection && mongoose.connection.readyState !== 1) {
    console.log('ensureAdmin: mongoose not connected, skipping');
    return;
  }

  try {
    // require User model relative to models folder
    // (this file lives in models/, so './User' resolves correctly)
    const User = require('./User');
    const user = await User.findOne({ username });
    if (!user) {
      console.log(`ensureAdmin: user "${username}" not found`);
      return;
    }
    if (user.role === 'admin') {
      console.log(`ensureAdmin: user "${username}" already admin`);
      return;
    }
    user.role = 'admin';
    await user.save();
    console.log(`ensureAdmin: promoted "${username}" to admin`);
  } catch (err) {
    console.error('ensureAdmin error:', err && err.message ? err.message : err);
  }
}

module.exports = { ensureAdminAtStartup };
