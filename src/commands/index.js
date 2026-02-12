const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const Group = require('../database/models/Group');
const License = require('../database/models/License');
const User = require('../database/models/User');
const Setting = require('../database/models/Setting');
const helpers = require('../utils/helpers');
const { authorizedCache } = require('../middleware/auth');
const mongoose = require('mongoose');

module.exports = (bot) => {
    // --- Public ---
    bot.command('ping', (ctx) => {
        return ctx.reply(`🏓 Pong! Ironclad Foundation alive.\n(DB Status: ${mongoose.connection.readyState})`);
    });

    bot.command('id', (ctx) => {
        ctx.reply(`🆔 User: \`${ctx.from.id}\`\n📍 Chat: \`${ctx.chat.id}\``, { parse_mode: 'Markdown' });
    });

    // --- Admin ---
    bot.command('debug', async (ctx) => {
        if (mongoose.connection.readyState !== 1) return ctx.reply("❌ Database is currently offline. System in limited mode.");
        if (!await helpers.isGroupAdmin(ctx)) return ctx.reply("❌ Admins only.");

        const group = await Group.findOne({ chatId: ctx.chat.id });
        const member = await ctx.telegram.getChatMember(ctx.chat.id, ctx.botInfo.id);

        let msg = `🔍 **Audit Report**\n\n`;
        msg += `📂 DB Auth: ${group?.isAuthorized ? '✅' : '❌'}\n`;
        msg += `🚀 Cache: ${authorizedCache.has(ctx.chat.id) ? '✅' : '⚠️'}\n`;
        msg += `🤖 Bot Admin: ${member.status === 'administrator' ? '✅' : '❌'}\n`;
        msg += `👑 Owner: ${config.OWNER_ID ? '✅' : '❌'}`;

        ctx.reply(msg, { parse_mode: 'Markdown' });
    });

    bot.command('activate', async (ctx) => {
        if (mongoose.connection.readyState !== 1) return ctx.reply("❌ Database is currently offline. Cannot activate.");
        if (!await helpers.isGroupAdmin(ctx)) return ctx.reply("❌ Admins only.");
        const key = ctx.message.text.split(' ')[1];
        if (!key) return ctx.reply("❌ Usage: `/activate <KEY>`");

        try {
            const license = await License.findOne({ key, isRedeemed: false });
            if (!license) return ctx.reply("❌ Invalid or used key.");

            await License.updateOne({ _id: license._id }, {
                isRedeemed: true, redeemedBy: ctx.from.id, redeemedAt: Date.now(), redeemedInChat: ctx.chat.id
            });

            await Group.findOneAndUpdate({ chatId: ctx.chat.id }, {
                name: ctx.chat.title, isAuthorized: true, authorizedAt: Date.now(), authorizedBy: ctx.from.id
            }, { upsert: true });

            authorizedCache.add(ctx.chat.id);
            ctx.reply("✅ Group Authorized Successfully.");
        } catch (e) {
            ctx.reply("❌ Activation error.");
        }
    });

    bot.command('setadmin', async (ctx) => {
        if (mongoose.connection.readyState !== 1) return ctx.reply("❌ Database offline.");
        if (!await helpers.isGroupAdmin(ctx)) return ctx.reply("❌ Admins only.");
        const target = ctx.message.text.split(' ')[1] || ('@' + (ctx.from.username || ctx.from.first_name));

        try {
            await Setting.findOneAndUpdate({ key: 'ADMIN_USERNAME' }, { value: target }, { upsert: true });
            ctx.reply(`✅ Admin set to: ${target}`);
        } catch (e) {
            ctx.reply("❌ Settings error.");
        }
    });

    bot.command('kick_inactive', async (ctx) => {
        if (mongoose.connection.readyState !== 1) return ctx.reply("❌ Database offline.");
        if (!await helpers.isGroupAdmin(ctx)) return ctx.reply("❌ Admins only.");
        const days = parseInt(ctx.message.text.split(' ')[1]);
        if (!days) return ctx.reply("❌ Usage: `/kick_inactive <days>`");

        const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
        try {
            const inactives = await User.find({ last_seen: { $lt: cutoff } });
            if (inactives.length === 0) return ctx.reply("✅ No inactive users.");

            ctx.reply(`⚠️ Kicking ${inactives.length} users...`);
            for (const u of inactives) {
                try {
                    await ctx.banChatMember(u.userId);
                    await ctx.unbanChatMember(u.userId);
                } catch (e) { }
            }
            ctx.reply("🧹 Cleanup done.");
        } catch (e) {
            ctx.reply("❌ Cleanup error.");
        }
    });

    bot.command('check', async (ctx) => {
        if (!await helpers.isGroupAdmin(ctx)) return ctx.reply("❌ Admins only.");
        if (!ctx.message.reply_to_message) return ctx.reply("ℹ️ Please reply to a user message to check their status.");

        const target = ctx.message.reply_to_message.from;
        try {
            const member = await ctx.telegram.getChatMember(ctx.chat.id, target.id);
            let info = `👤 **User Audit: ${target.first_name}**\n`;
            info += `🆔 ID: \`${target.id}\`\n`;
            info += `📊 Status: ${member.status}\n`;
            info += `🤖 Bot: ${target.is_bot ? 'Yes' : 'No'}`;
            ctx.reply(info, { parse_mode: 'Markdown' });
        } catch (e) {
            ctx.reply("⚠️ Could not fetch user data. They may have a deleted account.");
        }
    });

    bot.command('clean_ghosts', async (ctx) => {
        if (!await helpers.isGroupAdmin(ctx)) return ctx.reply("❌ Admins only.");
        ctx.reply("🧹 **Ghost Sweeper Service**\n\nTelegram Bots cannot scan member lists directly. To remove 'Deleted Accounts', please run the local Ghost Sweeper script on your machine:\n\n`node scripts/ghost_sweeper.js`", { parse_mode: 'Markdown' });
    });

    bot.command('help', async (ctx) => {
        let help = `🤖 **Aero Smart Help Menu**\n\n`;
        help += `**Public Commands:**\n`;
        help += `/ping, /id\n\n`;

        if (await helpers.isGroupAdmin(ctx)) {
            help += `**Admin Commands:**\n`;
            help += `/activate, /setadmin, /kick_inactive, /check, /clean_ghosts, /debug\n\n`;
        }

        if (String(ctx.from?.id) === String(config.OWNER_ID)) {
            help += `**Owner Commands:**\n`;
            help += `/generate_key, /unlock\n`;
        }

        ctx.reply(help, { parse_mode: 'Markdown' });
    });

    // --- Owner ---
    bot.command('generate_key', async (ctx) => {
        if (mongoose.connection.readyState !== 1) return ctx.reply("❌ Database offline.");
        if (String(ctx.from?.id) !== String(config.OWNER_ID)) return ctx.reply("⛔ Owner only.");
        const key = uuidv4();
        await License.create({ key, createdBy: ctx.from.id });
        ctx.reply(`🔑 New Key: \`${key}\``, { parse_mode: 'Markdown' });
    });

    bot.command('unlock', async (ctx) => {
        if (mongoose.connection.readyState !== 1) return ctx.reply("❌ Database offline.");
        if (String(ctx.from?.id) !== String(config.OWNER_ID)) return ctx.reply("⛔ Owner only.");
        await Group.findOneAndUpdate({ chatId: ctx.chat.id }, {
            isAuthorized: true, authorizedAt: Date.now()
        }, { upsert: true });
        authorizedCache.add(ctx.chat.id);
        ctx.reply("🔓 Override: Group Authorized.");
    });
};
