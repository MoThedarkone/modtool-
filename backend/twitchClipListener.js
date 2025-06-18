// twitchClipListener.js require('dotenv').config(); const tmi = require('tmi.js'); const fetch = require('node-fetch'); const fs = require('fs'); const { getTwitchAccessToken } = require('./utils/twitchTokenManager'); // ✅ NEW

const twitchChannelsPath = './data/twitchChannels.json';

// Load enabled channels from config let twitchChannels = []; if (fs.existsSync(twitchChannelsPath)) { try { const data = JSON.parse(fs.readFileSync(twitchChannelsPath)); twitchChannels = Object.keys(data).filter( ch => data[ch].enabled ).map(ch => ch.startsWith('#') ? ch.slice(1) : ch); } catch (err) { console.error('❌ Failed to read twitchChannels.json:', err); } }

const client = new tmi.Client({ identity: { username: process.env.TWITCH_BOT_USERNAME, password: process.env.TWITCH_OAUTH_TOKEN // should start with 'oauth:' }, channels: twitchChannels });

client.connect();

client.on('chat', async (channel, userstate, message, self) => { if (self) return;

const command = message.trim().toLowerCase(); const isMod = userstate.mod || userstate['user-type'] === 'mod' || userstate.badges?.broadcaster === '1';

if (isMod && command === '!clip') { client.say(channel, '📎 Creating a Twitch clip…');

try {
  const token = await getTwitchAccessToken(); // ✅ Get fresh access token
  const broadcaster = channel.replace('#', '');

  const resp = await fetch(
    `https://api.twitch.tv/helix/users?login=${broadcaster}`,
    {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${token}`
      }
    }
  );
  const json = await resp.json();
  const broadcasterId = json.data?.[0]?.id;

  if (!broadcasterId) {
    client.say(channel, "❌ Couldn't find broadcaster ID—clip failed.");
    return;
  }

  const clipResp = await fetch(
    `https://api.twitch.tv/helix/clips?broadcaster_id=${broadcasterId}`,
    {
      method: 'POST',
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  const clipJson = await clipResp.json();

  if (clipResp.status !== 202 || !clipJson.data || !clipJson.data[0]?.id) {
    client.say(channel, '⚠️ Could not create clip. Try again soon.');
    return;
  }

  const clipId = clipJson.data[0].id;
  client.say(channel, `🎉 Clip created! https://clips.twitch.tv/${clipId}`);
} catch (e) {
  console.error('Clip creation error:', e);
  client.say(channel, '⚠️ Error creating clip.');
}

} });

