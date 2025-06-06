const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');

const PORT = 3000;
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const MESSAGES_FILE = path.join(__dirname, 'data', 'messages.json');

// Pastikan folder data dan file JSON ada
if (!fs.existsSync('data')) fs.mkdirSync('data');
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '[]');
if (!fs.existsSync(MESSAGES_FILE)) fs.writeFileSync(MESSAGES_FILE, '[]');

app.use(express.static(path.join(__dirname, 'public')));

function readJson(file) {
  return JSON.parse(fs.readFileSync(file));
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

io.on('connection', socket => {
  let currentUser = null;

  // Signup
  socket.on('signup', ({ username, password }) => {
    const users = readJson(USERS_FILE);
    if (users.find(u => u.username === username)) {
      return socket.emit('signupResult', { success: false, message: 'Username sudah digunakan' });
    }

    const hashed = bcrypt.hashSync(password, 10);
    users.push({ username, password: hashed, chats: [], requests: [] });
    writeJson(USERS_FILE, users);
    socket.emit('signupResult', { success: true });
  });

  // Login
  socket.on('login', ({ username, password }) => {
    const users = readJson(USERS_FILE);
    const user = users.find(u => u.username === username);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return socket.emit('loginResult', { success: false });
    }
    currentUser = username;
    socket.emit('loginResult', { success: true, user: username, chats: user.chats, requests: user.requests });
  });

  // Edit Profile
  socket.on('editProfile', ({ newUsername, newPassword }) => {
    if (!currentUser) return;
    const users = readJson(USERS_FILE);
    const user = users.find(u => u.username === currentUser);
    if (!user) return;

    if (newUsername && newUsername !== currentUser) {
      if (users.find(u => u.username === newUsername)) {
        return socket.emit('profileUpdated', { success: false, message: 'Username sudah ada' });
      }
      user.username = newUsername;
      currentUser = newUsername;
    }

    if (newPassword) {
      user.password = bcrypt.hashSync(newPassword, 10);
    }

    writeJson(USERS_FILE, users);
    socket.emit('profileUpdated', { success: true, username: currentUser });
  });

  // Search User
  socket.on('searchUser', keyword => {
    const users = readJson(USERS_FILE);
    const result = users.filter(u => u.username.toLowerCase().includes(keyword.toLowerCase()));
    socket.emit('searchResult', result.map(u => u.username));
  });

  // Send Chat Request
  socket.on('sendRequest', target => {
    const users = readJson(USERS_FILE);
    const user = users.find(u => u.username === currentUser);
    const targetUser = users.find(u => u.username === target);
    if (!user || !targetUser || targetUser.requests.includes(currentUser)) {
      return socket.emit('requestResult', { success: false });
    }

    targetUser.requests.push(currentUser);
    writeJson(USERS_FILE, users);
    socket.emit('requestResult', { success: true });
  });

  // Handle Request
  socket.on('respondRequest', ({ from, accepted }) => {
    const users = readJson(USERS_FILE);
    const user = users.find(u => u.username === currentUser);
    const fromUser = users.find(u => u.username === from);
    if (!user || !fromUser) return;

    user.requests = user.requests.filter(r => r !== from);

    if (accepted) {
      if (!user.chats.includes(from)) user.chats.push(from);
      if (!fromUser.chats.includes(currentUser)) fromUser.chats.push(currentUser);
    }

    writeJson(USERS_FILE, users);
    socket.emit('requestHandled', { from, accepted });
  });

  // Send Message
  socket.on('sendMessage', ({ to, message }) => {
    const messages = readJson(MESSAGES_FILE);
    const newMsg = {
      from: currentUser,
      to,
      message,
      time: new Date().toISOString()
    };
    messages.push(newMsg);
    writeJson(MESSAGES_FILE, messages);
    io.emit('newMessage', newMsg);
  });
});

http.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
