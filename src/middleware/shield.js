const helpers = require('../utils/helpers');

const linkShield = async (ctx, next) => {
    if (ctx.message && ctx.message.text) {
        const text = ctx.message.text.toLowerCase();
        const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(\b\w+\.(com|net|org|xyz|info|biz|io|me)\b)/gi;

        if (urlRegex.test(text)) {
            const isAdmin = await helpers.isGroupAdmin(ctx);
            if (!isAdmin) {
                try {
                    await ctx.deleteMessage();
                    console.log(`🛡️ Link Shield: Blocked link from ${ctx.from.id}`);
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
