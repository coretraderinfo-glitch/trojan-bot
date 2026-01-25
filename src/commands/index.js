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

    // --- Owner ---
    bot.command('generate_key', async (ctx) => {
        if (String(ctx.from.id) !== String(config.OWNER_ID)) return ctx.reply("⛔ Owner only.");
        const key = uuidv4();
        await License.create({ key, createdBy: ctx.from.id });
        ctx.reply(`🔑 New Key: \`${key}\``, { parse_mode: 'Markdown' });
    });

    bot.command('unlock', async (ctx) => {
        if (String(ctx.from.id) !== String(config.OWNER_ID)) return ctx.reply("⛔ Owner only.");
        await Group.findOneAndUpdate({ chatId: ctx.chat.id }, {
            isAuthorized: true, authorizedAt: Date.now()
        }, { upsert: true });
        authorizedCache.add(ctx.chat.id);
        ctx.reply("🔓 Override: Group Authorized.");
    });
};
