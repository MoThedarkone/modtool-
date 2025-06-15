require('dotenv').config();
const tmi = require('tmi.js');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Paths for config and lists
const twitchConfigPath = path.join(__dirname, 'data', 'twitchChannels.json');
const masterListPath = path.join(__dirname, 'data', 'masterList.json');

// Load config
let twitchConfig = {};
if (fs.existsSync(twitchConfigPath)) {
  twitchConfig = JSON.parse(fs.readFileSync(twitchConfigPath, 'utf8'));
}

// Enabled channels
const enabledChannels = Object.entries(twitchConfig)
  .filter(([channel, cfg]) => cfg.enabled)
  .map(([channel]) => channel);

// TMI client for chat presence/fallback
const client = new tmi.Client({
  identity: {
    username: process.env.TWITCH_BOT_USERNAME,
    password: process.env.TWITCH_OAUTH_TOKEN, // "oauth:xxx"
  },
  channels: enabledChannels
});

client.connect();

// Utility: Reload channels if config changes (optional)
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

// === HELPER: Send Twitch official API shoutout (popup, not just chat msg) ===
async function sendTwitchShoutoutAPI(targetUsername) {
  try {
    // Get numeric user id for username
    const idRes = await fetch(`https://api.twitch.tv/helix/users?login=${targetUsername}`, {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${process.env.TWITCH_OAUTH_TOKEN.replace('oauth:', '')}`
      }
    });
    const idData = await idRes.json();
    if (!idData.data || !idData.data.length) {
      console.error('No such user to shout out:', targetUsername);
      return false;
    }
    const to_user_id = idData.data[0].id;

    // POST to /helix/chat/shoutouts
    const res = await fetch('https://api.twitch.tv/helix/chat/shoutouts', {
      method: 'POST',
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${process.env.TWITCH_OAUTH_TOKEN.replace('oauth:', '')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        broadcaster_id: process.env.TWITCH_BROADCASTER_ID, // * Numeric
        moderator_id: process.env.TWITCH_MODERATOR_ID,     // * Numeric (can be the same as broadcaster)
        to_user_id
      })
    });

    if (!res.ok) {
      const error = await res.text();
      console.error('[Twitch Shoutout API ERROR]', error);
      return false;
    }

    console.log('[Twitch Shoutout API] Successfully sent shoutout for:', targetUsername);
    return true;
  } catch (e) {
    console.error('[Twitch Shoutout API] Error:', e);
    return false;
  }
}

// === Main chat logic ===
client.on('chat', async (channel, userstate, message, self) => {
  if (self) return;

  // Only run if bot is a mod or broadcaster in this channel
  if (!userstate.mod && !userstate.badges?.broadcaster) return;

  reloadChannels();

  // Load master list
  let masterList = [];
  if (fs.existsSync(masterListPath)) {
    masterList = JSON.parse(fs.readFileSync(masterListPath, 'utf8'));
  }
  const streamerUsernames = masterList.map(s => s.username.toLowerCase());

  // MANUAL SHOUTOUT: !so username (use Twitch endpoint, fallback to chat msg)
  const parts = message.trim().split(/\s+/);
  if (parts[0] === '!so' && parts[1]) {
    const target = parts[1].replace('@', '').toLowerCase();
    if (streamerUsernames.includes(target)) {
      const ok = await sendTwitchShoutoutAPI(target);
      if (!ok) {
        // Fallback to chat shoutout
        client.say(channel, `🚀 Shoutout to https://twitch.tv/${target} – Go show some love!`);
      }
    }
  }

  // --- AUTOMATED SHOUTOUT: If someone in master list joins chat ---
  if (streamerUsernames.includes(userstate.username.toLowerCase())) {
    if (!twitchConfig[channel].lastShoutedOut) twitchConfig[channel].lastShoutedOut = {};
    const last = twitchConfig[channel].lastShoutedOut[userstate.username] || 0;
    const now = Date.now();
    if (now - last > 1000 * 60 * 60) { // Shoutout cooldown: 1 hour per user per channel
      const ok = await sendTwitchShoutoutAPI(userstate.username.toLowerCase());
      if (!ok) {
        client.say(channel, `🚀 Auto-shoutout for ${userstate.username}! Check them out at https://twitch.tv/${userstate.username}`);
      }
      twitchConfig[channel].lastShoutedOut[userstate.username] = now;
      fs.writeFileSync(twitchConfigPath, JSON.stringify(twitchConfig, null, 2));
    }
  }
});

module.exports = client;