const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['normal', 'admin'],
    default: 'normal'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
