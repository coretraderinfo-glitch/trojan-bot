const mongoose = require('mongoose');
const config = require('../config');

mongoose.set('strictQuery', false);

const connectDB = async (retryCount = 0, onConnected) => {
    console.log(`📡 Database: Attempting connection... (Try ${retryCount + 1})`);

    const options = {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
    };

    try {
        if (!config.MONGO_URI) throw new Error("MONGO_URI not found");
        await mongoose.connect(config.MONGO_URI, options);
        console.log('✅ Ironclad Foundation: Connected to MongoDB');
        if (onConnected) await onConnected();
    } catch (err) {
        console.error(`❌ Database: Connection Failed:`, err.message);
        if (retryCount < 10) {
            console.log('🔄 Database: Retrying in 5 seconds...');
            setTimeout(() => connectDB(retryCount + 1, onConnected), 5000);
        }
    }
};

mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ Database: Disconnected. Bot will operate in limited mode.');
});

module.exports = connectDB;
