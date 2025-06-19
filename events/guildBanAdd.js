//events/guildBanAdd.js
module.exports = async function(ban) {
  const { user, guild } = ban;

  const logChannel = guild.channels.cache.find(
    (ch) => ch.name === 'mod-logs' && ch.isTextBased?.()
  );

  const message = `⛔ **User Banned**\n**User:** ${user.tag}\n**ID:** \`${user.id}\``;

  try {
    if (logChannel) {
      await logChannel.send(message);
      console.log(`📛 Ban logged: ${user.tag} was banned and logged to #mod-logs`);
    } else {
      console.warn('⚠️ Ban log channel not found or not text-based');
    }
  } catch (err) {
    console.error('❌ Failed to log ban:', err);
  }
};