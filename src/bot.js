const { Telegraf } = require('telegraf');
const express = require('express');
const config = require('./config');
const connectDB = require('./database/connection');
const { authMiddleware, preloadCache } = require('./middleware/auth');
const activityTracker = require('./middleware/activity');
const linkShield = require('./middleware/shield');
const registerCommands = require('./commands');
const registerHandlers = require('./handlers');

// 1. Initialize Bot
const bot = new Telegraf(config.BOT_TOKEN);

// 2. Foundation: Database
connectDB(0, preloadCache);

// 2.1 Cache Reliability: Refresh the authorized groups cache every 5 minutes
// This ensures that activations on other instances are synchronized.
setInterval(() => preloadCache(), 300000);

// 3. Foundation: Heartbeat (Uptime)
const app = express();
app.get('/health', (req, res) => res.status(200).send('OK'));
app.get('/', (req, res) => res.send('Ironclad Bot Alive 🤖'));
app.listen(config.PORT, () => console.log(`💓 Heartbeat: Listening on port ${config.PORT}`));

// 4. Middlewares (The Filter Pipeline)
bot.use(authMiddleware);
bot.use(activityTracker);
bot.use(linkShield);

// 5. Features (Commands & Events)
registerCommands(bot);
registerHandlers(bot);

// 6. Global Catch
bot.catch((err, ctx) => {
    console.error(`❌ Global Registry Error (${ctx.updateType}):`, err.message);
});

// 7. Launch
bot.launch().then(() => {
    console.log(`🚀 Trojan AI: Deployment Successful.`);
    console.log(`👑 Owner ID: ${config.OWNER_ID || 'Not Configured'}`);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

module.exports = bot;
