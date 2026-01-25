const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
    chatId: { type: Number, required: true, unique: true },
    name: String,
    isAuthorized: { type: Boolean, default: false },
    authorizedAt: { type: Date },
    authorizedBy: { type: Number }
});

module.exports = mongoose.model('Group', groupSchema);
