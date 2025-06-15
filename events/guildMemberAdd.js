require('dotenv').config();

module.exports = async (member) => {
  const suspiciousPatterns = ['bot', 'spam', 'raider'];
  const name = member.user.username.toLowerCase();
  const logChannel = member.guild.channels.cache.find(ch => ch.name === 'mod-logs');
  const accountAgeMs = Date.now() - member.user.createdTimestamp;
  const minAccountAge = 1000 * 60 * 60 * 24 * 14; // 14 days

  // === 🚨 Suspicious Name Check ===
  if (suspiciousPatterns.some(p => name.includes(p))) {
    if (logChannel) {
      logChannel.send(`🚨 **Possible Bot Raid** (name match)\n**User:** ${member.user.tag}\n**ID:** \`${member.user.id}\``);
    }

    try {
      await member.kick('Auto-kick: Suspicious username (bot raid)');
      console.log(`⛘️ Kicked ${member.user.tag} (ID: ${member.user.id}) for suspicious name`);
    } catch (err) {
      console.error(`❌ Could not kick ${member.user.tag}:`, err);
    }
    return;
  }

  // === ⏳ New Account Check ===
  if (accountAgeMs < minAccountAge) {
    const accountAgeMinutes = Math.floor(accountAgeMs / 1000 / 60);
    if (logChannel) {
      logChannel.send(`⚠️ **New Account Joined**\n**User:** ${member.user.tag}\n**ID:** \`${member.user.id}\`\n**Age:** ${accountAgeMinutes} minutes`);
    }

    try {
      await member.kick('Auto-kick: Account too new');
      console.log(`⛘️ Kicked ${member.user.tag} (ID: ${member.user.id}) for being too new`);
    } catch (err) {
      console.error(`❌ Could not kick new account ${member.user.tag}:`, err);
    }
    return;
  }

  // === 🎉 Welcome Message ===
  const welcomeChannelId = process.env.WELCOME_CHANNEL_ID;
  if (welcomeChannelId) {
    const welcomeChannel = member.guild.channels.cache.get(welcomeChannelId);
    if (welcomeChannel) {
      welcomeChannel.send(`🎮 Yo <@${member.id}>, welcome to the squad! Grab your snacks and vibe out with us. 🕹️✨`);
    }
  }

  // === ✅ Auto-role Assignment ===
  const autoRoleId = process.env.AUTO_ROLE_ID;
  if (autoRoleId) {
    try {
      await member.roles.add(autoRoleId);
      console.log(`✅ Gave auto role to ${member.user.tag}`);
    } catch (err) {
      console.error(`❌ Failed to assign auto role:`, err);
    }
  }
};