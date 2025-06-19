// dashboard/dashboard.js
const dashboardClients = [];

<<<<<<< HEAD
// ✅ Relay incoming chat message to connected dashboards
=======
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
>>>>>>> 33a66b0 (Add login/logout flow and dashboard updatesAdd login/logout flow and dashboard updates)
function relayChatMessage(msg) {
  dashboardClients.forEach(ws => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  });
  console.log('📡 [Dashboard] Relayed chat message to clients:', msg);
}

<<<<<<< HEAD
// ✅ Attach WebSocket server to track dashboard clients
function initWebSocketServer(wss) {
  wss.on('connection', (ws) => {
    console.log('🧩 [WebSocket] New dashboard client connected');
    dashboardClients.push(ws);

    ws.on('close', () => {
      console.log('❌ [WebSocket] Dashboard client disconnected');
      const index = dashboardClients.indexOf(ws);
      if (index > -1) dashboardClients.splice(index, 1);
    });
=======
// ✅ Main dashboard endpoint
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// ✅ Start server (let Northflank route the URL)
server.listen(PORT, () => {
  console.log(`🖥️ Dashboard running on port ${PORT}`);
  if (process.env.NF_PUBLIC_URL) {
    console.log(`🌍 Visit it at: ${process.env.NF_PUBLIC_URL}`);
  }
});
>>>>>>> 33a66b0 (Add login/logout flow and dashboard updatesAdd login/logout flow and dashboard updates)

    ws.on('error', (err) => {
      console.error('⚠️ [WebSocket] Client error:', err);
    });
  });
}

module.exports = {
  relayChatMessage,
  initWebSocketServer
};
