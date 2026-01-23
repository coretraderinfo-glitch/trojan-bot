require('dotenv').config();
const { Telegraf } = require('telegraf');
const mongoose = require('mongoose');

// --- Configuration ---
const BOT_TOKEN = process.env.BOT_TOKEN;
const MONGO_URI = process.env.MONGO_URI;

if (!BOT_TOKEN || !MONGO_URI) {
  console.error("❌ CRTICAL ERROR: Missing BOT_TOKEN or MONGO_URI in .env file.");
  console.error("Please add them to your .env file.");
  // process.exit(1); // Commented out to allow the bot to 'start' so you can see the error, but it won't work consistently.
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

// Schema for tracking user activity
const userSchema = new mongoose.Schema({
  userId: { type: Number, required: true, unique: true },
  username: String,
  last_seen: { type: Number, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// --- Middleware: Track activity on EVERY message ---
bot.use(async (ctx, next) => {
  if (ctx.from && ctx.chat && ctx.chat.type !== 'private') {
    const userId = ctx.from.id;
    const username = ctx.from.username || ctx.from.first_name;
    const now = Date.now();

    try {
      // Upsert: Update if exists, Insert if new
      await User.findOneAndUpdate(
        { userId: userId },
        { last_seen: now, username: username },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } catch (err) {
      console.error('Error updating user activity in DB:', err);
    }
  }
  return next();
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
