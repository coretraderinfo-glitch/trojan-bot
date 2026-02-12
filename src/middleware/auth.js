const mongoose = require('mongoose');
const Group = require('../database/models/Group');

const authorizedCache = new Set();

const authMiddleware = async (ctx, next) => {
    // 1. Allow private chats (personal configuration)
    if (!ctx.chat || ctx.chat.type === 'private') return next();

    const chatId = ctx.chat.id;

    // 2. DEBUG: Log message appearance to see if we are "blind"
    // This helps diagnose Privacy Mode issues.
    const text = ctx.message && ctx.message.text ? ctx.message.text : '';
    const userId = ctx.from ? ctx.from.id : 'unknown';
    const username = ctx.from ? ctx.from.username : 'unknown';

    // 3. Fast path: Allow activation & basic commands even if group isn't authorized yet
    // Supports commands with bot mentions like /activate@YourBot
    if (text.match(/^\/(activate|id|unlock|debug|ping)(@[\w_]+)?/)) {
        console.log(`📡 Command Triggered: ${text} in ${ctx.chat.title} (${chatId}) by ${username}`);
        return next();
    }

    // 4. Check Cache (Authorized Groups)
    if (authorizedCache.has(chatId)) return next();

    try {
        if (mongoose.connection.readyState !== 1) {
            console.warn("⚠️ Auth: DB unreachable. Allowing command through.");
            return next();
        }

        const group = await Group.findOne({ chatId: chatId }).maxTimeMS(2000);

        if (!group || !group.isAuthorized) {
            // Log ignored messages only once in a while or if they look like commands
            if (text.startsWith('/')) {
                console.log(`🚫 Ignored Command: ${text} in Unactivated Group: ${ctx.chat.title} (${chatId})`);
            }
            return;
        }

        authorizedCache.add(chatId);
        return next();
    } catch (e) {
        console.error("Auth Error:", e.message);
        // Allow debug to help fix things
        if (text.includes('/debug')) return next();
        return;
    }
};

const preloadCache = async () => {
    try {
        if (mongoose.connection.readyState !== 1) return;
        const groups = await Group.find({ isAuthorized: true });
        authorizedCache.clear();
        groups.forEach(g => authorizedCache.add(g.chatId));
        console.log(`✅ Cache: Preloaded ${authorizedCache.size} groups.`);
    } catch (e) {
        console.error("Cache Error:", e.message);
    }
};

module.exports = { authMiddleware, authorizedCache, preloadCache };
