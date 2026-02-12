const { Telegraf } = require('telegraf');
const express = require('express');
const config = require('./config');
const connectDB = require('./database/connection');
const { authMiddleware, preloadCache } = require('./middleware/auth');
const activityTracker = require('./middleware/activity');
const linkShield = require('./middleware/shield');
const registerCommands = require('./commands');
const registerHandlers = require('./handlers');
const initScheduler = require('./utils/scheduler');

// 1. Initialize Bot
const bot = new Telegraf(config.BOT_TOKEN);

// 2. Foundation: Heartbeat (Uptime, starts immediately for orchestrators)
const app = express();
app.get('/health', (req, res) => res.status(200).send('OK'));
app.get('/', (req, res) => res.send('Ironclad Bot Alive 🤖'));
app.listen(config.PORT, () => console.log(`💓 Heartbeat: Listening on port ${config.PORT}`));

// 3. Middlewares (The Filter Pipeline)
bot.use(authMiddleware);
bot.use(activityTracker);
bot.use(linkShield);

// 4. Features (Commands & Events)
registerCommands(bot);
registerHandlers(bot);

// 5. Global Catch
bot.catch((err, ctx) => {
    console.error(`❌ Global Registry Error (${ctx.updateType}):`, err.message);
});

// 6. Launch Sequence (Async)
const launch = async () => {
    try {
        console.log("🚀 Startup: Initiating sequence...");

        // 6.1 Connect to DB first (Race Condition Fix)
        // Note: connectDB handles its own retries, but we await the first attempt.
        await connectDB(0, preloadCache);

        // 6.2 Preload Cache
        if (mongoose.connection.readyState === 1) {
            await preloadCache();
        }

        // 6.3 Internal Scheduler
        initScheduler();

        // 2.1 Cache Reliability: Refresh the authorized groups cache every 5 minutes
        setInterval(() => preloadCache(), 300000);

        // 6.4 Launch Bot
        console.log("🚀 Startup: Launching Telegram Bot...");
        await bot.launch();
        console.log(`✅ Trojan AI: Deployment Successful.`);
        console.log(`👑 Owner ID: ${config.OWNER_ID || 'Not Configured'}`);
    } catch (err) {
        console.error("❌ CRITICAL STARTUP ERROR:", err);
        // Do not exit, to allow Health Check to keep container alive for debugging
        // process.exit(1); 
    }
};

launch();

// 7. Process Safety Protocols
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

process.on('uncaughtException', (err) => {
    console.error('🔥 UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🔥 UNHANDLED REJECTION:', reason);
});

module.exports = bot;
