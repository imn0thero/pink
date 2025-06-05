const socket = io();

const loginSection = document.getElementById('loginSection');
const chatSection = document.getElementById('chatSection');
const usernameInput = document.getElementById('usernameInput');
const passwordInput = document.getElementById('passwordInput');
const signupBtn = document.getElementById('signupBtn');
const loginBtn = document.getElementById('loginBtn');
const loginStatus = document.getElementById('loginStatus');

const currentUserSpan = document.getElementById('currentUser');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const userList = document.getElementById('userList');
const requestsList = document.getElementById('requestsList');
const chatSelect = document.getElementById('chatSelect');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');

let currentUser = null;
let currentChat = null;

// Signup
signupBtn.addEventListener('click', () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  if (!username || !password) {
    loginStatus.textContent = 'Isi username dan password';
    return;
  }
  socket.emit('signup', { username, password });
});

socket.on('signupResult', ({ success, message }) => {
  loginStatus.textContent = success ? 'Signup berhasil! Silakan login.' : (message || 'Signup gagal');
});

// Login
loginBtn.addEventListener('click', () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  if (!username || !password) {
    loginStatus.textContent = 'Isi username dan password';
    return;
  }
  socket.emit('login', { username, password });
});

socket.on('loginResult', ({ success, user, chats, requests }) => {
  if (success) {
    currentUser = user;
    loginSection.style.display = 'none';
    chatSection.style.display = 'block';
    currentUserSpan.textContent = currentUser;
    loginStatus.textContent = '';
    updateChats(chats);
    updateRequests(requests);
  } else {
    loginStatus.textContent = 'Login gagal. Cek username dan password.';
  }
});

// Search users
searchBtn.addEventListener('click', () => {
  const keyword = searchInput.value.trim();
  if (!keyword) return;
  socket.emit('searchUser', keyword);
});

socket.on('searchResult', users => {
  userList.innerHTML = '';
  users.forEach(u => {
    if (u === currentUser) return;
    const li = document.createElement('li');
    li.textContent = u + ' ';
    const btn = document.createElement('button');
    btn.textContent = 'Add';
    btn.addEventListener('click', () => {
      socket.emit('sendRequest', u);
    });
    li.appendChild(btn);
    userList.appendChild(li);
  });
});

socket.on('requestResult', ({ success }) => {
  alert(success ? 'Request sent' : 'Request gagal atau sudah dikirim');
});

// Update chat requests
function updateRequests(requests) {
  requestsList.innerHTML = '';
  requests.forEach(r => {
    const li = document.createElement('li');
    li.textContent = r + ' ';
    const acceptBtn = document.createElement('button');
    acceptBtn.textContent = 'Accept';
    acceptBtn.addEventListener('click', () => {
      socket.emit('respondRequest', { from: r, accepted: true });
    });
    const rejectBtn = document.createElement('button');
    rejectBtn.textContent = 'Reject';
    rejectBtn.addEventListener('click', () => {
      socket.emit('respondRequest', { from: r, accepted: false });
    });
    li.appendChild(acceptBtn);
    li.appendChild(rejectBtn);
    requestsList.appendChild(li);
  });
}

socket.on('requestHandled', ({ from, accepted }) => {
  alert(accepted ? `You are now chatting with ${from}` : `Request from ${from} rejected`);
  // Refresh user data
  socket.emit('login', { username: currentUser, password: '' }); // workaround to refresh data
});

// Update chats dropdown
function updateChats(chats) {
  chatSelect.innerHTML = '';
  chats.forEach(chatUser => {
    const option = document.createElement('option');
    option.value = chatUser;
    option.textContent = chatUser;
    chatSelect.appendChild(option);
  });
  if (chats.length > 0) {
    currentChat = chats[0];
    loadMessages(currentChat);
  }
}

// Load messages (very simple: fetch all messages between currentUser and selected chat)
function loadMessages(chatUser) {
  messagesDiv.innerHTML = '';
  // For simplicity, no REST API - could extend server to emit chat history on request
  // Here just clearing messages on chat change
}

chatSelect.addEventListener('change', e => {
  currentChat = e.target.value;
  loadMessages(currentChat);
});

// Send message
sendBtn.addEventListener('click', () => {
  const msg = messageInput.value.trim();
  if (!msg || !currentChat) return;
  socket.emit('sendMessage', { to: currentChat, message: msg });
  messageInput.value = '';
});

socket.on('newMessage', msg => {
  // Show message only if it involves current user and current chat
  if (
    (msg.from === currentUser && msg.to === currentChat) ||
    (msg.to === currentUser && msg.from === currentChat)
  ) {
    const div = document.createElement('div');
    div.textContent = `${msg.from}: ${msg.message}`;
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }
});
