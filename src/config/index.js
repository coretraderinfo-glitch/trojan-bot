require('dotenv').config();

const config = {
    BOT_TOKEN: process.env.BOT_TOKEN,
    MONGO_URI: process.env.MONGO_URI,
    OWNER_ID: process.env.OWNER_ID ? parseInt(process.env.OWNER_ID) : null,
    PORT: process.env.PORT || 3000,
    BANNED_EXTENSIONS: [
        // Executables
        '.exe', '.msi', '.dll', '.scr', '.com', '.pif', '.cpl', '.wsf',
        // Scripts
        '.js', '.jse', '.vbs', '.vbe', '.ps1', '.hta', '.sh', '.bat', '.cmd', '.jar',
        // Archives (Paylod smuggling)
        '.zip', '.rar', '.7z', '.tar', '.gz', '.iso', '.img', '.bin',
        // Macro Documents
        '.docm', '.xlsm', '.pptm',
        // System / Other
        '.lnk', '.reg', '.inf', '.sct'
    ]
};

if (!config.BOT_TOKEN || !config.MONGO_URI) {
    console.error("❌ CRITICAL ERROR: Missing BOT_TOKEN or MONGO_URI in environment.");
}

module.exports = config;
