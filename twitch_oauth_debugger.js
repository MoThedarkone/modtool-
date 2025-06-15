require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const open = require('open');

const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_SECRET;
const REDIRECT_URI = "http://localhost:3000/callback";
const PORT = 3000;

const SCOPES = [
  "chat:read",
  "chat:edit",
  "moderator:read:shoutouts",
  "moderator:manage:shoutouts",
  "user:read:chat",
  "clips:edit"
].join(" ");

const app = express();

// Step 2: Handle the OAuth callback
app.get("/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) {
    res.status(400).send("Missing 'code' parameter.");
    console.error("❌ No authorization code found in callback URL.");
    return;
  }

  console.log("🔐 Received code:", code);
  const url = "https://id.twitch.tv/oauth2/token";
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code,
    grant_type: "authorization_code",
    redirect_uri: REDIRECT_URI
  });

  console.log("📡 Sending POST to:", url);
  console.log("📦 Payload:", Object.fromEntries(params.entries()));

  try {
    const response = await fetch(url, {
      method: "POST",
      body: params
    });

    const result = await response.json();
    console.log("📬 Response from Twitch:", result);

    if (response.status !== 200) {
      console.error(`❌ Failed to exchange code. Status: ${response.status}`);
    }

    res.send(`
      <h2>OAuth Token Exchange Complete</h2>
      <pre>${JSON.stringify(result, null, 2)}</pre>
      <p>Check your console for details.</p>
    `);
  } catch (err) {
    console.error("❌ Error during fetch:", err);
    res.status(500).send("Internal Server Error. Check console for details.");
  }
});

// Step 1: Generate the auth URL and open in browser
app.listen(PORT, async () => {
  const authUrl = new URL("https://id.twitch.tv/oauth2/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("scope", SCOPES);
  authUrl.searchParams.set("force_verify", "true");

  console.log("\n🔗 Open the following URL in your browser:");
  console.log(authUrl.toString());

  try {
    await open(authUrl.toString());
    console.log("🌐 Browser opened for Twitch OAuth login.");
  } catch {
    console.log("⚠️ Could not auto-open browser. Please copy the URL manually.");
  }

  console.log("🌍 Listening on http://localhost:" + PORT);
});