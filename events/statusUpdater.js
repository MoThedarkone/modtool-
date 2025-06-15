// tasks/updateServerStats.js

require('dotenv').config();

module.exports = async (client) => {
  console.log('📊 [updateServerStats] Updating server stats...');

  const guild = client.guilds.cache.get(process.env.GUILD_ID);
  if (!guild) {
    console.warn('⚠️ [updateServerStats] Guild not found. Check GUILD_ID in .env.');
    return;
  }

  try {
    const totalMembers = guild.memberCount;
    const onlineMembers = guild.members.cache.filter(
      m => m.presence && ['online', 'dnd', 'idle'].includes(m.presence.status)
    ).size;
    const botCount = guild.members.cache.filter(m => m.user.bot).size;
    const boostCount = guild.premiumSubscriptionCount;

    const statUpdates = [
      { id: process.env.CHANNEL_ID_TOTAL, name: `Total: ${totalMembers}` },
      { id: process.env.CHANNEL_ID_BOTS, name: `Bots: ${botCount}` },
      { id: process.env.CHANNEL_ID_ONLINE, name: `Online: ${onlineMembers}` },
      { id: process.env.CHANNEL_ID_BOOSTS, name: `Boosts: ${boostCount}` }
    ];

    for (const stat of statUpdates) {
      if (!stat.id) {
        console.warn(`⚠️ [updateServerStats] Missing channel ID for stat: ${stat.name}`);
        continue;
      }

      const channel = guild.channels.cache.get(stat.id);
      if (channel && channel.setName) {
        await channel.setName(stat.name);
        console.log(`✅ [updateServerStats] Updated channel ${stat.id} to "${stat.name}"`);
      } else {
        console.warn(`⚠️ [updateServerStats] Could not update channel ID: ${stat.id}`);
      }
    }

    console.log('✅ [updateServerStats] Stats updated successfully.');
  } catch (err) {
    console.error('❌ [updateServerStats] Failed to update server stats:', err);
  }
};