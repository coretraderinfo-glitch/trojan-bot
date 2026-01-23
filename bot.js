require('dotenv').config();
const { Telegraf } = require('telegraf');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// --- Configuration ---
const BOT_TOKEN = process.env.BOT_TOKEN;
const MONGO_URI = process.env.MONGO_URI;
// We read OWNER_ID from env, but if not set, user can't generate keys.
const OWNER_ID = process.env.OWNER_ID ? parseInt(process.env.OWNER_ID) : null;

if (!BOT_TOKEN || !MONGO_URI) {
  console.error("❌ CRTICAL ERROR: Missing BOT_TOKEN or MONGO_URI in .env file.");
  console.error("Please add them to your .env file.");
}

const bot = new Telegraf(BOT_TOKEN || 'YOUR_FALLBACK_TOKEN_HERE');

const BANNED_EXTENSIONS = [
  '.exe', '.apk', '.scr', '.bat', '.cmd', '.sh', '.com', '.msi', '.jar'
];

// --- Database Setup ---
if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));
}

// --- Schemas ---

// 1. User Activity (Existing)
const userSchema = new mongoose.Schema({
  userId: { type: Number, required: true, unique: true },
  username: String,
  last_seen: { type: Number, default: Date.now }
});

// 2. Authorized Groups (New)
const groupSchema = new mongoose.Schema({
  chatId: { type: Number, required: true, unique: true },
  name: String,
  isAuthorized: { type: Boolean, default: false },
  authorizedAt: { type: Date },
  authorizedBy: { type: Number } // User ID who activated it
});

// 3. License Keys (New)
const licenseSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  createdBy: Number,
  createdAt: { type: Date, default: Date.now },
  isRedeemed: { type: Boolean, default: false },
  redeemedBy: Number, // User ID
  redeemedAt: Date,
  redeemedInChat: Number // Chat ID
});

const User = mongoose.model('User', userSchema);
const Group = mongoose.model('Group', groupSchema);
const License = mongoose.model('License', licenseSchema);

// --- Caching for Performance ---
// Store authorized Chat IDs in memory to avoid DB hitting on every message
const authorizedCache = new Set();
const CACHE_TTL = 1000 * 60 * 5; // Refresh every 5 minutes (Optional, simplified here)

// Pre-load cache on startup
const preloadCache = async () => {
  try {
    const groups = await Group.find({ isAuthorized: true });
    groups.forEach(g => authorizedCache.add(g.chatId));
    console.log(`✅ Loaded ${authorizedCache.size} authorized groups into cache.`);
  } catch (e) {
    console.error("Cache preload failed:", e);
  }
};
preloadCache();

