const config = require('../config');

const helpers = {
    isGroupAdmin: async (ctx) => {
        if (config.OWNER_ID && String(ctx.from.id) === String(config.OWNER_ID)) return true;
        if (ctx.chat.type === 'private') return true;
        if (ctx.from.id === 1087968824) return true; // Anonymous Admin

        try {
            const member = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);
            return member.status === 'administrator' || member.status === 'creator';
        } catch (e) {
            console.error('Error checking admin status:', e.message);
            return false;
        }
    },

    getLast4Digits: (id) => {
        const s = String(id);
        return s.length > 4 ? '...' + s.slice(-4) : s;
    }
};

module.exports = helpers;
