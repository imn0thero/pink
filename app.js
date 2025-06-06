const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const bcrypt = require('bcrypt');
const path = require('path');
const admin = require('firebase-admin');

const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://smileapp1-default-rtdb.asia-southeast1.firebasedatabase.app' // ganti <YOUR_PROJECT_ID>
});

const db = admin.database();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', socket => {
  let currentUser = null;

  // Signup
  socket.on('signup', async ({ username, password }) => {
    const ref = db.ref(`users/${username}`);
    ref.once('value', async snap => {
      if (snap.exists()) {
        return socket.emit('signupResult', { success: false, message: 'Username sudah digunakan' });
      }
      const hashed = await bcrypt.hash(password, 10);
      ref.set({ username, password: hashed, chats: [], requests: [] });
      socket.emit('signupResult', { success: true });
    });
  });

  // Login
  socket.on('login', async ({ username, password }) => {
    const ref = db.ref(`users/${username}`);
    ref.once('value', async snap => {
      const user = snap.val();
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return socket.emit('loginResult', { success: false });
      }
      currentUser = username;
      socket.emit('loginResult', { success: true, user: username, chats: user.chats || [], requests: user.requests || [] });
    });
  });

  // Send message
  socket.on('sendMessage', async ({ to, message }) => {
    const msgRef = db.ref('messages').push();
    const newMsg = { from: currentUser, to, message, time: Date.now() };
    await msgRef.set(newMsg);
    io.emit('newMessage', newMsg);
  });

  // Search user
  socket.on('searchUser', async keyword => {
    db.ref('users').once('value', snap => {
      const users = snap.val() || {};
      const result = Object.keys(users).filter(u => u.toLowerCase().includes(keyword.toLowerCase()));
      socket.emit('searchResult', result);
    });
  });

  // Send friend request
  socket.on('sendRequest', async target => {
    const targetRef = db.ref(`users/${target}`);
    targetRef.once('value', snap => {
      const user = snap.val();
      if (!user || (user.requests || []).includes(currentUser)) {
        return socket.emit('requestResult', { success: false });
      }
      const requests = user.requests || [];
      requests.push(currentUser);
      targetRef.update({ requests });
      socket.emit('requestResult', { success: true });
    });
  });

  // Handle request response
  socket.on('respondRequest', async ({ from, accepted }) => {
    const userRef = db.ref(`users/${currentUser}`);
    const fromRef = db.ref(`users/${from}`);

    const userSnap = await userRef.once('value');
    const fromSnap = await fromRef.once('value');
    const user = userSnap.val();
    const fromUser = fromSnap.val();

    const requests = (user.requests || []).filter(r => r !== from);
    const chats = user.chats || [];

    if (accepted && !chats.includes(from)) chats.push(from);
    await userRef.update({ requests, chats });

    if (accepted) {
      const fromChats = fromUser.chats || [];
      if (!fromChats.includes(currentUser)) fromChats.push(currentUser);
      await fromRef.update({ chats: fromChats });
    }

    socket.emit('requestHandled', { from, accepted });
  });
});

http.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
