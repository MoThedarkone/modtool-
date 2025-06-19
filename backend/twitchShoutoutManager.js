require('dotenv').config();
const tmi = require('tmi.js');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { getTwitchAccessToken } = require('./twitchTokenManager'); // ✅ USE SHARED TOKEN SYSTEM

// === File Paths ===
const twitchConfigPath = path.join(__dirname, '../data/twitchChannels.json');
const masterListPath = path.join(__dirname, '../data/masterList.json');

// === Load Twitch Config ===
let twitchConfig = {};
if (fs.existsSync(twitchConfigPath)) {
  twitchConfig = JSON.parse(fs.readFileSync(twitchConfigPath, 'utf8'));
}

// === Enabled Channels ===
const enabledChannels = Object.entries(twitchConfig)
  .filter(([channel, cfg]) => cfg.enabled)
  .map(([channel]) => channel);

// === Connect to TMI ===
const client = new tmi.Client({
  identity: {
    username: process.env.TWITCH_BOT_USERNAME,
    password: process.env.TWITCH_OAUTH_TOKEN // ✅ used only for IRC login
  },
  channels: enabledChannels
});

client.connect();

// === Reload Channel List Dynamically ===
function reloadChannels() {
  if (!fs.existsSync(twitchConfigPath)) return;
  const newConfig = JSON.parse(fs.readFileSync(twitchConfigPath, 'utf8'));
  const newEnabled = Object.entries(newConfig)
    .filter(([channel, cfg]) => cfg.enabled)
    .map(([channel]) => channel);

  client.getChannels().forEach(channel => {
    if (!newEnabled.includes(channel)) client.part(channel);
  });
  newEnabled.forEach(channel => {
    if (!client.getChannels().includes(channel)) client.join(channel);
  });
}

// === Send Twitch API Shoutout (popup) ===
async function sendTwitchShoutoutAPI(targetUsername) {
  try {
    const accessToken = await getTwitchAccessToken(); // ✅ GET FROM SHARED TOKEN FILE

    const idRes = await fetch(`https://api.twitch.tv/helix/users?login=${targetUsername}`, {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const idData = await idRes.json();
    if (!idData.data || !idData.data.length) {
      console.error('❌ No such user to shout out:', targetUsername);
      return false;
    }

    const to_user_id = idData.data[0].id;

    const res = await fetch('https://api.twitch.tv/helix/chat/shoutouts', {
      method: 'POST',
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        broadcaster_id: process.env.TWITCH_BROADCASTER_ID,
        moderator_id: process.env.TWITCH_MODERATOR_ID,
        to_user_id
      })
    });

    if (!res.ok) {
      const error = await res.text();
      console.error('[Twitch Shoutout API ERROR]', error);
      return false;
    }

    console.log('[✅ Twitch Shoutout API] Sent shoutout to:', targetUsername);
    return true;
  } catch (e) {
    console.error('[❌ Twitch Shoutout API Error]', e);
    return false;
  }
}

// === Handle Chat Events ===
client.on('chat', async (channel, userstate, message, self) => {
  if (self) return;
  if (!userstate.mod && !userstate.badges?.broadcaster) return;

  reloadChannels();

  let masterList = [];
  if (fs.existsSync(masterListPath)) {
    masterList = JSON.parse(fs.readFileSync(masterListPath, 'utf8'));
  }
  const streamerUsernames = masterList.map(s => s.username.toLowerCase());

  // Manual Shoutout: !so username
  const parts = message.trim().split(/\s+/);
  if (parts[0] === '!so' && parts[1]) {
    const target = parts[1].replace('@', '').toLowerCase();
    if (streamerUsernames.includes(target)) {
      const ok = await sendTwitchShoutoutAPI(target);
      if (!ok) {
        client.say(channel, `🚀 Shoutout to https://twitch.tv/${target} – Go show some love!`);
      }
    }
  }

  // Auto Shoutout when someone in master list joins chat
  const username = userstate.username.toLowerCase();
  if (streamerUsernames.includes(username)) {
    if (!twitchConfig[channel].lastShoutedOut) {
      twitchConfig[channel].lastShoutedOut = {};
    }

    const last = twitchConfig[channel].lastShoutedOut[username] || 0;
    const now = Date.now();

    if (now - last > 1000 * 60 * 60) { // 1 hour cooldown
      const ok = await sendTwitchShoutoutAPI(username);
      if (!ok) {
        client.say(channel, `🚀 Auto-shoutout for ${userstate.username}! Check them out at https://twitch.tv/${userstate.username}`);
      }

      twitchConfig[channel].lastShoutedOut[username] = now;
      fs.writeFileSync(twitchConfigPath, JSON.stringify(twitchConfig, null, 2));
    }
  }
});

module.exports = client;
