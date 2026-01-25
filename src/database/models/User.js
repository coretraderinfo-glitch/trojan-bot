const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userId: { type: Number, required: true, unique: true },
    username: String,
    last_seen: { type: Number, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
