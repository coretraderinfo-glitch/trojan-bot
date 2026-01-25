const config = require('../config');
const Setting = require('../database/models/Setting');

module.exports = (bot) => {
    // File Moderation
    bot.on('document', async (ctx) => {
        const name = ctx.message.document.file_name?.toLowerCase() || '';
        if (config.BANNED_EXTENSIONS.some(ext => name.endsWith(ext))) {
            try {
                await ctx.deleteMessage();
                ctx.reply(`⚠️ **Security Alert**: Blocked malicious file (${name}) from @${ctx.from.username || ctx.from.id}`);
            } catch (e) { }
        }
    });

    // New Member verification
    bot.on('new_chat_members', async (ctx) => {
        const setting = await Setting.findOne({ key: 'ADMIN_USERNAME' });
        const tag = setting?.value || 'Admins';

        ctx.message.new_chat_members.forEach(m => {
            if (!m.is_bot) {
                ctx.reply(`🚨 **Alert**: ${m.first_name} joined. ${tag}, please verify.`);
            }
        });
    });

    // Status changes
    bot.on('my_chat_member', async (ctx) => {
        if (ctx.myChatMember.new_chat_member.status === 'administrator') {
            ctx.reply(`🤖 **Ironclad Foundation Online**\nI am now an Admin. Use /activate to start.`);
        }
    });
};
