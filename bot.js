require('dotenv').config();
const { Telegraf } = require('telegraf');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const express = require('express'); // Added for Uptime Monitoring

// --- Configuration ---
const BOT_TOKEN = process.env.BOT_TOKEN;
const MONGO_URI = process.env.MONGO_URI;
// We read OWNER_ID from env, but if not set, user can't generate keys.
const OWNER_ID = process.env.OWNER_ID ? parseInt(process.env.OWNER_ID) : null;
const PORT = process.env.PORT || 3000; // Allow cloud provider to set PORT

if (!BOT_TOKEN || !MONGO_URI) {
  console.error("❌ CRTICAL ERROR: Missing BOT_TOKEN or MONGO_URI in .env file.");
  console.error("Please add them to your .env file.");
}

const bot = new Telegraf(BOT_TOKEN || 'YOUR_FALLBACK_TOKEN_HERE');

const BANNED_EXTENSIONS = [
  '.exe', '.apk', '.scr', '.bat', '.cmd', '.sh', '.com', '.msi', '.jar'
];

// --- Database & Foundation Setup ---
mongoose.set('strictQuery', false);

const connectDB = async (retryCount = 0) => {
  console.log(`📡 Attempting MongoDB Connection... (Try ${retryCount + 1})`);
  const options = {
    serverSelectionTimeoutMS: 10000, // Give it 10s
    socketTimeoutMS: 45000,
    bufferCommands: false,
  };

  try {
    if (!MONGO_URI) throw new Error("MONGO_URI is missing from .env");
    await mongoose.connect(MONGO_URI, options);
    console.log('✅ Ironclad Foundation: Connected to MongoDB');
    // Once connected, preload the cache
    await preloadCache();
  } catch (err) {
    console.error(`❌ Connection Attempt ${retryCount + 1} Failed:`, err.message);
    if (retryCount < 10) {
      console.log('🔄 Retrying in 5 seconds...');
      setTimeout(() => connectDB(retryCount + 1), 5000);
    }
  }
};

connectDB();

// Handle Disconnection
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB Disconnected. Bot functionality will be limited.');
});


// --- Heartbeat Server (For Uptime Monitoring) ---
const app = express();
app.get('/', (req, res) => {
  res.send('Bot is alive! 🤖');
});
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});
app.listen(PORT, () => {
  console.log(`💓 Heartbeat server listening on port ${PORT}`);
});

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

// 4. System Settings (New - Ironclad Persistence)
const settingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: mongoose.Schema.Types.Mixed,
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Group = mongoose.model('Group', groupSchema);
const License = mongoose.model('License', licenseSchema);
const Setting = mongoose.model('Setting', settingSchema);


// --- Caching for Performance ---
// Store authorized Chat IDs in memory to avoid DB hitting on every message
const authorizedCache = new Set();
const CACHE_TTL = 1000 * 60 * 5; // Refresh every 5 minutes (Optional, simplified here)

// Pre-load cache on startup
const preloadCache = async () => {
  try {
    if (mongoose.connection.readyState !== 1) return;
    const groups = await Group.find({ isAuthorized: true });
    authorizedCache.clear();
    groups.forEach(g => authorizedCache.add(g.chatId));
    console.log(`✅ Cache: Loaded ${authorizedCache.size} authorized groups.`);
  } catch (e) {
    console.error("Cache preload failed:", e.message);
  }
};

// --- Middleware 0: Emergency Ping (No DB Required) ---
bot.command('ping', (ctx) => {
  return ctx.reply('🏓 Pong! I am alive. (DB Status: ' + mongoose.connection.readyState + ')');
});

