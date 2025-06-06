const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcrypt');

const User = require('./models/User');
const Message = require('./models/Message');

const PORT = 3000;
const MONGO_URI = process.env.MONGO_URI;

app.use(express.static(path.join(__dirname, 'public')));

// Koneksi MongoDB
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

io.on('connection', socket => {
  let currentUser = null;

  // Signup
  socket.on('signup', async ({ username, password }) => {
    try {
      const exist = await User.findOne({ username });
      if (exist) return socket.emit('signupResult', { success: false, message: 'Username sudah digunakan' });

      const hashed = await bcrypt.hash(password, 10);
      await new User({ username, password: hashed, chats: [], requests: [] }).save();

      socket.emit('signupResult', { success: true });
    } catch (err) {
      socket.emit('signupResult', { success: false, message: 'Error saat signup' });
    }
  });

  // Login
  socket.on('login', async ({ username, password }) => {
    try {
      const user = await User.findOne({ username });
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return socket.emit('loginResult', { success: false });
      }
      currentUser = username;
      socket.emit('loginResult', { success: true, user: username, chats: user.chats, requests: user.requests });
    } catch {
      socket.emit('loginResult', { success: false });
    }
  });

  // Edit Profile
  socket.on('editProfile', async ({ newUsername, newPassword }) => {
    if (!currentUser) return;
    try {
      const user = await User.findOne({ username: currentUser });
      if (!user) return;

      if (newUsername && newUsername !== currentUser) {
        const taken = await User.findOne({ username: newUsername });
        if (taken) return socket.emit('profileUpdated', { success: false, message: 'Username sudah ada' });
        user.username = newUsername;
        currentUser = newUsername;
      }
      if (newPassword) user.password = await bcrypt.hash(newPassword, 10);

      await user.save();
      socket.emit('profileUpdated', { success: true, username: currentUser });
    } catch {
      socket.emit('profileUpdated', { success: false, message: 'Error saat update profil' });
    }
  });

  // Search User
  socket.on('searchUser', async keyword => {
    try {
      const result = await User.find({ username: { $regex: keyword, $options: 'i' } });
      socket.emit('searchResult', result.map(u => u.username));
    } catch {
      socket.emit('searchResult', []);
    }
  });

  // Send Chat Request
  socket.on('sendRequest', async target => {
    try {
      const targetUser = await User.findOne({ username: target });
      const user = await User.findOne({ username: currentUser });
      if (!targetUser || targetUser.requests.includes(currentUser)) {
        return socket.emit('requestResult', { success: false });
      }
      targetUser.requests.push(currentUser);
      await targetUser.save();
      socket.emit('requestResult', { success: true });
    } catch {
      socket.emit('requestResult', { success: false });
    }
  });

  // Respond Request (Accept/Reject)
  socket.on('respondRequest', async ({ from, accepted }) => {
    try {
      const user = await User.findOne({ username: currentUser });
      const fromUser = await User.findOne({ username: from });
      user.requests = user.requests.filter(r => r !== from);

      if (accepted) {
        if (!user.chats.includes(from)) user.chats.push(from);
        if (!fromUser.chats.includes(currentUser)) fromUser.chats.push(currentUser);
      }

      await user.save();
      await fromUser.save();
      socket.emit('requestHandled', { from, accepted });
    } catch {
      socket.emit('requestHandled', { from, accepted: false });
    }
  });

  // Send Message
  socket.on('sendMessage', async ({ to, message }) => {
    try {
      const newMsg = new Message({ from: currentUser, to, message });
      await newMsg.save();
      io.emit('newMessage', newMsg);
    } catch {
      // optionally emit error to client here
    }
  });
});

http.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
