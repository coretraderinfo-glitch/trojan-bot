const mongoose = require('mongoose');

const securityLogSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    type: { type: String, enum: ['MALWARE', 'LINK', 'UNAUTHORIZED'], required: true },
    userId: { type: Number, required: true },
    username: String,
    chatId: { type: Number, required: true },
    chatTitle: String,
    details: {
        fileName: String,
        mimeType: String,
        link: String,
        command: String
    }
});

module.exports = mongoose.model('SecurityLog', securityLogSchema);
