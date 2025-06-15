require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder().setName('ping').setDescription('Pong!'),

  new SlashCommandBuilder().setName('livenow').setDescription('Show live Twitch streamers'),

  new SlashCommandBuilder()
    .setName('addstreamer')
    .setDescription('Add a Twitch streamer')
    .addStringOption(option =>
      option.setName('username').setDescription('Twitch username').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('removestreamer')
    .setDescription('Remove a Twitch streamer')
    .addStringOption(option =>
      option.setName('username').setDescription('Twitch username').setRequired(true)
    ),

  // ✅ Moderation Commands
  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user from the server')
    .addUserOption(option =>
      option.setName('user').setDescription('User to ban').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason').setDescription('Reason for ban').setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout a user')
    .addUserOption(option =>
      option.setName('user').setDescription('User to timeout').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('duration')
        .setDescription('Duration: 24h, 1w, or indefinite')
        .setRequired(true)
        .addChoices(
          { name: '24h', value: '24h' },
          { name: '1w', value: '1w' },
          { name: 'indefinite', value: 'indefinite' }
        )
    ),

  new SlashCommandBuilder()
    .setName('massban')
    .setDescription('Mass ban multiple users by ID')
    .addStringOption(option =>
      option.setName('user_ids').setDescription('Comma-separated user IDs').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason').setDescription('Reason for mass ban').setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('checkalt')
    .setDescription('Check account age of a user')
    .addUserOption(option =>
      option.setName('user').setDescription('User to check').setRequired(true)
    ),

  // ✅ NEW: Engagement Check Command
  new SlashCommandBuilder()
    .setName('engagecheck')
    .setDescription('DM all members to confirm they are still active within 48 hours'),

  // ✅ NEW: Add/Remove Twitch Channel for Shoutouts & Modding
  new SlashCommandBuilder()
    .setName('addmodforstreamer')
    .setDescription('Enable or disable shoutouts/mod for a Twitch streamer')
    .addStringOption(opt =>
      opt
        .setName('channel')
        .setDescription('Twitch channel name (without #)')
        .setRequired(true)
    )
    .addBooleanOption(opt =>
      opt
        .setName('enable')
        .setDescription('Enable shoutouts/mod for that channel')
        .setRequired(true)
    ),
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log('📡 Registering commands...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('✅ Commands registered!');
  } catch (err) {
    console.error('❌ Failed to register commands:', err);
  }
})();