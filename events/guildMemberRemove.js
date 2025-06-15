module.exports = async function(member) {
  const logChannel = member.guild.channels.cache.find(
    (ch) => ch.name === 'mod-logs' && ch.isTextBased?.()
  );

  let message = `👋 **User Left Voluntarily**\n**User:** ${member.user.tag}\n**ID:** \`${member.user.id}\``;

  try {
    // Fetch recent audit logs for member kicks
    const fetchedLogs = await member.guild.fetchAuditLogs({
      limit: 1,
      type: 20, // MEMBER_KICK
    });

    const kickLog = fetchedLogs.entries.first();

    if (kickLog) {
      const { target, createdTimestamp, executor, reason: kickReason } = kickLog;

      // If the kicked user matches and the log is fresh (<5s ago)
      const timeDifference = Date.now() - createdTimestamp;

      if (target.id === member.id && timeDifference < 5000) {
        message = `🦵 **User Was Kicked**\n**User:** ${member.user.tag}\n**ID:** \`${member.user.id}\`\n**Kicked By:** ${executor.tag}\n**Reason:** ${kickReason || 'No reason given'}`;
        console.log(`🦵 Detected kick: ${member.user.tag} was kicked by ${executor.tag}`);
      }
    } else {
      console.log(`👋 No kick logs matched for ${member.user.tag}, assuming voluntary leave.`);
    }
  } catch (err) {
    console.error('❌ Failed to fetch audit logs for member leave:', err);
  }

  if (logChannel) {
    try {
      await logChannel.send(message);
      console.log(`📤 Sent leave log for ${member.user.tag} to #mod-logs`);
    } catch (sendErr) {
      console.error('❌ Failed to send leave log message:', sendErr);
    }
  } else {
    console.warn('⚠️ Log channel not found or not text-based');
  }

  console.log(`📤 ${member.user.tag} (${member.user.id}) left the server. Type: ${message.includes('Kicked') ? 'Kick' : 'Voluntary'}`);
};