const socket = io();
let currentUser = null;
let currentChat = null;

// Signup
document.getElementById('signupForm')?.addEventListener('submit', e => {
  e.preventDefault();
  const username = e.target.username.value;
  const password = e.target.password.value;
  socket.emit('signup', { username, password });
});

socket.on('signupResult', res => {
  alert(res.message || (res.success ? 'Signup berhasil!' : 'Signup gagal'));
  if (res.success) location.reload();
});

// Login
document.getElementById('loginForm')?.addEventListener('submit', e => {
  e.preventDefault();
  const username = e.target.username.value;
  const password = e.target.password.value;
  socket.emit('login', { username, password });
});

socket.on('loginResult', res => {
  if (!res.success) return alert('Login gagal');
  currentUser = res.user;
  document.getElementById('authSection').style.display = 'none';
  document.getElementById('chatSection').style.display = 'block';
  loadChats(res.chats);
  loadRequests(res.requests);
});

// Edit Profile
document.getElementById('editForm')?.addEventListener('submit', e => {
  e.preventDefault();
  const newUsername = e.target.newUsername.value;
  const newPassword = e.target.newPassword.value;
  socket.emit('editProfile', { newUsername, newPassword });
});

socket.on('profileUpdated', res => {
  alert(res.message || 'Profil diperbarui');
});

// Search User
document.getElementById('searchForm')?.addEventListener('submit', e => {
  e.preventDefault();
  const keyword = e.target.keyword.value;
  socket.emit('searchUser', keyword);
});

socket.on('searchResult', users => {
  const ul = document.getElementById('searchResults');
  ul.innerHTML = '';
  users.forEach(u => {
    const li = document.createElement('li');
    li.textContent = u;
    const btn = document.createElement('button');
    btn.textContent = 'Kirim permintaan';
    btn.onclick = () => socket.emit('sendRequest', u);
    li.appendChild(btn);
    ul.appendChild(li);
  });
});

socket.on('requestResult', res => {
  alert(res.success ? 'Permintaan dikirim' : 'Gagal mengirim permintaan');
});

function loadChats(chats) {
  const ul = document.getElementById('chatList');
  ul.innerHTML = '';
  chats.forEach(user => {
    const li = document.createElement('li');
    li.textContent = user;
    li.onclick = () => openChat(user);
    ul.appendChild(li);
  });
}

function loadRequests(requests) {
  const ul = document.getElementById('requestList');
  ul.innerHTML = '';
  requests.forEach(user => {
    const li = document.createElement('li');
    li.textContent = user;

    const accept = document.createElement('button');
    accept.textContent = 'Terima';
    accept.onclick = () => socket.emit('respondRequest', { from: user, accepted: true });

    const reject = document.createElement('button');
    reject.textContent = 'Tolak';
    reject.onclick = () => socket.emit('respondRequest', { from: user, accepted: false });

    li.appendChild(accept);
    li.appendChild(reject);
    ul.appendChild(li);
  });
}

socket.on('requestHandled', ({ from, accepted }) => {
  alert(`${from} ${accepted ? 'diterima' : 'ditolak'}`);
  location.reload();
});

function openChat(user) {
  currentChat = user;
  document.getElementById('chatTitle').textContent = `Chat dengan ${user}`;
  document.getElementById('messages').innerHTML = '';
}

document.getElementById('messageForm')?.addEventListener('submit', e => {
  e.preventDefault();
  const msg = e.target.message.value;
  if (!currentChat || !msg) return;
  socket.emit('sendMessage', { to: currentChat, message: msg });
  e.target.message.value = '';
});

socket.on('newMessage', msg => {
  if (msg.from === currentUser || msg.to === currentUser) {
    const messages = document.getElementById('messages');
    const div = document.createElement('div');
    div.textContent = `${msg.from}: ${msg.message}`;
    messages.appendChild(div);
  }
});
