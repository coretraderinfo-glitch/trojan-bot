const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    userId: { type: Number, required: true }, // The staff member who recorded it
    staffCode: { type: String, required: true }, // e.g., "Heng1"
    amount: { type: Number, required: true },
    chatId: { type: Number, required: true } // The group where it happened
});

module.exports = mongoose.model('Sale', saleSchema);