// --- Middleware 1: Access Control & Authorization ---
bot.use(async (ctx, next) => {
  // Allow private chats always (for talking to bot)
  if (ctx.chat && ctx.chat.type === 'private') {
    return next();
  }

  // Check Groups/Supergroups
  if (ctx.chat && (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup')) {
    const chatId = ctx.chat.id;

    // Fast Path: Check Memory Cache first
    if (authorizedCache.has(chatId)) {
      return next();
    }

    // Check DB for authorization
    let group = await Group.findOne({ chatId: chatId });

    // Allow the /activate command to pass through even if unauthorized
    if (ctx.message && ctx.message.text && ctx.message.text.startsWith('/activate')) {
      return next();
    }

    // Allow the /id command to pass through so owner can find their ID
    if (ctx.message && ctx.message.text && ctx.message.text.startsWith('/id')) {
      return next();
    }

    // If not authorized, silently ignore (or you could leave)
    if (!group || !group.isAuthorized) {
      return;
    }

    // If we found it in DB but not in Cache, add it to Cache
    authorizedCache.add(chatId);
  }

  return next();
});

// --- Middleware 2: Track activity (Only runs if Authorized) ---
bot.use(async (ctx, next) => {
  if (ctx.from && ctx.chat && ctx.chat.type !== 'private') {
    const userId = ctx.from.id;
    const username = ctx.from.username || ctx.from.first_name;
    const now = Date.now();

    try {
      await User.findOneAndUpdate(
        { userId: userId },
        { last_seen: now, username: username },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } catch (err) {
      console.error('Error updating user activity:', err);
    }
  }
  return next();
});

// --- Commands: Access Control ---

// 1. Get My ID (Helper)
bot.command('id', (ctx) => {
  ctx.reply(`🆔 Your ID: \`${ctx.from.id}\`\n📍 Chat ID: \`${ctx.chat.id}\``, { parse_mode: 'Markdown' });
});

// 2. Generate Key (Owner Only)
bot.command('generate_key', async (ctx) => {
  if (!OWNER_ID) {
    return ctx.reply("❌ OWNER_ID is not set in the .env file. I don't know who the boss is.");
  }
  if (ctx.from.id !== OWNER_ID) {
    return ctx.reply("⛔ You are not authorized to generate keys.");
  }

  const newKey = uuidv4();
  try {
    await License.create({
      key: newKey,
      createdBy: ctx.from.id
    });
    ctx.reply(`🔑 **New License Key Generated**:\n\`${newKey}\`\n\nUse \`/activate ${newKey}\` in a group to unlock me.`, { parse_mode: 'Markdown' });
  } catch (e) {
    console.error(e);
    ctx.reply("❌ Error generating key.");
  }
});

// 3. Activate Group
bot.command('activate', async (ctx) => {
  const args = ctx.message.text.split(' ');
  const inputKey = args[1];

  if (!inputKey) {
    return ctx.reply("❌ Usage: `/activate <LICENSE_KEY>`");
  }

  try {
    const license = await License.findOne({ key: inputKey });

    if (!license) {
      return ctx.reply("❌ Invalid License Key.");
    }
    if (license.isRedeemed) {
      return ctx.reply("❌ This key has already been used.");
    }

    // Activate!
    await License.updateOne({ _id: license._id }, {
      isRedeemed: true,
      redeemedBy: ctx.from.id,
      redeemedAt: Date.now(),
      redeemedInChat: ctx.chat.id
    });

    await Group.findOneAndUpdate(
      { chatId: ctx.chat.id },
      {
        name: ctx.chat.title,
        isAuthorized: true,
        authorizedAt: Date.now(),
        authorizedBy: ctx.from.id
      },
      { upsert: true, new: true }
    );

    ctx.reply("✅ **Activation Successful!**\nThis group is now authorized to use the Trojan Bot 24/7.");

  } catch (e) {
    console.error(e);
    ctx.reply("❌ Error during activation.");
  }
});

// 4. Owner Override Unlock
bot.command('unlock', async (ctx) => {
  // Check if OWNER_ID is valid and matches message sender
  if (!OWNER_ID || ctx.from.id !== OWNER_ID) {
    return; // Silently ignore non-owners
  }

  try {
    await Group.findOneAndUpdate(
      { chatId: ctx.chat.id },
      {
        name: ctx.chat.title,
        isAuthorized: true,
        authorizedAt: Date.now(),
        authorizedBy: ctx.from.id
      },
      { upsert: true, new: true }
    );
    ctx.reply("🔓 **Owner Override Enabled**\nThis group is now authorized.");
  } catch (e) {
    console.error(e);
    ctx.reply("❌ Error unlocking group.");
  }
});

// --- Command: Kick inactive users ---
bot.command('kick_inactive', async (ctx) => {
  const args = ctx.message.text.split(' ');
  const days = parseInt(args[1]);

  if (!days || isNaN(days)) {
    return ctx.reply("❌ Usage: `/kick_inactive <days>`\nExample: `/kick_inactive 30`");
  }

  // Calculate cutoff time
  const cutoffTimestamp = Date.now() - (days * 24 * 60 * 60 * 1000);

  try {
    // Find users who haven't been seen since cutoffTimestamp
    const inactiveUsers = await User.find({ last_seen: { $lt: cutoffTimestamp } });

    if (inactiveUsers.length === 0) {
      return ctx.reply(`✅ No active users found who haven't spoken in ${days} days.`);
    }

    let kickedCount = 0;
    ctx.reply(`⚠️ Found ${inactiveUsers.length} inactive users. Kicking...`);

    for (const user of inactiveUsers) {
      try {
        // Kick logic: Ban then Unban
        await ctx.banChatMember(user.userId);
        await ctx.unbanChatMember(user.userId);
        kickedCount++;
      } catch (e) {
        console.error(`Failed to kick ${user.username} (${user.userId}):`, e.message);
      }
    }
    ctx.reply(`🧹 Removed ${kickedCount} inactive users.`);

  } catch (err) {
    console.error('Error fetching inactive users:', err);
    ctx.reply('❌ An error occurred while checking for inactive users.');
  }
});

// --- 1. File Moderation Logic ---
bot.on('document', async (ctx) => {
  const doc = ctx.message.document;
  const fileName = doc.file_name ? doc.file_name.toLowerCase() : '';

  // Check if file ends with any banned extension
  const isBanned = BANNED_EXTENSIONS.some(ext => fileName.endsWith(ext));

  if (isBanned) {
    try {
      // 1. Delete the message
      await ctx.deleteMessage();

      // 2. Notify the group (Visible to all)
      await ctx.reply(`⚠️ **Security Alert**: A malicious file type (${fileName}) was detected from @${ctx.from.username || ctx.from.first_name} and has been removed.`);

      console.log(`Deleted banned file header: ${fileName} from user ${ctx.from.id}`);
    } catch (err) {
      console.error('Failed to delete message or reply:', err);
    }
  }
});

// --- 2. Deleted Account Logic (Ghost Sweeper) ---
bot.command('clean_ghosts', async (ctx) => {
  return ctx.reply("ℹ️ **System Info**: Telegram Bots cannot list all group members directly to find deleted accounts. I can only check members if I have seen them before or if you reply to their message with /check.");
});

// Allow admin to check a specific user by replying to them
bot.command('check', async (ctx) => {
  if (!ctx.message.reply_to_message) {
    return ctx.reply("Please reply to a user's message to check their status.");
  }
  const targetUserId = ctx.message.reply_to_message.from.id;
  try {
    const member = await ctx.telegram.getChatMember(ctx.chat.id, targetUserId);
    if (member.user.is_bot) {
      return ctx.reply("🤖 That user is a bot.");
    }
    if (member.status === 'left' || member.status === 'kicked') {
      return ctx.reply("❌ User is already gone.");
    }

    ctx.reply(`✅ User status: ${member.status}. Name: ${member.user.first_name}`);
  } catch (e) {
    ctx.reply("⚠️ Could not fetch user. They might be a completely deleted account.");
  }
});

// --- 3. New Member Alert & Admin Tagging ---
let ADMIN_USERNAME = '';
// NOTE: This variable resets if the bot restarts. 
// For 24/7 reliability, we recommend storing the admin ID in MongoDB as well.

bot.command('setadmin', (ctx) => {
  // Usage: /setadmin @username or just /setadmin to set yourself
  if (ctx.message.text.split(' ').length > 1) {
    ADMIN_USERNAME = ctx.message.text.split(' ')[1];
  } else {
    ADMIN_USERNAME = '@' + (ctx.from.username || ctx.from.first_name);
  }
  ctx.reply(`✅ Security Alert Admin set to: ${ADMIN_USERNAME}`);
});

bot.on('new_chat_members', (ctx) => {
  // Logic: Tag the admin when someone joins
  const newMembers = ctx.message.new_chat_members;
  const adminTag = ADMIN_USERNAME ? ADMIN_USERNAME : 'Admins (Use /setadmin to configure)';

  newMembers.forEach(member => {
    if (!member.is_bot) {
      ctx.reply(`🚨 **Security Alert**: New member joined: ${member.first_name} (ID: ${member.id}).\n${adminTag}, please verify if this is a staff member.`);
    }
  });
});

// Start the bot
bot.launch().then(() => {
  console.log('Bot is running...');
}).catch(err => {
  console.error('Failed to start bot', err);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
