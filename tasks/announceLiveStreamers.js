// tasks/announceLiveStreamers.js

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { EmbedBuilder } = require('discord.js');

const MASTER_LIST = path.join(__dirname, '../data/masterList.json');
const ANNOUNCE_CACHE = path.join(__dirname, '../data/liveAnnounceCache.json');

let announcedStreamers = {};
if (fs.existsSync(ANNOUNCE_CACHE)) {
  try {
    announcedStreamers = JSON.parse(fs.readFileSync(ANNOUNCE_CACHE));
  } catch (err) {
    console.warn('⚠️ [Announce] Could not load announce cache, starting fresh.');
    announcedStreamers = {};
  }
}

async function getAccessToken() {
  const res = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_SECRET}&grant_type=client_credentials`, {
    method: 'POST',
  });
  const data = await res.json();
  return data.access_token;
}

async function getLiveStreamers(usernames, token) {
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

async function announceLiveStreamers(client) {
  const guild = client.guilds.cache.get(process.env.GUILD_ID);
  const channel = guild?.channels.cache.get(process.env.LIVE_NOW_CHANNEL_ID);
  if (!channel || !channel.isTextBased()) return;

  const masterList = JSON.parse(fs.readFileSync(MASTER_LIST));
  const usernames = masterList.map(s => s.username.toLowerCase());
  const token = await getAccessToken();
  const liveData = await getLiveStreamers(usernames, token);

  const currentlyLive = {};

  for (const stream of liveData) {
    const login = stream.user_login.toLowerCase();
    currentlyLive[login] = true;

    if (!announcedStreamers[login]) {
      const embed = new EmbedBuilder()
        .setTitle(`${stream.user_name} is LIVE!`)
        .setURL(`https://twitch.tv/${stream.user_login}`)
        .setDescription(`**${stream.title}**\n🎮 ${stream.game_name} | 👥 ${stream.viewer_count} viewers`)
        .setColor(0x9146FF)
        .setThumbnail(stream.thumbnail_url.replace('-{width}x{height}', '-80x80'))
        .setImage(stream.thumbnail_url.replace('-{width}x{height}', '-640x360'))
        .setTimestamp();

      const sentMessage = await channel.send({ content: `@everyone ${stream.user_name} just went live!`, embeds: [embed] });
      announcedStreamers[login] = sentMessage.id;
    }
  }

  // Check who went offline
  for (const login in announcedStreamers) {
    if (!currentlyLive[login]) {
      try {
        const messageId = announcedStreamers[login];
        const oldMsg = await channel.messages.fetch(messageId);
        await oldMsg.delete();
        delete announcedStreamers[login];
      } catch (err) {
        console.warn(`⚠️ [Announce] Could not delete old message for ${login}`);
      }
    }
  }

  fs.writeFileSync(ANNOUNCE_CACHE, JSON.stringify(announcedStreamers, null, 2));
}

module.exports = announceLiveStreamers;
