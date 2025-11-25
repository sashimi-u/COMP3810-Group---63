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

    // Helper to ensure a user exists; if not, create with provided password and role.
    async function ensureUser(usernameToEnsure, desiredPassword, role = 'normal') {
      let u = await User.findOne({ username: usernameToEnsure });
      if (u) return { existed: true, user: u };

      const pw = desiredPassword || usernameToEnsure;
      u = new User({ username: usernameToEnsure, password: pw, role });
      await u.save();
      return { existed: false, user: u };
    }

    // Ensure the requested admin user exists and has admin role.
    let res = await ensureUser(username, username, 'admin');
    if (res.existed) {
      const existing = await User.findOne({ username });
      if (existing.role !== 'admin') {
        existing.role = 'admin';
        await existing.save();
        console.log(`ensureAdmin: promoted "${username}" to admin`);
      } else {
        console.log(`ensureAdmin: user "${username}" already admin`);
      }
    } else {
      console.log(`ensureAdmin: created admin "${username}"`);
    }

    // Also ensure default normal user 'alice' exists with password 'alice'
    const aliceRes = await ensureUser('alice', 'alice', 'normal');
    if (aliceRes.existed) {
      console.log('ensureAdmin: user "alice" already exists');
    } else {
      console.log('ensureAdmin: created user "alice"');
    }

  } catch (err) {
    console.error('ensureAdmin error:', err && err.message ? err.message : err);
  }
}

module.exports = { ensureAdminAtStartup };
