require('dotenv').config();
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// === Location to store the active tokens ===
const tokenCachePath = path.join(__dirname, 'data', 'twitchTokenCache.json');

// === Load token cache from file ===
function loadTokenCache() {
  if (fs.existsSync(tokenCachePath)) {
    try {
      return JSON.parse(fs.readFileSync(tokenCachePath, 'utf8'));
    } catch (err) {
      console.error('⚠️ Failed to parse token cache:', err);
    }
  }
  return {
    access_token: process.env.TWITCH_OAUTH_TOKEN || '',
    refresh_token: process.env.TWITCH_REFRESH_TOKEN || '',
    expires_at: 0
  };
}

// === Save token cache to file ===
function saveTokenCache(data) {
  fs.writeFileSync(tokenCachePath, JSON.stringify(data, null, 2));
}

// === Refresh access token if expired ===
async function refreshTwitchTokenIfNeeded() {
  const cache = loadTokenCache();
  const now = Date.now();

  if (now < cache.expires_at - 60 * 1000) {
    return; // ✅ Token still valid
  }

  console.log('🔄 Refreshing Twitch token...');

  try {
    const res = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: cache.refresh_token,
        client_id: process.env.TWITCH_CLIENT_ID,
        client_secret: process.env.TWITCH_SECRET
      })
    });

    const data = await res.json();

    if (!data.access_token || !data.refresh_token) {
      console.error('❌ Token refresh failed:', data);
      return;
    }

    const updated = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + (data.expires_in * 1000)
    };

    saveTokenCache(updated);

    // Update current process.env in memory (optional but helpful for IRC)
    process.env.TWITCH_OAUTH_TOKEN = updated.access_token;
    process.env.TWITCH_REFRESH_TOKEN = updated.refresh_token;

    console.log('✅ Twitch token refreshed and saved!');
  } catch (err) {
    console.error('❌ Error refreshing token:', err);
  }
}

// === Get the current token (always valid) ===
async function getTwitchAccessToken() {
  await refreshTwitchTokenIfNeeded();
  const cache = loadTokenCache();
  return cache.access_token;
}

module.exports = {
  getTwitchAccessToken,
  refreshTwitchTokenIfNeeded
};
