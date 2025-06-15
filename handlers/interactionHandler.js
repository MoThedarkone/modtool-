const fs = require('fs');
const fetch = require('node-fetch');
const path = './data/masterList.json';
const twitchConfigPath = './data/twitchChannels.json';

module.exports = async (interaction, client) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, member } = interaction;
  const isMod = member.permissions.has('ModerateMembers') || member.permissions.has('Administrator');
  const data = fs.existsSync(path) ? JSON.parse(fs.readFileSync(path)) : [];

  // ===== NEW COMMAND: /addmodforstreamer =====
  if (commandName === 'addmodforstreamer') {
    if (!isMod) {
      return interaction.reply({ content: '❌ You need mod/admin permissions to use this.', flags: 1 << 6 });
    }

    const channelInput = interaction.options.getString('channel').toLowerCase();
    const enable = interaction.options.getBoolean('enable');
    const channelKey = channelInput.startsWith('#') ? channelInput : `#${channelInput}`;

    let cfg = {};
    if (fs.existsSync(twitchConfigPath)) {
      try { cfg = JSON.parse(fs.readFileSync(twitchConfigPath, 'utf8')); }
      catch { cfg = {}; }
    }

    if (!cfg[channelKey]) {
      cfg[channelKey] = { enabled: enable, lastShoutedOut: {}, masterList: [] };
    } else {
      cfg[channelKey].enabled = enable;
    }

    fs.writeFileSync(twitchConfigPath, JSON.stringify(cfg, null, 2));

    return interaction.reply({
      content: `✅ Shoutouts for **${channelKey}** have been **${enable ? 'ENABLED' : 'DISABLED'}**.`,
      flags: 1 << 6
    });
  }

  // ===== EXISTING COMMANDS =====
  if (commandName === 'ping') {
    return interaction.reply('🏓 Pong, dude!');
  }

  if (commandName === 'addstreamer') {
    const username = interaction.options.getString('username').toLowerCase();
    if (data.some(s => s.username === username)) {
      return interaction.reply({ content: `⚠️ \`${username}\` is already in the list, homie.`, flags: 1 << 6 });
    }
    data.push({ username });
    fs.writeFileSync(path, JSON.stringify(data, null, 2));
    return interaction.reply({ content: `✅ Yo, added \`${username}\` to the squad.`, flags: 1 << 6 });
  }

  if (commandName === 'removestreamer') {
    const username = interaction.options.getString('username').toLowerCase();
    const newList = data.filter(s => s.username !== username);
    if (newList.length === data.length) {
      return interaction.reply({ content: `⚠️ Couldn't find \`${username}\` in the list, my dude.`, flags: 1 << 6 });
    }
    fs.writeFileSync(path, JSON.stringify(newList, null, 2));
    return interaction.reply({ content: `🗑️ \`${username}\` got booted from the list.`, flags: 1 << 6 });
  }

  if (commandName === 'livenow') {
    const getTwitchAccessToken = async () => {
      const res = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_SECRET}&grant_type=client_credentials`, { method: 'POST' });
      const data = await res.json();
      return data.access_token;
    };

    const getLiveStreamers = async (usernames, token) => {
      const query = usernames.map(u => `user_login=${u}`).join('&');
      const res = await fetch(`https://api.twitch.tv/helix/streams?${query}`, {
        headers: {
          'Client-ID': process.env.TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      return data.data;
    };

    const usernames = data.map(s => s.username.toLowerCase());
    const token = await getTwitchAccessToken();
    const live = await getLiveStreamers(usernames, token);

    if (!live.length) {
      return interaction.reply({ content: `😴 Yo, nobody's grindin' live right now. Go touch grass.`, flags: 1 << 6 });
    }

    const links = live.map(s => `**[${s.user_name}](https://twitch.tv/${s.user_login})**\n🎮 ${s.game_name}\n👥 ${s.viewer_count} viewers`).sort();
    const chunks = chunkByMessageLength(links);
    for (const chunk of chunks) {
      await interaction.channel.send({ content: chunk.join('\n\n') });
    }

    return interaction.reply({ content: `✅ Found **${live.length}** streamers grindin' live.`, flags: 1 << 6 });
  }

  // 🔒 MODERATION COMMANDS
  if (['ban', 'timeout', 'massban', 'checkalt'].includes(commandName)) {
    if (!isMod) {
      return interaction.reply({ content: '❌ Nah bro, you ain’t got the perms for that.', flags: 1 << 6 });
    }

    if (commandName === 'ban') {
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason';
      try {
        await interaction.guild.members.ban(user.id, { reason });
        return interaction.reply({ content: `🔨 Banned ${user.tag} | Reason: ${reason}`, flags: 1 << 6 });
      } catch (err) {
        return interaction.reply({ content: `❌ Couldn't ban ${user.tag}.`, flags: 1 << 6 });
      }
    }

    if (commandName === 'timeout') {
      const user = interaction.options.getMember('user');
      const duration = interaction.options.getString('duration');
      const msMap = { '24h': 86400000, '1w': 604800000 };
      const ms = msMap[duration];

      try {
        if (duration === 'indefinite') {
          await user.disableCommunicationUntil(null);
        } else {
          await user.timeout(ms);
        }
        return interaction.reply({ content: `⏳ Timed out ${user.user.tag} for ${duration}`, flags: 1 << 6 });
      } catch (err) {
        return interaction.reply({ content: `❌ Couldn't timeout ${user.user.tag}.`, flags: 1 << 6 });
      }
    }

    if (commandName === 'massban') {
      const users = interaction.options.getString('user_ids').split(',').map(id => id.trim());
      const reason = interaction.options.getString('reason') || 'Massban issued';
      let banned = 0;
      for (const id of users) {
        try {
          await interaction.guild.members.ban(id, { reason });
          banned++;
        } catch (_) {}
      }
      return interaction.reply({ content: `🚫 Massbanned ${banned}/${users.length} users.`, flags: 1 << 6 });
    }

    if (commandName === 'checkalt') {
      const user = interaction.options.getUser('user');
      const accountAge = Date.now() - user.createdTimestamp;
      const daysOld = Math.floor(accountAge / (1000 * 60 * 60 * 24));
      return interaction.reply({
        content: `🔍 ${user.tag} was created **${daysOld} day(s)** ago.`,
        flags: 1 << 6,
      });
    }
  }

  // ✅ ENGAGECHECK
  if (commandName === 'engagecheck') {
    if (!isMod) {
      return interaction.reply({ content: '❌ Nah bro, you ain’t got the perms for that.', flags: 1 << 6 });
    }

    await interaction.reply({ content: '📬 Starting engagement DM wave...', ephemeral: true });

    const guild = interaction.guild;
    const members = await guild.members.fetch();
    const logChannel = await client.channels.fetch(process.env.MOD_LOG_CHANNEL_ID);
    const engageLogPath = './data/engageLogs.json';
    const logs = fs.existsSync(engageLogPath) ? JSON.parse(fs.readFileSync(engageLogPath)) : {};

    const dmText = `👋 Yo! We’re cleaning up inactive members.\n\nPlease reply or react to this message within **48 hours** to stay in the server.\nThanks for being part of the community ❤️`;

    let sent = 0;
    let failed = 0;
    let responded = 0;

    for (const [, member] of members) {
      if (member.user.bot) continue;

      try {
        const dm = await member.send(dmText);
        sent++;
        logChannel.send(`📤 DM sent to **${member.user.tag}** (${member.id})`);

        const filter = (reaction, user) => user.id === member.id;
        const rCollector = dm.createReactionCollector({ filter, time: 1000 * 60 * 60 * 48, max: 1 });
        rCollector.on('collect', async () => {
          logs[member.id] = { username: member.user.tag, respondedAt: new Date().toISOString(), responseType: 'reaction' };
          fs.writeFileSync(engageLogPath, JSON.stringify(logs, null, 2));
          logChannel.send(`✅ ${member.user.tag} (${member.id}) **REACTED** to engagement check.`);
          responded++;
        });

        const msgCollector = dm.channel.createMessageCollector({ filter: m => m.author.id === member.id, time: 1000 * 60 * 60 * 48, max: 1 });
        msgCollector.on('collect', async () => {
          logs[member.id] = { username: member.user.tag, respondedAt: new Date().toISOString(), responseType: 'message' };
          fs.writeFileSync(engageLogPath, JSON.stringify(logs, null, 2));
          logChannel.send(`✅ ${member.user.tag} (${member.id}) **REPLIED** to engagement check.`);
          responded++;
        });

      } catch (err) {
        failed++;
        logChannel.send(`⚠️ Could **not** DM ${member.user.tag} (${member.id}) — DMs likely off.`);
      }

      await new Promise(r => setTimeout(r, 1000));
    }

    logChannel.send(`📋 **Engagement Summary:**\n📨 Sent to: ${sent}\n❌ Failed: ${failed}\n💬 Responses so far: ${responded}`);
  }
};

// 👋 Auto role on join
module.exports.autoRoleHandler = (client) => {
  client.on('guildMemberAdd', async member => {
    const autoRoleId = process.env.AUTO_ROLE_ID;
    if (!autoRoleId) return;

    try {
      await member.roles.add(autoRoleId);
      console.log(`✅ Gave auto role to ${member.user.tag}`);
    } catch (err) {
      console.error(`❌ Failed to assign auto role:`, err);
    }
  });
};

// Utility for splitting large messages
function chunkByMessageLength(arr, maxLength = 1900) {
  const chunks = [];
  let current = [];
  for (const item of arr) {
    const test = current.concat(item).join('\n\n');
    if (test.length > maxLength) {
      chunks.push(current);
      current = [item];
    } else {
      current.push(item);
    }
  }
  if (current.length) chunks.push(current);
  return chunks;
}

