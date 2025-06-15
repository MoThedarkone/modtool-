// twitchLiveAnnouncer.js
require('dotenv').config();
const fs = require('fs');
const fetch = require('node-fetch');

const masterListPath = './data/masterList.json';
const postCachePath = './data/liveAnnouncementCache.json';

let cache = {};
if (fs.existsSync(postCachePath)) {
  try {
    cache = JSON.parse(fs.readFileSync(postCachePath, 'utf8'));
  } catch {
    cache = {};
  }
}

async function getTwitchAccessToken() {
  const res = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_SECRET}&grant_type=client_credentials`, {
    method: 'POST',
  });
  const data = await res.json();
  return data.access_token;
}

async function getLiveStreamers(usernames, token) {
  if (!usernames.length) return [];
  const query = usernames.map(u => `user_login=${u}`).join('&');
  const res = await fetch(`https://api.twitch.tv/helix/streams?${query}`, {
    headers: {
      'Client-ID': process.env.TWITCH_CLIENT_ID,
      'Authorization': `Bearer ${token}`,
    },
  });
  const data = await res.json();
  return data.data;
}

async function init(client) {
  const channelId = process.env.LIVE_ANNOUNCE_CHANNEL_ID || process.env.LIVE_CHANNEL_ID;
  if (!channelId) return console.error('❌ LIVE_ANNOUNCE_CHANNEL_ID not set in .env');

  const announceChannel = await client.channels.fetch(channelId).catch(() => null);
  if (!announceChannel) return console.error('❌ Could not find live announcement channel.');

  setInterval(async () => {
    let masterList = [];
    try {
      masterList = JSON.parse(fs.readFileSync(masterListPath));
    } catch {
      masterList = [];
    }
    const usernames = masterList.map(s => s.username.toLowerCase());

    const token = await getTwitchAccessToken();
    const liveNow = await getLiveStreamers(usernames, token);

    // Map of username => live data
    const currentlyLive = {};
    for (const s of liveNow) {
      currentlyLive[s.user_login.toLowerCase()] = s;
    }

    // 1. Post new announcements for streamers just gone live
    for (const s of liveNow) {
      const uname = s.user_login.toLowerCase();
      if (!cache[uname]) {
        // Not already announced
        const msg = await announceChannel.send({
          content: `🔴 **${s.user_name}** is LIVE! [Watch here](https://twitch.tv/${s.user_login})\n🎮 Playing: ${s.game_name || 'Unknown'}\n👥 ${s.viewer_count} watching`,
        });
        cache[uname] = { messageId: msg.id, postedAt: Date.now() };
        fs.writeFileSync(postCachePath, JSON.stringify(cache, null, 2));
      }
    }

    // 2. Remove announcements for streamers who are no longer live
    for (const uname in cache) {
      if (!currentlyLive[uname]) {
        // Was live, now offline
        try {
          const msg = await announceChannel.messages.fetch(cache[uname].messageId);
          await msg.delete();
        } catch (e) {
          // Might already be deleted, ignore
        }
        delete cache[uname];
        fs.writeFileSync(postCachePath, JSON.stringify(cache, null, 2));
      }
    }
  }, 2 * 60 * 1000); // Checks every 2 minutes (adjust if needed)
}

module.exports = { init };