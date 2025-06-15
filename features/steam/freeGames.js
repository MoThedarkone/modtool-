const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const postedGamesFile = path.join(__dirname, '../postedGames.json');
let postedGames = new Set();

// Load posted games from file (if exists)
if (fs.existsSync(postedGamesFile)) {
  try {
    const data = JSON.parse(fs.readFileSync(postedGamesFile, 'utf8'));
    postedGames = new Set(data);
    console.log(`🗂️ Loaded ${postedGames.size} posted Steam games from cache.`);
  } catch (err) {
    console.error('❌ Failed to read postedGames.json:', err);
  }
}

// Save posted game URLs to file
function savePostedGames() {
  fs.writeFileSync(postedGamesFile, JSON.stringify([...postedGames], null, 2));
  console.log(`💾 Saved ${postedGames.size} total posted games.`);
}

async function fetchFreeSteamGames(client, channelId) {
  console.log('📡 Fetching free Steam games...');
  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel || typeof channel.send !== 'function') {
      console.warn('⚠️ Channel not found or not text-based.');
      return;
    }

    const response = await fetch('https://www.gamerpower.com/api/giveaways?platform=steam');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const giveaways = await response.json();
    console.log(`🎁 Retrieved ${giveaways.length} giveaways from GamerPower.`);

    const newGames = giveaways.filter(g =>
      g.platforms.toLowerCase().includes('steam') &&
      g.type === 'Game' &&
      !g.title.toLowerCase().includes('dlc') &&
      !postedGames.has(g.open_giveaway_url)
    );

    if (newGames.length === 0) {
      console.log('😴 No new Steam games to post.');
      return;
    }

    for (const game of newGames) {
      const message = `🎮 **${game.title}** is FREE on **Steam**!\n💸 Worth: ${game.worth}\n📝 ${game.description}\n⏳ Ends: ${game.end_date}\n🔗 ${game.open_giveaway_url}`;
      await channel.send(message);
      postedGames.add(game.open_giveaway_url);
      console.log(`✅ Posted: ${game.title}`);
    }

    savePostedGames();
    console.log(`✅ Finished posting ${newGames.length} new Steam game(s).`);

  } catch (err) {
    console.error('❌ Error in fetchFreeSteamGames:', err);
  }
}

module.exports = { fetchFreeSteamGames };