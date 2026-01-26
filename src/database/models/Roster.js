const mongoose = require('mongoose');

const rosterSchema = new mongoose.Schema({
    chatId: { type: Number, required: true },
    codes: [{ type: String, uppercase: true }] // Array of allowed codes e.g. ["HENG1", "S12"]
});

module.exports = mongoose.model('Roster', rosterSchema);
