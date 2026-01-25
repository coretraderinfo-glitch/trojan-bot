const mongoose = require('mongoose');

const licenseSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    createdBy: Number,
    createdAt: { type: Date, default: Date.now },
    isRedeemed: { type: Boolean, default: false },
    redeemedBy: Number,
    redeemedAt: Date,
    redeemedInChat: Number
});

module.exports = mongoose.model('License', licenseSchema);
