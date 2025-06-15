require('dotenv').config();
const fs = require('fs');
const fetch = require('node-fetch');
const path = './data/engageLogs.json';

const basicKeywords = ['porn', 'xxx', 'sex', 'nude', 'onlyfans', 'nsfw', 'milf'];

const adultSiteRegex = [
  /\b(?:porn|p[\W_]*o[\W_]*r[\W_]*n|pr0n)\b/i,
  /\b(?:xxx|x[\W_]*x[\W_]*x)\b/i,
  /\b(?:sex|s[\W_]*e[\W_]*x)\b/i,
  /\b(?:nude|nud3|n[a@]ked)\b/i,
  /\b(?:onlyfans|0nlyfans|onlyf[a@]ns|onlyfns)\b/i,
  /\bnsfw\b/i,
  /\b(?:bangbros|brazzers|youjizz|spankbang|redtube|rule34|hentai|fap|xvideos|xhamster|cam4|camsoda|chaturbate|naughtyamerica|nutaku|hqporner|lubetube|tnaflix|porndig|efukt|mofos|realitykings|evilangel|teamskeet|pornhub)\b/i
];

const mayhemRegex = /\b(?:mayhem|m[a@]yhem|ma[yj]hem|m[\W_]*a[\W_]*y[\W_]*h[\W_]*e[\W_]*m)\b/i;

function gamerBroReply(text) {
  const starters = [
    "Yo dude,",
    "Ayy fam,",
    "Sup bro,",
    "Hey champ,",
    "What’s good,",
    "Yo my guy,"
  ];
  const enders = [
    "🔥🎮",
    "GG,",
    "No cap,",
    "Let's get that W!",
    "Stay epic,",
    "Catch you on the flip!"
  ];
  const start = starters[Math.floor(Math.random() * starters.length)];
  const end = enders[Math.floor(Math.random() * enders.length)];
  return `${start} ${text} ${end}`;
}

