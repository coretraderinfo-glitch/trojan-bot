const config = require('../config');

const helpers = {
    isGroupAdmin: async (ctx) => {
        if (!ctx.from || !ctx.chat) return false;

        // 1. Owner Override
        if (config.OWNER_ID && String(ctx.from.id) === String(config.OWNER_ID)) return true;

        // 2. Private Chat Override
        if (ctx.chat.type === 'private') return true;

        // 3. Anonymous Admin (Static ID from Telegram)
        if (ctx.from.id === 1087968824) return true;

        try {
            const member = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);
            return member.status === 'administrator' || member.status === 'creator';
        } catch (e) {
            // This happens if the bot is kicked or hasn't seen the user
            console.error('⚠️ Admin Check Failure:', e.message);
            return false;
        }
    },

    getLast4Digits: (id) => {
        const s = String(id);
        return s.length > 4 ? '...' + s.slice(-4) : s;
    }
};

module.exports = helpers;
