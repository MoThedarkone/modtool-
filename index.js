<<<<<<< HEAD
// === ✅ START OF FINAL INDEX FILE ===
=======
// === ✅ START OF MERGED INDEX FILE ===
>>>>>>> 33a66b0 (Add login/logout flow and dashboard updatesAdd login/logout flow and dashboard updates)
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const http = require('http');
<<<<<<< HEAD
const session = require('express-session');
=======
>>>>>>> 33a66b0 (Add login/logout flow and dashboard updatesAdd login/logout flow and dashboard updates)
const { WebSocketServer } = require('ws');
const fetch = require('node-fetch');
const { Client, GatewayIntentBits, Partials } = require('discord.js');

// === 📦 LOCAL MODULES ===
const interactionHandler = require('./handlers/interactionHandler');
const sendLiveGrid = require('./tasks/sendLiveGrid');
const announceLiveStreamers = require('./tasks/announceLiveStreamers');
const updateStats = require('./events/statusUpdater');
const { fetchAllFreeGames } = require('./features/freeGamesHandler');
const messageHandler = require('./events/messageCreate');
const { relayChatMessage } = require('./dashboard/dashboard');

// 🟩 Twitch integrations
require('./backend/twitchShoutoutManager');
const twitchAnnouncer = require('./backend/twitchLiveAnnouncer');
require('./backend/twitchClipListener');

<<<<<<< HEAD
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const PORT = process.env.PORT || 8080;
let dashboardClients = [];

// ✅ Session Middleware
app.use(session({
  secret: process.env.DASHBOARD_SESSION_SECRET || 'keyboard cat',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 2 * 60 * 60 * 1000 } // 2 hours
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'dashboard')));

// ✅ Login page
app.get('/dashboard/login', (req, res) => {
  if (req.session.loggedIn) return res.redirect('/dashboard');
  res.sendFile(path.join(__dirname, 'dashboard', 'login.html'));
});

// ✅ Login handler
app.post('/dashboard/login', (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.DASHBOARD_USERNAME && password === process.env.DASHBOARD_PASSWORD) {
    req.session.loggedIn = true;
    return res.redirect('/dashboard');
  }
  res.send('❌ Invalid login. <a href="/dashboard/login">Try again</a>');
});

// ✅ Logout
app.get('/dashboard/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/dashboard/login');
  });
});

// ✅ Auth middleware
function requireAuth(req, res, next) {
  if (req.session.loggedIn) return next();
  return res.redirect('/dashboard/login');
}

// ✅ Serve protected dashboard
app.get('/dashboard', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard', 'dashboard.html'));
});

// ✅ Twitch OAuth Callback
=======
// === 🔧 DASHBOARD SERVER + CALLBACK ===
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const PORT = process.env.PORT || 8080; // ✅ Use 8080 for Northflank
let dashboardClients = [];

app.use(express.static(path.join(__dirname, '.')));

>>>>>>> 33a66b0 (Add login/logout flow and dashboard updatesAdd login/logout flow and dashboard updates)
app.get('/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("Missing 'code' parameter.");

  const tokenParams = new URLSearchParams({
    client_id: process.env.TWITCH_CLIENT_ID,
    client_secret: process.env.TWITCH_SECRET,
    code,
    grant_type: 'authorization_code',
    redirect_uri: process.env.TWITCH_REDIRECT_URI,
  });

  try {
    const response = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      body: tokenParams,
    });
    const result = await response.json();
    console.log('📬 Twitch token response:', result);
    res.send(`
      <h2>✅ OAuth Complete</h2>
      <pre>${JSON.stringify(result, null, 2)}</pre>
      <p>Copy your access and refresh tokens into your <code>.env</code> file!</p>
    `);
  } catch (err) {
    console.error('❌ Token exchange failed:', err);
    res.status(500).send('Error exchanging token.');
  }
});

<<<<<<< HEAD
// ✅ Redirect root
app.get('/', (req, res) => res.redirect('/dashboard'));
=======
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});
>>>>>>> 33a66b0 (Add login/logout flow and dashboard updatesAdd login/logout flow and dashboard updates)

wss.on('connection', (ws) => {
  dashboardClients.push(ws);
  ws.on('close', () => {
    dashboardClients = dashboardClients.filter(client => client !== ws);
  });
});

function broadcastToDashboard(msg) {
  dashboardClients.forEach(ws => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
  });
}

// === 🤖 DISCORD CLIENT SETUP ===
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

<<<<<<< HEAD
console.log('📍 Twitch Redirect URI:', process.env.TWITCH_REDIRECT_URI);

