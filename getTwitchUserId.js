require('dotenv').config();
const fetch = require('node-fetch');

const CLIENT_ID = 'i5j82qj9pr7ncqtvbopcw4klcvcvg7'; // * Put your bot account's client ID here
const OAUTH_TOKEN = 'u02tvitahha5xmtf8y9z3ezdf0j99t'; // * Paste your OAuth token here (remove 'oauth:' if present)
const USERNAME = 'Mo_thedarkone'; // * Username you want to look up

(async () => {
  const res = await fetch(`https://api.twitch.tv/helix/users?login=${USERNAME}`, {
    headers: {
      'Client-ID': CLIENT_ID,
      'Authorization': `Bearer ${OAUTH_TOKEN.replace('oauth:', '')}`
    }
  });
  const data = await res.json();
  if (data.data && data.data.length > 0) {
    console.log(`Numeric User ID for ${USERNAME}:`, data.data[0].id);
  } else {
    console.log('User not found!');
  }
})();