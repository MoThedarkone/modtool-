// backend/twitchTokenManager.js
require('dotenv').config();
const fs = require('fs');
const fetch = require('node-fetch');
const path = require('path');

const cachePath = path.join(__dirname, 'twitchTokenCache.json');

async function getTwitchAccessToken() {
  let tokenData = null;

  // Try reading cache
  if (fs.existsSync(cachePath)) {
    try {
      tokenData = JSON.parse(fs.readFileSync(cachePath));
    } catch (err) {
      console.error('⚠️ Error reading Twitch token cache:', err);
    }
  }

  // If token exists and hasn't expired
  const now = Math.floor(Date.now() / 1000);
  if (tokenData?.access_token && tokenData.expires_at > now + 60) {
    return tokenData.access_token;
  }

  // Fetch new token
  try {
    const resp = await fetch(`https://id.twitch.tv/oauth2/token?grant_type=refresh_token&refresh_token=${process.env.TWITCH_REFRESH_TOKEN}&client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_SECRET}`, {
      method: 'POST'
    });

    const json = await resp.json();

    if (!json.access_token) {
      throw new Error(JSON.stringify(json));
    }

    // Save to cache
    const newTokenData = {
      access_token: json.access_token,
      expires_at: now + json.expires_in
    };
    fs.writeFileSync(cachePath, JSON.stringify(newTokenData, null, 2));
    return newTokenData.access_token;
  } catch (err) {
    console.error('❌ Failed to refresh Twitch token:', err);
    throw err;
  }
}

module.exports = { getTwitchAccessToken };
