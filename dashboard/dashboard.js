require('dotenv').config();
const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// ✅ Use Northflank-assigned PORT or fallback to local port
const PORT = process.env.PORT || process.env.DASHBOARD_PORT || 3002;

// ✅ Serve static assets (if you have any in this folder)
app.use(express.static(path.join(__dirname, '.')));

let dashboardClients = [];

// ✅ Handle WebSocket connections
wss.on('connection', (ws) => {
  console.log('🧩 [WebSocket] New dashboard client connected');
  dashboardClients.push(ws);

  ws.on('close', () => {
    console.log('❌ [WebSocket] Dashboard client disconnected');
    dashboardClients = dashboardClients.filter(client => client !== ws);
  });

  ws.on('error', (err) => {
    console.error('⚠️ [WebSocket] Client error:', err);
  });
});

// ✅ Broadcast incoming messages to all clients
function relayChatMessage(msg) {
  dashboardClients.forEach(ws => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  });
  console.log('📡 [Dashboard] Relayed chat message to clients:', msg);
}

// ✅ Main dashboard endpoint
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// ❌ Removed standalone server.listen() to prevent port collision

module.exports = { relayChatMessage };

