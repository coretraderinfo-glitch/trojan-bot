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

- `/kick_inactive <days>` - Kicks users who haven't spoken in X days.
- `/clean_ghosts` - Checks for deleted accounts (limited by API).
- `/check` (Reply to user) - Check specific user status.
- `/setadmin` - Set the admin for alerts.
- **Auto-Moderation**: Automatically deletes banned file types (`.exe`, `.apk`, etc).

## 24/7 Deployment (Cloud)

This bot is ready for deployment on platforms like **Railway**, **Render**, or **Heroku**.

1.  **Push code** to GitHub.
2.  **Connect** your repository to the hosting provider.
3.  **Environment Variables**: Go to the "Settings" or "Variables" section of your dashboard and add `BOT_TOKEN` and `MONGO_URI`.
4.  **Worker**: Ensure the platform runs the `worker` process (defined in `Procfile`) or simply `node bot.js`.
