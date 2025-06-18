// backend/twitchTokenManager.js
require('dotenv').config();
const fetch = require('node-fetch');

let cachedToken = null;
let tokenExpiry = 0;

async function getTwitchAccessToken() {
  const now = Date.now();

  if (cachedToken && now < tokenExpiry - 60000) {
    return cachedToken;
  }

  const params = new URLSearchParams();
  params.append('client_id', process.env.TWITCH_CLIENT_ID);
  params.append('client_secret', process.env.TWITCH_SECRET);
  params.append('grant_type', 'refresh_token');
  params.append('refresh_token', process.env.TWITCH_REFRESH_TOKEN);

  const res = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    body: params
  });

  const data = await res.json();

  if (!res.ok || !data.access_token) {
    console.error('❌ Failed to refresh Twitch token:', data);
    throw new Error('Failed to refresh Twitch token');
  }

  cachedToken = data.access_token;
  tokenExpiry = now + data.expires_in * 1000;

  console.log('🔄 New Twitch token obtained.');
  return cachedToken;
}

module.exports = { getTwitchAccessToken };
