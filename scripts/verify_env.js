require('dotenv').config();
const mongoose = require('mongoose');

console.log('🔍 Starting Environment Verification...');

// 1. Check for .env file
if (!process.env.BOT_TOKEN) {
    console.error('❌ ERROR: BOT_TOKEN is missing from .env');
} else {
    console.log('✅ BOT_TOKEN found.');
}

if (!process.env.MONGO_URI) {
    console.error('❌ ERROR: MONGO_URI is missing from .env');
} else {
    console.log('✅ MONGO_URI found.');
}

// 2. Validate OWNER_ID
const ownerIdRaw = process.env.OWNER_ID;
if (!ownerIdRaw) {
    console.warn('⚠️ WARNING: OWNER_ID is not set. You will not be able to generate keys or use owner commands.');
} else {
    const ownerId = parseInt(ownerIdRaw);
    if (isNaN(ownerId)) {
        console.error(`❌ ERROR: OWNER_ID must be a number. Found: "${ownerIdRaw}"`);
    } else {
        console.log(`✅ OWNER_ID is valid: ${ownerId}`);
    }
}

// 3. Test MongoDB Connection
if (process.env.MONGO_URI) {
    console.log('⏳ Testing MongoDB Connection...');
    mongoose.connect(process.env.MONGO_URI)
        .then(() => {
            console.log('✅ MongoDB Connection Successful!');
            process.exit(0);
        })
        .catch(err => {
            console.error('❌ MongoDB Connection Failed:', err.message);
            process.exit(1);
        });
} else {
    process.exit(1);
}
