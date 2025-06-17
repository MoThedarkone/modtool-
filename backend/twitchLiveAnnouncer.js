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

let accessToken = null;

async function refreshAccessToken() {
  console.log('🔁 Refreshing Twitch access token...');
  const res = await fetch(`https://id.twitch.tv/oauth2/token`, {
    method: 'POST',
    body: new URLSearchParams({
      client_id: process.env.TWITCH_CLIENT_ID,
      client_secret: process.env.TWITCH_SECRET,
      grant_type: 'refresh_token',
      refresh_token: process.env.TWITCH_REFRESH_TOKEN,
    }),
  });

  const data = await res.json();
  if (!data.access_token) {
    console.error('❌ [Twitch] Failed to refresh token:', data);
    return null;
  }

  accessToken = data.access_token;
  console.log('✅ New Twitch access token acquired.');
  return accessToken;
}

async function getLiveStreamers(usernames) {
  if (!accessToken) await refreshAccessToken();
  if (!usernames.length) return [];

  const query = usernames.map(u => `user_login=${u}`).join('&');
  const res = await fetch(`https://api.twitch.tv/helix/streams?${query}`, {
    headers: {
      'Client-ID': process.env.TWITCH_CLIENT_ID,
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (res.status === 401) {
    console.warn('🔒 [Twitch] Token expired, refreshing...');
    await refreshAccessToken();
    return getLiveStreamers(usernames); // Retry once
  }

  const data = await res.json();
  return data.data || [];
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
    const liveNow = await getLiveStreamers(usernames);

    const currentlyLive = {};
    for (const s of liveNow) {
      currentlyLive[s.user_login.toLowerCase()] = s;
    }

    // 🟣 Announce new streamers
    for (const s of liveNow) {
      const uname = s.user_login.toLowerCase();
      if (!cache[uname]) {
        const embed = new EmbedBuilder()
          .setAuthor({
            name: `${s.user_name} is now live on Twitch!`,
            iconURL: 'https://cdn.discordapp.com/attachments/1295047768103977004/1384323653155553360/Untitled_design.png',
          })
          .setTitle(s.title || 'Untitled Stream')
          .setURL(`https://twitch.tv/${s.user_login}`)
          .setDescription(`🎮 **Game:** ${s.game_name || 'Unknown'}\n👥 **Viewers:** ${s.viewer_count}`)
          .setImage(`https://static-cdn.jtvnw.net/previews-ttv/live_user_${s.user_login}-640x360.jpg`)
          .setColor(0x9146FF)
          .setFooter({ text: 'SLAY GBTV' })
          .setTimestamp();

        const msg = await announceChannel.send({ embeds: [embed] });
        cache[uname] = { messageId: msg.id, postedAt: Date.now() };
        fs.writeFileSync(postCachePath, JSON.stringify(cache, null, 2));
      }
    }

    // 🧹 Remove offline streamers
    for (const uname in cache) {
      if (!currentlyLive[uname]) {
        try {
          const msg = await announceChannel.messages.fetch(cache[uname].messageId);
          await msg.delete();
        } catch {}
        delete cache[uname];
        fs.writeFileSync(postCachePath, JSON.stringify(cache, null, 2));
      }
    }
  }, 30 * 1000); // Check every 30 seconds
}

module.exports = { init };
