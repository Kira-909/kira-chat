const ws = new WebSocket(`ws://${window.location.host}`);

const messagesList = document.getElementById('messages');
const form = document.getElementById('message-form');
const usernameInput = document.getElementById('username');
const messageInput = document.getElementById('message-input');

function formatTimestamp(ts) {
  const date = new Date(ts);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function addMessage({ username, text, timestamp }) {
  const li = document.createElement('li');

  const userSpan = document.createElement('span');
  userSpan.textContent = username;
  userSpan.classList.add('username');

  const timeSpan = document.createElement('span');
  timeSpan.textContent = formatTimestamp(timestamp);
  timeSpan.classList.add('timestamp');

  li.appendChild(userSpan);
  li.appendChild(document.createTextNode(': ' + text));
  li.appendChild(timeSpan);

  messagesList.appendChild(li);
  messagesList.scrollTop = messagesList.scrollHeight;
}

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  if (msg.type === 'history') {
    msg.data.forEach(addMessage);
  } else if (msg.type === 'message') {
    addMessage(msg.data);
  }
};

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const username = usernameInput.value.trim();
  const text = messageInput.value.trim();

  if (!username || !text) return;

  ws.send(JSON.stringify({ type: 'message', username, text }));

  messageInput.value = '';
  messageInput.focus();
});
