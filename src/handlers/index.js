const config = require('../config');
const mongoose = require('mongoose');
const Setting = require('../database/models/Setting');
const SecurityLog = require('../database/models/SecurityLog');

module.exports = (bot) => {
    // 1. Malware Moderation Engine
    bot.on('document', async (ctx) => {
        if (!ctx.from || !ctx.chat) return; // Basic safety

        const doc = ctx.message.document;
        const fileName = doc.file_name?.toLowerCase() || '';
        const mimeType = doc.mime_type?.toLowerCase() || '';

        const parts = fileName.split('.');
        const hasBannedExtension = parts.some(part =>
            config.BANNED_EXTENSIONS.includes(`.${part}`)
        );

        const isMasquerading = (
            (fileName.endsWith('.jpg') || fileName.endsWith('.png') || fileName.endsWith('.pdf')) &&
            (mimeType.includes('executable') || mimeType.includes('application/x-msdownload'))
        );

        if (hasBannedExtension || isMasquerading) {
            try {
                // Only log if DB is actually ready
                if (mongoose.connection.readyState === 1) {
                    await SecurityLog.create({
                        type: 'MALWARE',
                        userId: ctx.from.id,
                        username: ctx.from.username || ctx.from.first_name,
                        chatId: ctx.chat.id,
                        chatTitle: ctx.chat.title,
                        details: { fileName, mimeType }
                    });
                }

                await ctx.deleteMessage();
                const reason = isMasquerading ? "MIME Masquerade" : "Banned File Extension";
                ctx.reply(`🛡️ **Security Alert**: Aero Smart blocked a malicious file (${fileName}).\n**Status**: ${reason} detected.`);
            } catch (e) {
                console.error("⚠️ Malware Shield error:", e.message);
            }
        }
    });

    // 2. New Member Verification
    bot.on('new_chat_members', async (ctx) => {
        let tag = 'Admins';

        try {
            if (mongoose.connection.readyState === 1) {
                const setting = await Setting.findOne({ key: 'ADMIN_USERNAME' });
                if (setting?.value) tag = setting.value;
            }
        } catch (e) {
            console.error("⚠️ New Member handler DB error:", e.message);
        }

        ctx.message.new_chat_members.forEach(m => {
            if (!m.is_bot) {
                ctx.reply(`🚨 **Alert**: ${m.first_name} joined. ${tag}, please verify.`);
            }
        });
    });

    // 3. Status changes (Activation prompt)
    bot.on('my_chat_member', async (ctx) => {
        try {
            if (ctx.myChatMember.new_chat_member.status === 'administrator') {
                ctx.reply(`🤖 **Ironclad Foundation Online**\nI am now an Admin. Use /activate to start.`);
            }
        } catch (e) {
            console.error("⚠️ Status change error:", e.message);
        }
    });
};
