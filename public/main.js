const socket = io();

function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  socket.emit('login', { username, password });
}

function signup() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  socket.emit('signup', { username, password });
}

function sendMessage() {
  const to = document.getElementById('to').value;
  const message = document.getElementById('message').value;
  socket.emit('sendMessage', { to, message });
}

socket.on('signupResult', res => {
  alert(res.success ? 'Signup berhasil!' : res.message);
});

socket.on('loginResult', res => {
  if (res.success) {
    document.getElementById('login').style.display = 'none';
    document.getElementById('chat').style.display = 'block';
    document.getElementById('me').textContent = res.user;
  } else {
    alert('Login gagal');
  }
});

socket.on('newMessage', msg => {
  const div = document.createElement('div');
  div.textContent = `${msg.from} ➤ ${msg.to}: ${msg.message}`;
  document.getElementById('messages').appendChild(div);
});
