require('dotenv').config();
const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.DASHBOARD_PORT || 3002;

// ✅ Use absolute path to serve static files from dashboard folder
app.use(express.static(path.join(__dirname, '.')));

let dashboardClients = [];

// ✅ WebSocket Connection Tracking
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

// ✅ Relay chat messages to all dashboard clients
function relayChatMessage(msg) {
  dashboardClients.forEach(ws => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  });
  console.log('📡 [Dashboard] Relayed chat message to clients:', msg);
}

// ✅ Serve the dashboard HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// ✅ Start server
server.listen(PORT, () => {
  console.log(`🖥️ Dashboard running at http://localhost:${PORT}`);
});

module.exports = { relayChatMessage };