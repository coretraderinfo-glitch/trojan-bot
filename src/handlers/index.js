const config = require('../config');
const Setting = require('../database/models/Setting');
const SecurityLog = require('../database/models/SecurityLog');
const Roster = require('../database/models/Roster');
const Sale = require('../database/models/Sale');
const { generateScoreboard } = require('../utils/reports');

module.exports = (bot) => {
    // 1. Malware Moderation Engine
    bot.on('document', async (ctx) => {
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
                await SecurityLog.create({
                    type: 'MALWARE',
                    userId: ctx.from.id,
                    username: ctx.from.username || ctx.from.first_name,
                    chatId: ctx.chat.id,
                    chatTitle: ctx.chat.title,
                    details: { fileName, mimeType }
                });

                await ctx.deleteMessage();
                const reason = isMasquerading ? "MIME Masquerade" : "Banned File Extension";
                ctx.reply(`🛡️ **Security Alert**: Aero Smart blocked a malicious file (${fileName}).\n**Status**: ${reason} detected.`);
            } catch (e) {
                console.error("Malware Shield failure:", e.message);
            }
        }
    });

    // 2. Sales Tracker Listener
    bot.on('text', async (ctx, next) => {
        if (!ctx.message || !ctx.message.text) return next();

        const text = ctx.message.text.trim().toUpperCase();
        const regex = /^([A-Z0-9]+)\s*[+=]\s*([0-9,.]+)$/;
        const match = text.match(regex);

        if (match) {
            const staffCode = match[1];
            const amountStr = match[2].replace(/,/g, '');
            const amount = parseFloat(amountStr);

            if (isNaN(amount)) return next();

            const roster = await Roster.findOne({ chatId: ctx.chat.id });
            if (!roster || !roster.codes.includes(staffCode)) return next();

            try {
                await Sale.create({
                    userId: ctx.from.id,
                    staffCode,
                    amount,
                    chatId: ctx.chat.id
                });

                const report = await generateScoreboard(ctx.chat.id, staffCode);
                ctx.reply(report, { parse_mode: 'Markdown' });
                return;
            } catch (e) {
                console.error("Sales Tracker Error:", e.message);
            }
        }
        return next();
    });

    // 3. New Member Verification
    bot.on('new_chat_members', async (ctx) => {
        const setting = await Setting.findOne({ key: 'ADMIN_USERNAME' });
        const tag = setting?.value || 'Admins';

        ctx.message.new_chat_members.forEach(m => {
            if (!m.is_bot) {
                ctx.reply(`🚨 **Alert**: ${m.first_name} joined. ${tag}, please verify.`);
            }
        });
    });

    // 4. Status changes
    bot.on('my_chat_member', async (ctx) => {
        if (ctx.myChatMember.new_chat_member.status === 'administrator') {
            ctx.reply(`🤖 **Ironclad Foundation Online**\nI am now an Admin. Use /activate to start.`);
        }
    });
};
