require('dotenv').config();
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const tokenCachePath = path.join(__dirname, '../data/twitchTokenCache.json');

// === Load token cache ===
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

// === Save token cache ===
function saveTokenCache(data) {
  try {
    fs.writeFileSync(tokenCachePath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('❌ Failed to save token cache:', err);
  }
}

// === Refresh token if expired or near expiry ===
async function refreshTwitchTokenIfNeeded() {
  const cache = loadTokenCache();
  const now = Date.now();

  // Only refresh if less than 2.5h left
  const bufferTime = 1000 * 60 * 10; // 10 minutes buffer
  const refreshThreshold = 1000 * 60 * 60 * 2.5; // 2.5 hours

  if (cache.access_token && now < cache.expires_at - bufferTime) {
    return; // ✅ Still good
  }

  console.log('🔄 [TwitchTokenManager] Refreshing Twitch token...');

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
      expires_at: now + (data.expires_in * 1000)
    };

    saveTokenCache(updated);

    // Optional override for IRC (tmi.js)
    process.env.TWITCH_OAUTH_TOKEN = updated.access_token;
    process.env.TWITCH_REFRESH_TOKEN = updated.refresh_token;

    console.log('✅ [TwitchTokenManager] Token refreshed and saved');
  } catch (err) {
    console.error('❌ [TwitchTokenManager] Error refreshing token:', err);
  }
}

// === Get current access token (refreshed if needed) ===
async function getTwitchAccessToken() {
  await refreshTwitchTokenIfNeeded();
  const cache = loadTokenCache();
  return cache.access_token;
}

// === For IRC: return token in oauth: format ===
async function getTmiOauthToken() {
  const token = await getTwitchAccessToken();
  return `oauth:${token}`;
}

module.exports = {
  getTwitchAccessToken,
  getTmiOauthToken,
  refreshTwitchTokenIfNeeded
};