module.exports = async (message, client) => {
  console.log('🐛 [messageCreate] Function triggered for message:', message.content);

  try {
    if (message.author.bot) {
      console.log('🐛 [messageCreate] Ignoring bot message from:', message.author.tag);
      return;
    }
    console.log('🐛 [messageCreate] Message author is NOT a bot:', message.author.tag);

    const content = message.content.toLowerCase();
    console.log('🐛 [messageCreate] Message content lowercase:', content);

    if (message.channel.type === 'DM') {
      console.log('📩 [messageCreate] DM received from:', message.author.tag);

      try {
        console.log('🐛 [DM] Emitting huggingfaceApiCall event...');
        client.emit('huggingfaceApiCall', message.author.tag, message.content);

        const logs = fs.existsSync(path) ? JSON.parse(fs.readFileSync(path)) : {};
        logs[message.author.id] = {
          responded: true,
          username: message.author.tag,
          respondedAt: new Date().toISOString()
        };
        fs.writeFileSync(path, JSON.stringify(logs, null, 2));
        console.log('🐛 [DM] Updated engageLogs.json for user:', message.author.tag);

        const modLogChannelId = process.env.MOD_LOG_CHANNEL_ID;
        if (modLogChannelId) {
          const logChannel = await client.channels.fetch(modLogChannelId);
          if (logChannel) {
            await logChannel.send(`📩 DM reply from ${message.author.tag} (${message.author.id})`);
            console.log('🐛 [DM] Sent DM reply log to mod channel');
          } else {
            console.warn('⚠️ [DM] Could not fetch mod log channel');
          }
        } else {
          console.warn('⚠️ [DM] MOD_LOG_CHANNEL_ID env var not set');
        }

        // <-- MODEL URL updated here to microsoft/DialoGPT-small
        const response = await fetch('https://api-inference.huggingface.co/models/microsoft/DialoGPT-small', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.HF_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ inputs: message.content }),
        });

        console.log(`🤖 [DM] API HTTP status: ${response.status} ${response.statusText}`);

        const data = await response.json();
        console.log('🤖 [DM] HuggingFace API response data:', data);

        const replyText = Array.isArray(data) ? data[0].generated_text : data.generated_text;

        if (replyText) {
          const reply = gamerBroReply(replyText);
          console.log('💬 [DM] Sending reply to DM:', reply);
          return message.channel.send(reply);
        } else {
          console.warn('⚠️ [DM] No replyText from HuggingFace API.');
          return message.channel.send("Hey, I didn’t get your DM properly. Could you try again?");
        }
      } catch (error) {
        console.error('❌ [DM] Error:', error);
        return message.channel.send("Uh oh, I couldn't process your DM right now. Try again later!");
      }
    } else {
      console.log('🐛 [messageCreate] Message is in guild channel:', message.channel.name);

      if (mayhemRegex.test(content)) {
        console.log(`🚫 [messageCreate] "Mayhem" filter triggered by user ${message.author.tag}`);

        try {
          await message.delete();
          console.log(`✅ [messageCreate] Deleted message containing "mayhem" from ${message.author.tag}`);

          const modLogChannelId = process.env.MOD_LOG_CHANNEL_ID;
          if (modLogChannelId) {
            const modLogChannel = await client.channels.fetch(modLogChannelId);
            if (modLogChannel) {
              await modLogChannel.send(`🚫 **"Mayhem" Filter** - Message from <@${message.author.id}> in <#${message.channel.id}>:\n\`${message.content}\``);
              console.log('🐛 [messageCreate] Sent mayhem filter log to mod channel');
            } else {
              console.warn('⚠️ [messageCreate] Could not fetch mod log channel for mayhem filter');
            }
          } else {
            console.warn('⚠️ [messageCreate] MOD_LOG_CHANNEL_ID env var not set for mayhem filter');
          }

          await message.author.send("⚠️ Your message was removed because it contained restricted content: **mayhem**.");
          console.log(`✅ [messageCreate] Notified user ${message.author.tag} about mayhem message deletion`);
        } catch (err) {
          console.error('❌ [messageCreate] Mayhem moderation error:', err);
        }
        return;
      } else {
        console.log('🐛 [messageCreate] No mayhem detected in message');
      }

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
      console.log(`🐛 [messageCreate] User mod/admin status for ${message.author.tag}: ${isMod}`);

      if (!isMod && badPatterns.some(pat => pat.test(content) || adultSiteRegex.some(rx => rx.test(content)))) {
        console.log(`🚫 [messageCreate] Adult content or invite link detected from ${message.author.tag}, deleting message.`);

        try {
          await message.delete();
          console.log(`✅ [messageCreate] Deleted adult content message from ${message.author.tag}`);

          const modLogChannelId = process.env.MOD_LOG_CHANNEL_ID;
          if (modLogChannelId) {
            const modLogChannel = await client.channels.fetch(modLogChannelId);
            if (modLogChannel) {
              await modLogChannel.send(`🚫 **Filtered Message** from <@${message.author.id}> in <#${message.channel.id}>:\n\`${message.content}\``);
              console.log('🐛 [messageCreate] Sent adult content filter log to mod channel');
            } else {
              console.warn('⚠️ [messageCreate] Could not fetch mod log channel for adult content filter');
            }
          } else {
            console.warn('⚠️ [messageCreate] MOD_LOG_CHANNEL_ID env var not set for adult content filter');
          }

          await message.author.send("⚠️ Yo, that kinda stuff isn’t allowed here. Chill out.");
          console.log(`✅ [messageCreate] Notified user ${message.author.tag} about adult content message deletion`);
        } catch (err) {
          console.error('❌ [messageCreate] Moderation error:', err);
        }
      } else {
        console.log('🐛 [messageCreate] No adult content or invite links detected or user is mod/admin');
      }
    }
  } catch (outerError) {
    console.error('❌ [messageCreate] Unexpected error:', outerError);
  }
};