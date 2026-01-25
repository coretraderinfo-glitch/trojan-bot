require('dotenv').config();

const config = {
    BOT_TOKEN: process.env.BOT_TOKEN,
    MONGO_URI: process.env.MONGO_URI,
    OWNER_ID: process.env.OWNER_ID ? parseInt(process.env.OWNER_ID) : null,
    PORT: process.env.PORT || 3000,
    BANNED_EXTENSIONS: [
        '.exe', '.apk', '.scr', '.bat', '.cmd', '.sh', '.com', '.msi', '.jar'
    ]
};

if (!config.BOT_TOKEN || !config.MONGO_URI) {
    console.error("❌ CRITICAL ERROR: Missing BOT_TOKEN or MONGO_URI in environment.");
}

module.exports = config;
