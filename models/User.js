const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  chats: [String],
  requests: [String]
});

module.exports = mongoose.model('User', userSchema);
