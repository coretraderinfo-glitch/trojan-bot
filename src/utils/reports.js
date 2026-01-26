const Roster = require('../database/models/Roster');
const Sale = require('../database/models/Sale');

async function generateScoreboard(chatId, latestCode = null) {
    const roster = await Roster.findOne({ chatId });
    if (!roster) return "❌ No Roster configured for this group. Use `/import_roster` first.";

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const salesToday = await Sale.find({
        chatId,
        timestamp: { $gte: start, $lte: end }
    });

    let output = `📊 **Sales Scoreboard (Live)**\n\n`;
    let total = 0;

    roster.codes.forEach(code => {
        const codeSales = salesToday.filter(s => s.staffCode === code);
        const sum = codeSales.reduce((acc, s) => acc + s.amount, 0);
        total += sum;

        const sumText = sum > 0 ? sum.toLocaleString() : '';
        const highlight = code === latestCode ? '🟢 ' : '';
        output += `${highlight}${code} = ${sumText}\n`;
    });

    output += `\n**TOTAL : ${total.toLocaleString()}**\n`;
    output += `ALL TOTAL : ${total.toLocaleString()}`;

    return output;
}

module.exports = { generateScoreboard };
