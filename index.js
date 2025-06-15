require('dotenv').config();

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const interactionHandler = require('./handlers/interactionHandler');
const sendLiveGrid = require('./tasks/sendLiveGrid');
const announceLiveStreamers = require('./tasks/announceLiveStreamers'); // ✅ NEW line added
const updateStats = require('./events/statusUpdater');
const { fetchAllFreeGames } = require('./features/freeGamesHandler');
const messageHandler = require('./events/messageCreate');

// 🟩 Twitch integrations
require('./backend/twitchShoutoutManager');
require('./backend/twitchLiveAnnouncer');
require('./backend/twitchClipListener');

const { relayChatMessage } = require('./dashboard/dashboard'); // Chat relay for dashboard

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

// ✅ Log redirect URI info for debugging
console.log('📍 Twitch Redirect URI:', process.env.TWITCH_REDIRECT_URI);

// 🧪 Debug HuggingFace call logging
client.on('huggingfaceApiCall', (username, messageContent) => {
  console.log(`🤖 [DEBUG] Bot calling Huggingface API for user ${username}: "${messageContent}"`);
});

client.once('ready', () => {
  console.log(`🎮 ${client.user.tag} is online`);

  // ✅ Live Grid refresh every 5 mins
  setInterval(() => sendLiveGrid(client), 5 * 60 * 1000);

  // ✅ Twitch announcement refresh every 2 mins (new task)
  setInterval(() => announceLiveStreamers(client), 2 * 60 * 1000);

  // ✅ Server stats refresh immediately and every 10 mins
  updateStats(client);
  setInterval(() => updateStats(client), 10 * 60 * 1000);

  // ✅ Free game sweep
  const sharedChannelId = process.env.STEAM_GAMES_CHANNEL_ID;
  if (sharedChannelId) {
    fetchAllFreeGames(client, sharedChannelId);
    setInterval(() => fetchAllFreeGames(client, sharedChannelId), 30 * 60 * 1000);
  }

  // ✅ Auto-role assignment
  if (interactionHandler.autoRoleHandler) {
    interactionHandler.autoRoleHandler(client);
  }
});

client.on('interactionCreate', interaction => interactionHandler(interaction, client));

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (!message.guild) {
    console.log(`📩 Received DM from ${message.author.tag}: ${message.content}`);
  }

  try {
    await messageHandler(message, client);
  } catch (err) {
    console.error(`❌ Error handling message from ${message.author.tag}:`, err);
    if (!message.guild) {
      try {
        await message.author.send("⚠️ Sorry, I couldn’t process your message due to a bot error. Please try again later.");
      } catch (dmError) {
        console.error(`❌ Failed to send error DM to ${message.author.tag}:`, dmError);
      }
    }
  }

  const content = message.content.toLowerCase();

  // "Mayhem" Filter (no exemption)
  const mayhemPattern = /\b(?:mayhem|m[a@]yhem|ma[yj]hem|m[\W_]*a[\W_]*y[\W_]*h[\W_]*e[\W_]*m)\b/i;
  if (mayhemPattern.test(content)) {
    try {
      await message.delete();
      const modLogChannelId = process.env.MOD_LOG_CHANNEL_ID;
      if (modLogChannelId) {
        const modLogChannel = await client.channels.fetch(modLogChannelId);
        if (modLogChannel) {
          modLogChannel.send(`🚫 **"Mayhem" Filter** - Message from <@${message.author.id}> in <#${message.channel.id}>:\n\`${message.content}\``);
        }
      }
      await message.author.send("⚠️ Your message was removed because it contained restricted content: **mayhem**.");
    } catch (err) {
      console.error('❌ Mayhem moderation error:', err);
    }
    return;
  }

  // Adult content + Discord invites (mod/admin exempt)
  const badPatterns = [
    /pornhub/i,
    /p[\W_]*o[\W_]*r[\W_]*n[\W_]*h[\W_]*u[\W_]*b/i,
    /onlyfans/i,
    /nude/i,
    /xxx/i,
    /sex/i,
    /\.xxx/,
    /discord\.gg\/[\w-]+/i,
  ];

  const isMod = message.member?.roles.cache.some(role =>
    ['MODERATOR', 'ADMIN'].includes(role.name.toUpperCase())
  );

  if (!isMod && badPatterns.some(pat => pat.test(content))) {
    try {
      await message.delete();
      const modLogChannelId = process.env.MOD_LOG_CHANNEL_ID;
      if (modLogChannelId) {
        const modLogChannel = await client.channels.fetch(modLogChannelId);
        if (modLogChannel) {
          modLogChannel.send(`🚫 **Filtered Message** from <@${message.author.id}> in <#${message.channel.id}>:\n\`${message.content}\``);
        }
      }
      await message.author.send("⚠️ Yo, that kinda stuff isn’t allowed here. Chill out.");
    } catch (err) {
      console.error('❌ Moderation error:', err);
    }
  }
});

// Guild event listeners
client.on('guildMemberAdd', require('./events/guildMemberAdd'));
client.on('guildMemberRemove', require('./events/guildMemberRemove'));
client.on('guildBanAdd', require('./events/guildBanAdd'));

client.login(process.env.BOT_TOKEN);

// Global error catchers
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});