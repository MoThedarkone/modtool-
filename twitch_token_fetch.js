require('dotenv').config();
const fetch = require('node-fetch');

const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_SECRET;
const REDIRECT_URI = process.env.TWITCH_REDIRECT_URI;
const CODE = 'x63n8ok8bcyh4hzvk47xyd76yhatfx'; // Replace with the actual code

(async () => {
  try {
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code: CODE,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI,
    });

    const res = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      body: params,
    });

    const data = await res.json();

    // 🧪 Log the raw API response
    console.log('🔍 Raw response from Twitch:');
    console.log(data);

    // Show parsed tokens (if successful)
    console.log('=== Your Twitch Tokens ===');
    console.log('ACCESS TOKEN:', data.access_token);
    console.log('REFRESH TOKEN:', data.refresh_token);
    console.log('Expires in:', data.expires_in, 'seconds');
  } catch (err) {
    console.error('❌ Error fetching tokens:', err);
  }
})();