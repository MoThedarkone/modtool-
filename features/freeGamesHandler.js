// features/freeGamesHandler.js

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const postedGamesFile = path.join(__dirname, 'postedGames.json');
let postedGames = new Set();

console.log('📦 [freeGamesHandler] Initializing posted games list...');

// Load posted games from file
if (fs.existsSync(postedGamesFile)) {
  try {
    const data = JSON.parse(fs.readFileSync(postedGamesFile, 'utf8'));
    postedGames = new Set(data);
    console.log(`✅ [freeGamesHandler] Loaded ${postedGames.size} previously posted games.`);
  } catch (err) {
    console.error('❌ [freeGamesHandler] Failed to load postedGames.json:', err);
  }
}

// Save posted game URLs to file
function savePostedGames() {
  try {
    fs.writeFileSync(postedGamesFile, JSON.stringify([...postedGames], null, 2));
    console.log('💾 [freeGamesHandler] Saved postedGames.json.');
  } catch (err) {
    console.error('❌ [freeGamesHandler] Failed to save posted games:', err);
  }
}

async function fetchGiveaways(platform) {
  const url = `https://www.gamerpower.com/api/giveaways?platform=${platform}`;
  console.log(`🌐 [freeGamesHandler] Fetching ${platform} games from: ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${platform} games - HTTP ${res.status}`);
  return res.json();
}

function filterValidGames(games) {
  const filtered = games.filter(game =>
    !postedGames.has(game.open_giveaway_url) &&
    !/dlc/i.test(game.title) &&
    game.type.toLowerCase() !== 'tasks'
  );
  console.log(`🎯 [freeGamesHandler] Found ${filtered.length} valid new games.`);
  return filtered;
}

async function postGamesToChannel(client, channelId, games, platformLabel) {
  const channel = await client.channels.fetch(channelId);
  if (!channel || !channel.isTextBased()) {
    console.warn(`⚠️ [freeGamesHandler] Invalid or non-text channel: ${channelId}`);
    return;
  }

  for (const game of games) {
    const message = `🎁 **Free ${platformLabel} Game!**\n**${game.title}**\n🔗 ${game.open_giveaway_url}`;
    try {
      await channel.send(message);
      postedGames.add(game.open_giveaway_url);
      console.log(`📨 [freeGamesHandler] Posted: ${game.title}`);
    } catch (err) {
      console.error(`❌ [freeGamesHandler] Failed to post ${game.title}:`, err);
    }
  }

  if (games.length > 0) savePostedGames();
}

async function fetchAllFreeGames(client, channelId) {
  console.log('🎁 [freeGamesHandler] Starting full free game sweep...');
  try {
    const [steamGames, epicGames] = await Promise.all([
      fetchGiveaways('steam'),
      fetchGiveaways('epic-games-store')
    ]);

    const filteredSteam = filterValidGames(steamGames);
    const filteredEpic = filterValidGames(epicGames);

    await postGamesToChannel(client, channelId, filteredSteam, 'Steam');
    await postGamesToChannel(client, channelId, filteredEpic, 'Epic Games');

    console.log('✅ [freeGamesHandler] Game sweep complete.');
  } catch (err) {
    console.error('❌ [freeGamesHandler] Error in fetchAllFreeGames:', err);
  }
}

module.exports = { fetchAllFreeGames };