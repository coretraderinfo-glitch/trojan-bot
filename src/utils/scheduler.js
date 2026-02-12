const User = require('../database/models/User');
const mongoose = require('mongoose');

// Default: Prune users inactive for 90 days
const INACTIVE_THRESHOLD = 90 * 24 * 60 * 60 * 1000;
// Run the check every 24 hours
const PRUNE_INTERVAL = 24 * 60 * 60 * 1000;

const pruneInactiveUsers = async () => {
    // Prevent crash if DB is not ready
    if (mongoose.connection.readyState !== 1) return;

    const cutoff = Date.now() - INACTIVE_THRESHOLD;
    try {
        const result = await User.deleteMany({ last_seen: { $lt: cutoff } });
        if (result.deletedCount > 0) {
            console.log(`🧹 Scheduler: Pruned ${result.deletedCount} inactive users from database (inactive > 90 days).`);
        }
    } catch (err) {
        console.error('❌ Scheduler Error (Pruning):', err.message);
    }
};

const initScheduler = () => {
    console.log('⏰ Scheduler: User Activity Pruning initialized (Daily check).');

    // Initial run after 1 minute to allow DB connection to stabilize
    setTimeout(pruneInactiveUsers, 60000);

    // Schedule repeating task
    setInterval(pruneInactiveUsers, PRUNE_INTERVAL);
};

module.exports = initScheduler;
