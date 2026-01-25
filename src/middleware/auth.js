const mongoose = require('mongoose');
const Group = require('../database/models/Group');

const authorizedCache = new Set();

const authMiddleware = async (ctx, next) => {
    if (!ctx.chat || ctx.chat.type === 'private') return next();

    const chatId = ctx.chat.id;
    if (authorizedCache.has(chatId)) return next();

    try {
        // Fast path: allow system commands even if not active
        const text = ctx.message && ctx.message.text ? ctx.message.text : '';
        if (text.match(/^\/(activate|id|unlock|debug|ping)/)) return next();

        if (mongoose.connection.readyState !== 1) {
            console.warn("⚠️ Auth: DB unreachable. Allowing command through.");
            return next();
        }

        const group = await Group.findOne({ chatId: chatId }).maxTimeMS(2000);
        if (!group || !group.isAuthorized) return; // Ignore unauthorized messages

        authorizedCache.add(chatId);
        return next();
    } catch (e) {
        console.error("Auth Error:", e.message);
        if (ctx.message && ctx.message.text && ctx.message.text.includes('/debug')) return next();
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
