// dashboard/dashboard-client.js

// ✅ Use secure protocol if loaded over HTTPS
const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
const ws = new WebSocket(`${protocol}://${window.location.hostname}:3002`);

const chatbox = document.getElementById('chatbox');
const tabs = document.querySelectorAll('.tab');
let currentPlatform = 'discord';

// ✅ Render incoming chat messages
function renderMessage(msg) {
  if (msg.platform !== currentPlatform) return;

  const div = document.createElement('div');
  div.className = `msg ${msg.platform}`;
  div.innerHTML = `
    <span class="platform-tag">[${msg.platform.toUpperCase()}]</span>
    <strong>${msg.username}</strong>: ${msg.content}
  `;
  chatbox.appendChild(div);
  chatbox.scrollTop = chatbox.scrollHeight;
}

// ✅ Listen for new messages from WebSocket
ws.onmessage = (event) => {
  try {
    const msg = JSON.parse(event.data);
    renderMessage(msg);
  } catch (err) {
    console.error('❌ Failed to parse incoming WebSocket message:', err);
  }
};

// ✅ Handle tab clicks to filter by platform
tabs.forEach(tab => {
  tab.onclick = () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentPlatform = tab.dataset.platform;
    chatbox.innerHTML = ''; // Optionally clear messages on tab switch
  };
});