client.once('ready', () => {
  console.log(`🎮 ${client.user.tag} is online`);
  setInterval(() => sendLiveGrid(client), 5 * 60 * 1000);
  twitchAnnouncer.init(client);
  updateStats(client);
  setInterval(() => updateStats(client), 10 * 60 * 1000);

=======
console.log('🔑 BOT_TOKEN:', process.env.BOT_TOKEN ? '[LOADED]' : '[MISSING]');
console.log('📍 Twitch Redirect URI:', process.env.TWITCH_REDIRECT_URI);

client.on('huggingfaceApiCall', (username, messageContent) => {
  console.log(`🤖 [DEBUG] Bot calling Huggingface API for user ${username}: "${messageContent}"`);
});

client.once('ready', () => {
  console.log(`🎮 ${client.user.tag} is online`);
  setInterval(() => sendLiveGrid(client), 5 * 60 * 1000);
  setInterval(() => announceLiveStreamers(client), 2 * 60 * 1000);
  updateStats(client);
  setInterval(() => updateStats(client), 10 * 60 * 1000);
>>>>>>> 33a66b0 (Add login/logout flow and dashboard updatesAdd login/logout flow and dashboard updates)
  const sharedChannelId = process.env.STEAM_GAMES_CHANNEL_ID;
  if (sharedChannelId) {
    fetchAllFreeGames(client, sharedChannelId);
    setInterval(() => fetchAllFreeGames(client, sharedChannelId), 30 * 60 * 1000);
  }
<<<<<<< HEAD

=======
>>>>>>> 33a66b0 (Add login/logout flow and dashboard updatesAdd login/logout flow and dashboard updates)
  if (interactionHandler.autoRoleHandler) {
    interactionHandler.autoRoleHandler(client);
  }
});

client.on('interactionCreate', interaction => interactionHandler(interaction, client));

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.guild) console.log(`📩 DM from ${message.author.tag}: ${message.content}`);

  try {
    await messageHandler(message, client);
  } catch (err) {
    console.error(`❌ Error handling message from ${message.author.tag}:`, err);
    if (!message.guild) {
      try {
        await message.author.send("⚠️ Sorry, bot error. Try again later.");
      } catch {}
    }
  }

  const content = message.content.toLowerCase();
  const mayhemPattern = /\b(?:mayhem|m[a@]yhem|ma[yj]hem|m[\W_]*a[\W_]*y[\W_]*h[\W_]*e[\W_]*m)\b/i;
  if (mayhemPattern.test(content)) {
    try {
      await message.delete();
      const modLog = await client.channels.fetch(process.env.MOD_LOG_CHANNEL_ID);
      if (modLog) modLog.send(`🚫 **"Mayhem"** <@${message.author.id}> in <#${message.channel.id}>:\n\`${message.content}\``);
      await message.author.send("⚠️ Message removed due to restricted content: **mayhem**.");
    } catch (err) {
      console.error('❌ Mayhem moderation error:', err);
    }
    return;
  }

  const badPatterns = [/pornhub/i, /onlyfans/i, /nude/i, /xxx/i, /sex/i, /\.xxx/, /discord\.gg\/[\w-]+/i];
<<<<<<< HEAD
  const isMod = message.member?.roles.cache.some(role =>
    ['MODERATOR', 'ADMIN'].includes(role.name.toUpperCase())
  );
=======
  const isMod = message.member?.roles.cache.some(role => ['MODERATOR', 'ADMIN'].includes(role.name.toUpperCase()));
>>>>>>> 33a66b0 (Add login/logout flow and dashboard updatesAdd login/logout flow and dashboard updates)

  if (!isMod && badPatterns.some(pat => pat.test(content))) {
    try {
      await message.delete();
      const modLog = await client.channels.fetch(process.env.MOD_LOG_CHANNEL_ID);
      if (modLog) modLog.send(`🚫 **Filtered Message** <@${message.author.id}> in <#${message.channel.id}>:\n\`${message.content}\``);
      await message.author.send("⚠️ Yo, that kinda stuff isn’t allowed here. Chill out.");
    } catch (err) {
      console.error('❌ Content filter error:', err);
    }
  }
});

client.on('guildMemberAdd', require('./events/guildMemberAdd'));
client.on('guildMemberRemove', require('./events/guildMemberRemove'));
client.on('guildBanAdd', require('./events/guildBanAdd'));

client.login(process.env.BOT_TOKEN).catch(err => {
  console.error('❌ Discord login failed:', err);
});

<<<<<<< HEAD
server.listen(PORT)
  .once('listening', () => {
    console.log(`🖥️ Dashboard + Callback server running on port ${PORT}`);
    if (process.env.NF_PUBLIC_URL) {
      console.log(`🌍 Access it here: ${process.env.NF_PUBLIC_URL}/dashboard`);
    }
  })
  .on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use. Callback/dashboard server was not started.`);
    } else {
      console.error('❌ Unexpected server error:', err);
    }
  });

=======
// === 🚀 LAUNCH DASHBOARD SERVER ===
server.listen(PORT, () => {
  console.log(`🖥️ Dashboard + Callback server running on port ${PORT}`);
  if (process.env.NF_PUBLIC_URL) {
    console.log(`🌍 Access it here: ${process.env.NF_PUBLIC_URL}`);
  }
});

// === GLOBAL ERROR HANDLING ===
>>>>>>> 33a66b0 (Add login/logout flow and dashboard updatesAdd login/logout flow and dashboard updates)
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', promise, 'Reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});
<<<<<<< HEAD
// === ✅ END OF FILE ===
=======
// === ✅ END OF FILE ===
>>>>>>> 33a66b0 (Add login/logout flow and dashboard updatesAdd login/logout flow and dashboard updates)
