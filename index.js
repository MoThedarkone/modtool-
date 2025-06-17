// === ✅ START OF MERGED INDEX FILE ===
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const http = require('http');
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
require('./backend/twitchLiveAnnouncer');
require('./backend/twitchClipListener');

// === 🔧 DASHBOARD SERVER + CALLBACK ===
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const PORT = process.env.PORT || 8080; // ✅ Use 8080 for Northflank
let dashboardClients = [];

app.use(express.static(path.join(__dirname, '.')));

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

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

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
  const sharedChannelId = process.env.STEAM_GAMES_CHANNEL_ID;
  if (sharedChannelId) {
    fetchAllFreeGames(client, sharedChannelId);
    setInterval(() => fetchAllFreeGames(client, sharedChannelId), 30 * 60 * 1000);
  }
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
  const isMod = message.member?.roles.cache.some(role => ['MODERATOR', 'ADMIN'].includes(role.name.toUpperCase()));

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

// === 🚀 LAUNCH DASHBOARD SERVER ===
server.listen(PORT, () => {
  console.log(`🖥️ Dashboard + Callback server running on port ${PORT}`);
  if (process.env.NF_PUBLIC_URL) {
    console.log(`🌍 Access it here: ${process.env.NF_PUBLIC_URL}`);
  }
});

// === GLOBAL ERROR HANDLING ===
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', promise, 'Reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});
// === ✅ END OF FILE ===
