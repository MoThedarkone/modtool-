require('dotenv').config();
const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// === File Paths ===
const MASTER_LIST_PATH = path.join(__dirname, '../data/masterList.json');
const MESSAGE_CACHE_PATH = path.join(__dirname, '../data/liveMessageCache.json');

// === Gamer bro style responses ===
const gamerReplies = {
  noLive: [
    'Nobody’s live right now... go touch some grass and check back later. 🌿',
    'Squad’s AFK. Time to refill your G‑Fuel and chill.',
    'It’s quiet... too quiet. No streams for now, my dude.',
    'All streamers are on cooldown. Come back in a bit, legend.',
  ],
  logStart: [
    'Looking for our streamer squad... scanning...',
    'Booting up the Twitch radar...',
    'Summoning the livestream gods...',
    'Loading the grid like it’s a boss fight...',
  ],
  logSuccess: [
    'Grid’s been refreshed — clean, crisp, and full of W energy.',
    'New message locked and loaded.',
    'Stream info delivered like a headshot.',
    'Mission complete. Stream squad updated.',
  ],
  logError: [
    'Bruh... something borked while updating the grid.',
    'Ran into an error while vibing with Twitch. Check the logs.',
    'Twitch said “nah” — grid update failed.',
    'Grid crash landed. Abort mission.',
  ]
};

const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

// === Twitch Auth Token Retrieval ===
const getTwitchAccessToken = async () => {
  console.log('🔑 [Twitch] Requesting access token...');
  try {
    const res = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_SECRET}&grant_type=client_credentials`, {
      method: 'POST',
    });
    const data = await res.json();
    if (!data.access_token) {
      console.error('❌ [Twitch] No access token received:', data);
      return null;
    }
    console.log('✅ [Twitch] Access token acquired.');
    return data.access_token;
  } catch (err) {
    console.error('❌ [Twitch] Failed to fetch token:', err);
    return null;
  }
};

// === Fetch Live Streamers ===
const getLiveStreamers = async (usernames, token) => {
  console.log('📡 [Twitch] Getting live status for:', usernames.join(', '));
  const query = usernames.map(u => `user_login=${u}`).join('&');
  const res = await fetch(`https://api.twitch.tv/helix/streams?${query}`, {
    headers: {
      'Client-ID': process.env.TWITCH_CLIENT_ID,
      'Authorization': `Bearer ${token}`,
    },
  });
  const data = await res.json();
  return data.data;
};

// === Send or Update the Live Grid ===
const sendLiveGrid = async (client) => {
  console.log('🟢', getRandom(gamerReplies.logStart));

  let channel;
  try {
    channel = await client.channels.fetch(process.env.GRID_CHANNEL_ID);
    if (!channel) {
      console.error('❌ [Grid] Live channel not found.');
      return;
    }
  } catch (err) {
    console.error('❌ [Grid] Failed to fetch live channel:', err);
    return;
  }

  let streamers = [];
  try {
    streamers = JSON.parse(fs.readFileSync(MASTER_LIST_PATH));
  } catch (err) {
    console.error('❌ [Grid] Failed to read masterList.json:', err);
    return;
  }

  const usernames = streamers.map(s => s.username.toLowerCase());

  const token = await getTwitchAccessToken();
  if (!token) return;

  let liveStreamers = [];
  try {
    liveStreamers = await getLiveStreamers(usernames, token);
  } catch (err) {
    console.error('❌ [Grid] Failed to get live streamers:', err);
    return;
  }

  let messageId = null;
  try {
    if (fs.existsSync(MESSAGE_CACHE_PATH)) {
      messageId = JSON.parse(fs.readFileSync(MESSAGE_CACHE_PATH)).messageId;
    }
  } catch (err) {
    console.warn('⚠️ [Grid] Failed to read liveMessageCache.json:', err);
  }

  try {
    if (!liveStreamers.length) {
      const embedMessage = new EmbedBuilder()
        .setTitle('🔴 Live on Twitch')
        .setColor(0x9146FF)
        .setDescription(getRandom(gamerReplies.noLive))
        .setTimestamp();

      if (messageId) {
        try {
          const oldMsg = await channel.messages.fetch(messageId);
          await oldMsg.edit({ embeds: [embedMessage] });
        } catch (err) {
          if (err.code === 10008) {
            console.warn(`⚠️ [Grid] Cached message not found (ID: ${messageId}) — reposting it.`);
            const newMessage = await channel.send({ embeds: [embedMessage] });
            fs.writeFileSync(MESSAGE_CACHE_PATH, JSON.stringify({ messageId: newMessage.id }));
          } else {
            throw err;
          }
        }
      } else {
        const newMessage = await channel.send({ embeds: [embedMessage] });
        fs.writeFileSync(MESSAGE_CACHE_PATH, JSON.stringify({ messageId: newMessage.id }));
      }

      console.log('✅', getRandom(gamerReplies.logSuccess));
      return;
    }

    liveStreamers.sort((a, b) => a.user_name.localeCompare(b.user_name));
    const embeds = [];

    for (let i = 0; i < liveStreamers.length; i += 25) {
      const chunk = liveStreamers.slice(i, i + 25);
      const embed = new EmbedBuilder()
        .setTitle(i === 0 ? '🔴 The Squad is LIVE' : null)
        .setColor(0x9146FF)
        .setTimestamp();

      chunk.forEach(stream => {
        embed.addFields({
          name: '\u200B',
          value: `**[${stream.user_name}](https://twitch.tv/${stream.user_login})**\n🎮 ${stream.game_name || 'Unknown'}\n👥 ${stream.viewer_count} viewers`,
          inline: false,
        });
      });

      embeds.push(embed);
    }

    if (messageId) {
      try {
        const oldMsg = await channel.messages.fetch(messageId);
        await oldMsg.edit({ embeds });
      } catch (err) {
        if (err.code === 10008) {
          console.warn(`⚠️ [Grid] Cached message not found (ID: ${messageId}) — reposting it.`);
          const newMessage = await channel.send({ embeds });
          fs.writeFileSync(MESSAGE_CACHE_PATH, JSON.stringify({ messageId: newMessage.id }));
        } else {
          throw err;
        }
      }
    } else {
      const newMessage = await channel.send({ embeds });
      fs.writeFileSync(MESSAGE_CACHE_PATH, JSON.stringify({ messageId: newMessage.id }));
    }

    console.log('✅', getRandom(gamerReplies.logSuccess));
  } catch (err) {
    console.error('❌', getRandom(gamerReplies.logError), err);
  }
};

module.exports = sendLiveGrid;
