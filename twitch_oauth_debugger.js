require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');

const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_SECRET;

// ✅ Northflank public callback URI (do not change this if already set in Twitch dev console)
const REDIRECT_URI = "https://site--modtool--2y2w4frcxrmv.code.run/callback";

const SCOPES = [
  "chat:read",
  "chat:edit",
  "moderator:read:shoutouts",
  "moderator:manage:shoutouts",
  "user:read:chat",
  "clips:edit"
].join(" ");

const app = express();

// 🌐 OAuth callback endpoint
app.get("/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) {
    res.status(400).send("Missing 'code' parameter.");
    console.error("❌ No authorization code in callback URL.");
    return;
  }

  console.log("🔐 Received Twitch code:", code);

  const tokenParams = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code,
    grant_type: "authorization_code",
    redirect_uri: REDIRECT_URI,
  });

  try {
    const response = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      body: tokenParams,
    });

    const result = await response.json();
    console.log("📬 Twitch token response:", result);

    res.send(`
      <h2>✅ OAuth Complete</h2>
      <pre>${JSON.stringify(result, null, 2)}</pre>
      <p>Copy your access and refresh tokens into your <code>.env</code> file!</p>
    `);
  } catch (err) {
    console.error("❌ Token exchange failed:", err);
    res.status(500).send("Error exchanging token. Check logs.");
  }
});

// 🟢 Northflank sets the port automatically
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  const authUrl = new URL("https://id.twitch.tv/oauth2/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("scope", SCOPES);
  authUrl.searchParams.set("force_verify", "true");

  console.log("\n🔗 Open this in your browser to start Twitch authorization:");
  console.log(authUrl.toString());
<<<<<<< HEAD
});
=======
});
>>>>>>> 33a66b0 (Add login/logout flow and dashboard updatesAdd login/logout flow and dashboard updates)
