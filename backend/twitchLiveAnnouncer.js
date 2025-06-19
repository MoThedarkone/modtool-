require('dotenv').config();
const fs = require('fs');
const fetch = require('node-fetch');
const { EmbedBuilder } = require('discord.js');
const { getAccessToken } = require('./twitchAuthHelper'); // ✅ Use shared access logic

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

async function getUserInfo(usernames, token) {
  if (!usernames.length) return [];
  const query = usernames.map(u => `login=${u}`).join('&');
  const res = await fetch(`https://api.twitch.tv/helix/users?${query}`, {
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

    const token = await getAccessToken(); // ✅ New logic
    const liveNow = await getLiveStreamers(usernames, token);
    const userInfo = await getUserInfo(usernames, token);

    const userInfoMap = {};
    for (const u of userInfo) {
      userInfoMap[u.login.toLowerCase()] = u;
    }

    const currentlyLive = {};
    for (const s of liveNow) {
      currentlyLive[s.user_login.toLowerCase()] = s;
    }

    // 1. Announce new live streamers
    for (const s of liveNow) {
      const uname = s.user_login.toLowerCase();
      if (!cache[uname]) {
        const user = userInfoMap[uname];
        const thumb = s.thumbnail_url.replace('{width}', '1280').replace('{height}', '720');

        const embed = new EmbedBuilder()
          .setTitle(`${s.user_name} is LIVE!`)
          .setURL(`https://twitch.tv/${s.user_login}`)
          .setColor(0x9146FF)
          .setAuthor({
            name: 'Twitch',
            iconURL: 'https://cdn.discordapp.com/attachments/1295047768103977004/1384323653155553360/Untitled_design.png',
            url: `https://twitch.tv/${s.user_login}`,
          })
          .setThumbnail(user?.profile_image_url || null)
          .setImage(thumb + `?rand=${Date.now()}`)
          .setDescription(`🎮 **${s.game_name || 'Unknown Game'}**\n🗨️ ${s.title}`)
          .addFields({ name: '👥 Viewers', value: `${s.viewer_count}`, inline: true })
          .setTimestamp();

        const msg = await announceChannel.send({ embeds: [embed] });
        cache[uname] = { messageId: msg.id, postedAt: Date.now() };
        fs.writeFileSync(postCachePath, JSON.stringify(cache, null, 2));
      }
    }

    // 2. Remove offline streamers
    for (const uname in cache) {
      if (!currentlyLive[uname]) {
        try {
          const msg = await announceChannel.messages.fetch(cache[uname].messageId);
          await msg.delete();
        } catch {
          // Possibly already deleted
        }
        delete cache[uname];
        fs.writeFileSync(postCachePath, JSON.stringify(cache, null, 2));
      }
    }
  }, 30 * 1000); // 30s interval
}

module.exports = { init };
