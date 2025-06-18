require('dotenv').config();
const fetch = require('node-fetch');

let currentToken = null;
let expiresAt = 0;

async function getAccessToken() {
  const now = Date.now();
  if (currentToken && now < expiresAt) return currentToken;

  try {
    const res = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: process.env.TWITCH_REFRESH_TOKEN,
        client_id: process.env.TWITCH_CLIENT_ID,
        client_secret: process.env.TWITCH_SECRET
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));

    currentToken = data.access_token;
    expiresAt = now + (data.expires_in * 1000) - 10000; // Refresh 10s early
    console.log('🔁 [TwitchAuthHelper] New access token acquired');

    return currentToken;
  } catch (err) {
    console.error('❌ [TwitchAuthHelper] Failed to refresh token:', err);
    throw err;
  }
}

module.exports = { getAccessToken };
