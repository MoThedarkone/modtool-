// ✅ backend/twitchAuthHelper.js
require('dotenv').config();
const { getTwitchAccessToken } = require('./twitchTokenManager'); // ✅ Use unified token logic

/**
 * Returns a valid Twitch access token, always refreshed via twitchTokenManager
 */
async function getAccessToken() {
  return await getTwitchAccessToken(); // Delegates to the shared logic
}

module.exports = { getAccessToken };
