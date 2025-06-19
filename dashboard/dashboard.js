// ✅ dashboard/dashboard.js
let dashboardClients = [];

// ✅ Relay incoming chat message to connected dashboards
function relayChatMessage(msg) {
  dashboardClients.forEach(ws => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  });
  console.log('📡 [Dashboard] Relayed chat message to clients:', msg);
}

// ✅ Attach WebSocket server to track dashboard clients
function initWebSocketServer(wss) {
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
}

module.exports = {
  relayChatMessage,
  initWebSocketServer
};
