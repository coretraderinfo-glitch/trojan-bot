const cron = require('node-cron');
const Group = require('../database/models/Group');

module.exports = (bot) => {
    // Phase 4: AI Daily Motivation (9:00 AM)
    // Format: '0 9 * * *'
    cron.schedule('0 9 * * *', async () => {
        console.log("⏰ AI Motivation: Triggering 9:00 AM broadcast...");

        try {
            const groups = await Group.find({ isAuthorized: true });

            // Logic: If Gemini Key found, use AI. Otherwise, use hardcoded world-class quotes.
            const message = await getMotivationalQuote();

            for (const group of groups) {
                try {
                    await bot.telegram.sendMessage(group.chatId, `🌅 **Daily Motivation**\n\n${message}`, { parse_mode: 'Markdown' });
                } catch (e) {
                    console.error(`Failed to send motivation to ${group.chatId}:`, e.message);
                }
            }
        } catch (e) {
            console.error("Motivation broadcast error:", e.message);
        }
    });

    console.log("✅ AI Motivation Service: Scheduled (Daily at 9:00 AM)");
};

async function getMotivationalQuote() {
    // If Gemini/OpenAI integrated, call API here.
    // For now, using a curated list of world-class operational wisdom.
    const quotes = [
        "Focus on progress, not perfection. Every small win builds the kingdom.",
        "Discipline is the bridge between goals and accomplishment. Stay sharp today.",
        "Your only limit is the version of yourself you believe in. Break the ceiling.",
        "Success is not final, failure is not fatal: it is the courage to continue that counts.",
        "The best way to predict the future is to create it. Let's build today."
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
}
