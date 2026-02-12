const helpers = require('../utils/helpers');
const mongoose = require('mongoose');
const SecurityLog = require('../database/models/SecurityLog');

const linkShield = async (ctx, next) => {
    // Prevent blocking or logging if DB is not ready (Race Condition Fix)
    if (mongoose.connection.readyState !== 1) return next();

    if (ctx.message && ctx.message.text) {
        const text = ctx.message.text.toLowerCase();
        const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(\b\w+\.(com|net|org|xyz|info|biz|io|me)\b)/gi;

        if (urlRegex.test(text)) {
            const isAdmin = await helpers.isGroupAdmin(ctx);
            if (!isAdmin) {
                try {
                    // Record in SecurityLog
                    await SecurityLog.create({
                        type: 'LINK',
                        userId: ctx.from.id,
                        username: ctx.from.username || ctx.from.first_name,
                        chatId: ctx.chat.id,
                        chatTitle: ctx.chat.title,
                        details: { link: text }
                    });

                    await ctx.deleteMessage();
                    console.log(`🛡️ Link Shield: Blocked and Logged link from ${ctx.from.id}`);
                    return;
                } catch (e) {
                    console.error("Shield Error:", e.message);
                }
            }
        }
    }
    return next();
};

module.exports = linkShield;