// --- Middleware 1: Access Control & Authorization ---
bot.use(async (ctx, next) => {
  // Allow private chats always
  if (ctx.chat && ctx.chat.type === 'private') return next();

  // DEBUG LOG
  if (ctx.chat) {
    console.log(`📨 Msg from ${ctx.chat.title} (${ctx.chat.id}): ${ctx.message && ctx.message.text ? ctx.message.text : '[Non-Text]'}`);
  }

  // Check Groups
  if (ctx.chat && (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup')) {
    const chatId = ctx.chat.id;

    // Fast Path: Cache
    if (authorizedCache.has(chatId)) return next();

    // Check DB (With Fast Timeout)
    try {
      // connecting(2) or connected(1)
      if (mongoose.connection.readyState !== 1) {
        console.warn("⚠️ DB Not Connected. Skipping Auth Check (Bot might be limited).");
        // Optional: return next() if you want it to work offline, 
        // but better to block or warn. 
        // For now, let's allow commands to pass so user sees "DB Error" later instead of silence.
      }

      let group = await Group.findOne({ chatId: chatId }).maxTimeMS(2000); // 2s Timeout

      // Allow specific commands even if unauthorized
      const text = ctx.message && ctx.message.text ? ctx.message.text : '';
      if (text.match(/^\/(activate|id|unlock|debug|ping)/)) return next();

      if (!group || !group.isAuthorized) return;

      authorizedCache.add(chatId);
    } catch (e) {
      console.error("Auth Middleware Error:", e.message);
      // On DB Error, allow /debug to pass so we can diagnose
      if (ctx.message && ctx.message.text && ctx.message.text.includes('/debug')) return next();
    }
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

// --- Helper: Check Admin Permissions ---
const isGroupAdmin = async (ctx) => {
  // 1. Owner always allowed
  // Ensure strict comparison with string/number safety
  if (OWNER_ID && String(ctx.from.id) === String(OWNER_ID)) return true;

  // 2. Private chat always allowed (for Owner/Admin DMs)
  if (ctx.chat.type === 'private') return true;

  // 3. Handle "Anonymous Group Admin" (Telegram Feature)
  // ID 1087968824 is the generic ID for all anonymous admins
  if (ctx.from.id === 1087968824) return true;

  try {
    const member = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);
    return member.status === 'administrator' || member.status === 'creator';
  } catch (e) {
    console.error('Error checking admin:', e);
    return false;
  }
};

// --- 0. Link Shield Logic (Level 1: Block All) ---
bot.use(async (ctx, next) => {
  // Only inspect text messages
  if (ctx.message && ctx.message.text) {
    const text = ctx.message.text.toLowerCase();

    // Regex for: http(s), www, or common domains (com|net|org...)
    const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(\b\w+\.(com|net|org|xyz|info|biz|io|me)\b)/gi;

    if (urlRegex.test(text)) {
      // Logic: Allow Admins, Block Everyone Else
      const isAdmin = await isGroupAdmin(ctx);

      if (!isAdmin) {
        try {
          await ctx.deleteMessage();
          // Optional: Send a warning message that auto-deletes
          // const reply = await ctx.reply(`⚠️ @${ctx.from.username || ctx.from.first_name}, links are not allowed in this group.`);
          // setTimeout(() => ctx.telegram.deleteMessage(ctx.chat.id, reply.message_id), 5000);
          console.log(`🛡️ Link Shield: Deleted link from ${ctx.from.username || ctx.from.id}`);
          return; // Stop processing
        } catch (e) {
          console.error("Link Shield failed to delete:", e.message);
        }
      }
    }
  }
  return next();
});


// --- Commands: Access Control ---

// 0. Debug/Diagnostics (Helper)
bot.command('debug', async (ctx) => {
  // RESTRICTION: Only Admins can use this
  if (!await isGroupAdmin(ctx)) {
    return ctx.reply("❌ **Access Denied**: You must be a Group Admin to use this command.");
  }

  const chatId = ctx.chat.id;
  let statusMsg = `🔍 **Diagnostic Report**\n\n`;

  // 1. Check Authorization (DB)
  const group = await Group.findOne({ chatId: chatId });
  const isDbAuth = group && group.isAuthorized;
  statusMsg += `📂 **Database**: ${isDbAuth ? '✅ Authorized' : '❌ LOCKED (Not Authorized)'}\n`;

  // 2. Check Authorization (Cache)
  const isCacheAuth = authorizedCache.has(chatId);
  statusMsg += `🚀 **Cache**: ${isCacheAuth ? '✅ Hit' : '⚠️ Miss (Will rely on DB)'}\n`;

  // 3. Check Admin Rights
  try {
    const member = await ctx.telegram.getChatMember(chatId, ctx.botInfo.id);
    const isAdmin = member.status === 'administrator' || member.status === 'creator';
    const canDelete = member.can_delete_messages;

    statusMsg += `🤖 **Bot Admin Rights**: ${isAdmin ? '✅ Yes' : '❌ NO (Make me admin!)'}\n`;
    if (isAdmin) {
      statusMsg += `🗑️ **Bot Can Delete**: ${canDelete ? '✅ Yes' : '❌ NO (Check permissions!)'}\n`;
    }
  } catch (e) {
    statusMsg += `❓ **Bot Check**: Failed (${e.message})\n`;
  }

  // 4. Owner Check
  statusMsg += `👑 **Owner Configured**: ${OWNER_ID ? '✅ Yes' : '❌ NO'}\n`;
  if (OWNER_ID) {
    statusMsg += `👤 **You are Owner**: ${String(ctx.from.id) === String(OWNER_ID) ? '✅ Yes' : '❌ NO'}\n`;
  }


  ctx.reply(statusMsg);
});

// 1. Get My ID (Helper)
bot.command('id', (ctx) => {
  ctx.reply(`🆔 Your ID: \`${ctx.from.id}\`\n📍 Chat ID: \`${ctx.chat.id}\``, { parse_mode: 'Markdown' });
});

// 2. Generate Key (Owner Only)
bot.command('generate_key', async (ctx) => {
  if (!OWNER_ID) {
    return ctx.reply("❌ OWNER_ID is not set in the .env file. I don't know who the boss is.");
  }
  if (String(ctx.from.id) !== String(OWNER_ID)) {
    return ctx.reply("⛔ You are not authorized to generate keys. (Owner Only)");
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
  if (!await isGroupAdmin(ctx)) {
    return ctx.reply("❌ **Access Denied**: You must be a Group Admin to use this command.");
  }

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

    ctx.reply("✅ **Activation Successful!**\nThis group is now authorized to use the Aero Smart 24/7.");

    // Update Cache immediately
    authorizedCache.add(ctx.chat.id);

  } catch (e) {
    console.error(e);
    ctx.reply("❌ Error during activation.");
  }
});

// 4. Owner Override Unlock
bot.command('unlock', async (ctx) => {
  // Check if OWNER_ID is valid and matches message sender
  if (!OWNER_ID || String(ctx.from.id) !== String(OWNER_ID)) {
    // Reply allows user to know why it failed, instead of silence
    return ctx.reply("⛔ **Access Denied**: This command is restricted to the Bot Owner.");
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
    // Update Cache immediately
    authorizedCache.add(ctx.chat.id);

    ctx.reply("🔓 **Owner Override Enabled**\nThis group is now authorized.");
  } catch (e) {
    console.error(e);
    ctx.reply("❌ Error unlocking group.");
  }
});

// --- Command: Kick inactive users ---
bot.command('kick_inactive', async (ctx) => {
  if (!await isGroupAdmin(ctx)) {
    return ctx.reply("❌ **Access Denied**: You must be a Group Admin to use this command.");
  }

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
  if (!await isGroupAdmin(ctx)) {
    return ctx.reply("❌ **Access Denied**: You must be a Group Admin to use this command.");
  }
  return ctx.reply("ℹ️ **System Info**: Telegram Bots cannot list all group members directly to find deleted accounts. I can only check members if I have seen them before or if you reply to their message with /check.");
});

// Allow admin to check a specific user by replying to them
bot.command('check', async (ctx) => {
  if (!await isGroupAdmin(ctx)) {
    return ctx.reply("❌ **Access Denied**: You must be a Group Admin to use this command.");
  }

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
bot.command('setadmin', async (ctx) => {
  if (!await isGroupAdmin(ctx)) {
    return ctx.reply("❌ **Access Denied**: You must be a Group Admin to use this command.");
  }

  let targetAdmin = '';
  if (ctx.message.text.split(' ').length > 1) {
    targetAdmin = ctx.message.text.split(' ')[1];
  } else {
    targetAdmin = '@' + (ctx.from.username || ctx.from.first_name);
  }

  try {
    await Setting.findOneAndUpdate(
      { key: 'ADMIN_USERNAME' },
      { value: targetAdmin },
      { upsert: true }
    );
    ctx.reply(`✅ Security Alert Admin set to: ${targetAdmin} (Saved to Database)`);
  } catch (e) {
    console.error("Failed to save admin setting:", e);
    ctx.reply("⚠️ Saved locally, but failed to save to Database.");
  }
});

bot.on('new_chat_members', async (ctx) => {
  const newMembers = ctx.message.new_chat_members;

  // Fetch Admin Tag from DB or default
  let adminTag = 'Admins';
  try {
    const setting = await Setting.findOne({ key: 'ADMIN_USERNAME' });
    if (setting) adminTag = setting.value;
  } catch (e) {
    console.error("Failed to fetch admin setting:", e);
  }

  newMembers.forEach(member => {
    if (!member.is_bot) {
      ctx.reply(`🚨 **Security Alert**: New member joined: ${member.first_name} (ID: ${member.id}).\n${adminTag}, please verify if this is a staff member.`);
    }
  });
});

// Start the bot
bot.launch().then(() => {
  console.log('Bot is running...');
  console.log(`👑 Owner ID configured: ${OWNER_ID ? getLast4Digits(OWNER_ID) : 'Not Set'}`);
}).catch(err => {
  console.error('Failed to start bot', err);
});

// Helper to mask ID
function getLast4Digits(id) {
  const s = String(id);
  return s.length > 4 ? '...' + s.slice(-4) : s;
}

// Global Error Handler
bot.catch((err, ctx) => {
  console.error(`❌ Global Error for ${ctx.updateType}:`, err);
  // Don't crash, just log
});

// --- Event: Bot Status Change (Promoted to Admin) ---
bot.on('my_chat_member', async (ctx) => {
  const newStatus = ctx.myChatMember.new_chat_member.status;
  const oldStatus = ctx.myChatMember.old_chat_member.status;
  const chat = ctx.chat;

  console.log(`ℹ️ Status change in ${chat.title} (${chat.id}): ${oldStatus} -> ${newStatus}`);

  if (newStatus === 'administrator' && oldStatus !== 'administrator') {
    try {
      await ctx.reply(`🤖 **Thanks for promoting me!**\n\nI am now an Admin.\nTo use me, please authorize this group:\n\n1. Get a key from the owner.\n2. Run \`/activate <KEY>\`\n\n(Owner can use \`/unlock\`)`);
    } catch (e) {
      console.error("Could not reply to promotion event:", e);
    }
  }
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
