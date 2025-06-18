// dashboard/dashboard-client.js
const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
const ws = new WebSocket(`${protocol}://${window.location.hostname}:3002`);

const chatbox = document.getElementById('chatbox');
const tabs = document.querySelectorAll('.tab');
let currentPlatform = 'discord';

function renderMessage(msg) {
  if (msg.platform !== currentPlatform) return;
  const div = document.createElement('div');
  div.className = `msg ${msg.platform}`;
  div.textContent = `[${msg.platform.toUpperCase()}] ${msg.username}: ${msg.content}`;
  chatbox.appendChild(div);
  chatbox.scrollTop = chatbox.scrollHeight;
}

ws.onmessage = (event) => {
  try {
    const msg = JSON.parse(event.data);
    renderMessage(msg);
  } catch {}
};

tabs.forEach(tab => {
  tab.onclick = () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentPlatform = tab.dataset.platform;
    chatbox.innerHTML = ''; // Clear and reload messages in the future if storing
  };
});
