// utils/fetchLiveStreamers.js

const fs = require('fs');
const fetch = require('node-fetch');

/**
 * Fetches live streamers from the Twitch API based on masterList.json.
 * Returns an array of streamer objects: [{ username, game, uptime }]
 */
module.exports = async function fetchLiveStreamers() {
  // Load master list of streamers
  const masterListPath = './data/masterList.json';
  if (!fs.existsSync(masterListPath)) return [];

  const streamers = JSON.parse(fs.readFileSync(masterListPath, 'utf-8'));
  if (!streamers.length) return [];

  // Build query for all usernames
  const usernames = streamers.map(s => s.username.toLowerCase());
  const query = usernames.map(u => `user_login=${u}`).join('&');

  // Get a fresh Twitch access token (client credentials flow)
  const getTwitchAccessToken = async () => {
    const res = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_SECRET}&grant_type=client_credentials`,
      { method: 'POST' }
    );
    const data = await res.json();
    return data.access_token;
  };

  const token = await getTwitchAccessToken();

  // Fetch live streamers from Twitch
  const res = await fetch(`https://api.twitch.tv/helix/streams?${query}`, {
    headers: {
      'Client-ID': process.env.TWITCH_CLIENT_ID,
      'Authorization': `Bearer ${token}`,
    },
  });

  const twitchData = await res.json();
  if (!twitchData.data || !Array.isArray(twitchData.data)) return [];

  // Map the data to your expected format for Discord
  const liveStreamers = twitchData.data.map(stream => {
    // Calculate stream uptime
    const startedAt = new Date(stream.started_at);
    const now = new Date();
    const diffMs = now - startedAt;
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs / (1000 * 60)) % 60);
    const uptime = `${diffHrs ? `${diffHrs}h ` : ''}${diffMins}m`;

    return {
      username: stream.user_name,
      game: stream.game_name,
      uptime,
      user_login: stream.user_login,
      viewer_count: stream.viewer_count,
    };
  });

  return liveStreamers;
};