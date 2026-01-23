# Telegram Moderation Bot

A Telegram bot to moderate groups, kick inactive users, and detect malicious files.
Now upgraded with MongoDB support for 24/7 cloud deployment.

## Prerequisities

1.  **Node.js** (v14 or higher)
2.  **MongoDB Database** (Cloud Atlas recommended)
3.  **Telegram Bot Token** (from @BotFather)

## Setup

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Configuration**
    Create a file named `.env` in the root directory (if not exists) and add your secrets:
    ```env
    BOT_TOKEN=your_telegram_bot_token_here
    MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
    ```

## Running Locally

```bash
npm start
# or
node bot.js
```

## Commands

### 🛡️ Access Control (Private Mode)
- `/id` - Get your Telegram User ID (Needed for setup).
- `/unlock` - (Owner Only) Instantly unlock the current group without a key.
- `/generate_key` - (Owner Only) Generate a new license key.
- `/activate <key>` - Unlock the bot for the current group.
- `/debug` - View diagnostic info about the bot's permissions.

### 🧹 Moderation
- `/kick_inactive <days>` - Kicks users who haven't spoken in X days (Admin Only).
- `/clean_ghosts` - Checks for deleted accounts (Admin Only).
- `/check` (Reply to user) - Check specific user status (Admin Only).
- `/setadmin` - Set the admin for alerts (Admin Only).
- **Auto-Moderation**: Automatically deletes banned file types (`.exe`, `.apk`, etc).

## ❓ Troubleshooting

### "Access Denied" or Command Ignored
- **Issue**: You send `/activate` or `/unlock` and nothing happens, or the bot says "Access Denied".
- **Fix**:
    1. **For `/activate`**: You MUST be a **Group Admin** to use this.
    2. **For `/unlock`**: You MUST be the **Bot Owner** (defined in `.env` as `OWNER_ID`).
    3. **Check permissions**: Run `/debug` in the group to see if the bot recognizes you as an admin.

### Bot Not responding to files
- **Issue**: You send an `.exe` file and it's not deleted.
- **Fix**:
    1. Ensure the bot is an **Administrator** in the group with "Delete Messages" permission.
    2. Run `/debug` to check if the group is **Authorized** (Database or Cache).
    3. If the group is NOT authorized, use `/activate <key>` or `/unlock`.

## 24/7 Deployment (Cloud)

This bot is ready for deployment on platforms like **Railway**, **Render**, or **Heroku**.

1.  **Push code** to GitHub.
2.  **Connect** your repository to the hosting provider.
3.  **Environment Variables**: Go to the "Settings" or "Variables" section of your dashboard and add:
    - `BOT_TOKEN`: Your Telegram Bot Token.
    - `MONGO_URI`: Your MongoDB Connection String.
    - `OWNER_ID`: Your Telegram User ID (Get it by sending `/id` to the bot).
4.  **Worker**: Ensure the platform runs the `worker` process (defined in `Procfile`) or simply `node bot.js`.
