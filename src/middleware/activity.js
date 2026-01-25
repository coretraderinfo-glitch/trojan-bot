const User = require('../database/models/User');

const activityTracker = async (ctx, next) => {
    if (ctx.from && ctx.chat && ctx.chat.type !== 'private') {
        const userId = ctx.from.id;
        const username = ctx.from.username || ctx.from.first_name;

        try {
            await User.findOneAndUpdate(
                { userId: userId },
                { last_seen: Date.now(), username: username },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
        } catch (err) {
            console.error('Activity Error:', err.message);
        }
    }
    return next();
};

module.exports = activityTracker;
