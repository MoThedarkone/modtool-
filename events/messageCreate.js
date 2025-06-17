require('dotenv').config(); const fs = require('fs'); const fetch = require('node-fetch'); const path = './data/engageLogs.json';

const basicKeywords = ['porn', 'xxx', 'sex', 'nude', 'onlyfans', 'nsfw', 'milf'];

const adultSiteRegex = [ /\b(?:porn|p[\W_]*o[\W_]*r[\W_]*n|pr0n)\b/i, /\b(?:xxx|x[\W_]*x[\W_]*x)\b/i, /\b(?:sex|s[\W_]*e[\W_]*x)\b/i, /\b(?:nude|nud3|n[a@]ked)\b/i, /\b(?:onlyfans|0nlyfans|onlyf[a@]ns|onlyfns)\b/i, /\bnsfw\b/i, /\b(?:bangbros|brazzers|youjizz|spankbang|redtube|rule34|hentai|fap|xvideos|xhamster|cam4|camsoda|chaturbate|naughtyamerica|nutaku|hqporner|lubetube|tnaflix|porndig|efukt|mofos|realitykings|evilangel|teamskeet|pornhub)\b/i ];

const mayhemRegex = /\b(?:mayhem|m[a@]yhem|ma[yj]hem|m[\W_]*a[\W_]*y[\W_]*h[\W_]*e[\W_]*m)\b/i;

function gamerBroReply(text) { const starters = [ "Yo dude,", "Ayy fam,", "Sup bro,", "Hey champ,", "What’s good,", "Yo my guy," ]; const enders = [ "🔥🎮", "GG,", "No cap,", "Let's get that W!", "Stay epic,", "Catch you on the flip!" ]; const start = starters[Math.floor(Math.random() * starters.length)]; const end = enders[Math.floor(Math.random() * enders.length)]; return ${start} ${text} ${end}; }

module.exports = async (message, client) => { console.log('🐛 [messageCreate] Function triggered for message:', message.content);

try { if (message.author.bot) return;

const content = message.content.toLowerCase();

if (message.channel.isDMBased()) {
  console.log('📩 DM received from:', message.author.tag);

  if (!process.env.OPENROUTER_API_KEY) {
    console.warn('⚠️ OPENROUTER_API_KEY is missing');
    return message.channel.send("⚠️ My brain’s offline, I don’t have my API key yet!");
  }

  try {
    client.emit('huggingfaceApiCall', message.author.tag, message.content);

    const logs = fs.existsSync(path) ? JSON.parse(fs.readFileSync(path)) : {};
    logs[message.author.id] = {
      responded: true,
      username: message.author.tag,
      respondedAt: new Date().toISOString()
    };
    fs.writeFileSync(path, JSON.stringify(logs, null, 2));

    const modLogChannelId = process.env.MOD_LOG_CHANNEL_ID;
    if (modLogChannelId) {
      const logChannel = await client.channels.fetch(modLogChannelId);
      if (logChannel) {
        await logChannel.send(`📩 DM reply from ${message.author.tag} (${message.author.id})`);
      }
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://slaygbtv.com',
        'X-Title': 'SLAY-GBTV GamerBot'
      },
      body: JSON.stringify({
        model: 'openai/gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a chill gamer bro Discord bot who speaks casually, jokes around, and uses emojis. Keep replies short and funny unless the user asks for something deep.' },
          { role: 'user', content: message.content }
        ]
      })
    });

    const data = await response.json();
    const replyText = data.choices?.[0]?.message?.content;

    if (replyText) {
      const reply = gamerBroReply(replyText);
      return message.channel.send(reply);
    } else {
      return message.channel.send("Hey, I didn’t get your DM properly. Could you try again?");
    }
  } catch (error) {
    console.error('❌ [DM] Error:', error);
    return message.channel.send("Uh oh, I couldn't process your DM right now. Try again later!");
  }
} else {
  if (mayhemRegex.test(content)) {
    try {
      await message.delete();

      const modLogChannelId = process.env.MOD_LOG_CHANNEL_ID;
      if (modLogChannelId) {
        const modLogChannel = await client.channels.fetch(modLogChannelId);
        if (modLogChannel) {
          await modLogChannel.send(`🚫 **"Mayhem" Filter** - Message from <@${message.author.id}> in <#${message.channel.id}>:\n\`${message.content}\``);
        }
      }

      await message.author.send("⚠️ Your message was removed because it contained restricted content: **mayhem**.");
    } catch (err) {
      console.error('❌ [messageCreate] Mayhem moderation error:', err);
    }
    return;
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

  if (!isMod && badPatterns.some(pat => pat.test(content) || adultSiteRegex.some(rx => rx.test(content)))) {
    try {
      await message.delete();

      const modLogChannelId = process.env.MOD_LOG_CHANNEL_ID;
      if (modLogChannelId) {
        const modLogChannel = await client.channels.fetch(modLogChannelId);
        if (modLogChannel) {
          await modLogChannel.send(`🚫 **Filtered Message** from <@${message.author.id}> in <#${message.channel.id}>:\n\`${message.content}\``);
        }
      }

      await message.author.send("⚠️ Yo, that kinda stuff isn’t allowed here. Chill out.");
    } catch (err) {
      console.error('❌ [messageCreate] Moderation error:', err);
    }
  }
}

} catch (outerError) { console.error('❌ [messageCreate] Unexpected error:', outerError); } };

