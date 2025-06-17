//twitchLiveAnnouncer.js

require('dotenv').config();
const fs = require('fs');
const fetch = require('node-fetch');
const { EmbedBuilder } = require('discord.js');

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

// 🔁 Refresh token logic (non-expiring)
async function getRefreshedAccessToken() {
  const params = new URLSearchParams({
    client_id: process.env.TWITCH_CLIENT_ID,
    client_secret: process.env.TWITCH_SECRET,
    grant_type: 'refresh_token',
    refresh_token: process.env.TWITCH_REFRESH_TOKEN,
  });

  const res = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    body: params
  });

  const data = await res.json();
  if (!data.access_token) {
    console.error('❌ Failed to refresh access token:', data);
    return null;
  }
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
  return data.data || [];
}

async function init(client) {
  const channelId = process.env.LIVE_ANNOUNCE_CHANNEL_ID || process.env.LIVE_CHANNEL_ID;
  if (!channelId) return console.error('❌ LIVE_ANNOUNCE_CHANNEL_ID not set.');

  const announceChannel = await client.channels.fetch(channelId).catch(() => null);
  if (!announceChannel) return console.error('❌ Could not find announcement channel.');

  setInterval(async () => {
    let masterList = [];
    try {
      masterList = JSON.parse(fs.readFileSync(masterListPath));
    } catch {
      masterList = [];
    }

    const usernames = masterList.map(s => s.username.toLowerCase());
    const token = await getRefreshedAccessToken();
    if (!token) return;

    const liveNow = await getLiveStreamers(usernames, token);

    const currentlyLive = {};
    for (const s of liveNow) {
      currentlyLive[s.user_login.toLowerCase()] = s;
    }

    // Announce new live streamers
    for (const s of liveNow) {
      const uname = s.user_login.toLowerCase();
      if (!cache[uname]) {
        const embed = new EmbedBuilder()
          .setColor(0x9146FF)
          .setTitle(`${s.user_name} is now LIVE!`)
          .setDescription(`🎮 **${s.game_name || 'Unknown'}**\n👥 **${s.viewer_count} viewers**\n\n[Watch now](https://twitch.tv/${s.user_login})`)
          .setThumbnail(`https://static-cdn.jtvnw.net/previews-ttv/live_user_${s.user_login}-440x248.jpg`)
          .setTimestamp()
          .setAuthor({
            name: "Twitch Stream Alert",
            iconURL: "https://cdn.discordapp.com/attachments/1295047768103977004/1384323653155553360/Untitled_design.png"
          });

        const msg = await announceChannel.send({ embeds: [embed] });
        cache[uname] = { messageId: msg.id, postedAt: Date.now() };
        fs.writeFileSync(postCachePath, JSON.stringify(cache, null, 2));
      }
    }

    // Delete offline streamers
    for (const uname in cache) {
      if (!currentlyLive[uname]) {
        try {
          const msg = await announceChannel.messages.fetch(cache[uname].messageId);
          await msg.delete();
        } catch (e) {}
        delete cache[uname];
        fs.writeFileSync(postCachePath, JSON.stringify(cache, null, 2));
      }
    }
  }, 30 * 1000); // Every 30 seconds
}

module.exports = { init };
