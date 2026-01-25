# docs/ARCHITECTURE.md
**Version:** 1.0
**Project:** Trojan AI (Aero Smart)

## 1. System Overview
Trojan AI is a Node.js-based Telegram moderation bot designed for enterprise-grade group security. It operates as a stateless event-driven service that interacts with the Telegram Bot API and a MongoDB database for persistence.

## 2. Core Components

### 2.1 Telegraf Framework
The application uses the `Telegraf` library as a high-level wrapper around the Telegram Bot API. It handles long-polling (or webhooks potentially) and routes incoming Telegram updates to specific middleware or command handlers.

### 2.2 Express Heartbeat Server
To ensure 24/7 uptime monitoring (e.g., via Railway or Uptime Robot), a minimal `Express` server is initialized.
- **Port**: Configurable via `PORT` environment variable (defaults to 3000).
- **Endpoints**:
    - `/`: Returns "Bot is alive! 🤖".
    - `/health`: Returns "OK" (200 status code).

### 2.3 MongoDB Persistence (Mongoose)
Persistence is managed via MongoDB using the `Mongoose` ODM.
- **Connection Logic**: Implements a "Root Cause Engineered" connection strategy.
    - `bufferCommands: false`: Prevents application hanging if DB is unreachable.
    - `serverSelectionTimeoutMS: 10000`: Fast failure detection.
    - `retryCount`: 10 attempts with a 5-second delay.
- **Models**:
    - `User`: Tracks individual user activity (`userId`, `username`, `last_seen`).
    - `Group`: Stores authorized Telegram group metadata and authorization status.
    - `License`: Handles the unique key system for unlocking group features.
    - `Setting`: Stores system-wide persistent configurations (e.g., `ADMIN_USERNAME`).

## 3. Request Pipeline (Middleware Flow)

Every message sent to the bot passes through a sequence of middlewares:

1.  **Emergency Ping**: Intercepts `/ping` commands immediately to verify process health without requiring a DB connection.
2.  **Access Control**: 
    - Checks if the chat is private (always allowed).
    - If a group, checks the `authorizedCache` (in-memory `Set`).
    - If cache miss, queries MongoDB `Group` model with a 2-second timeout (`maxTimeMS`).
    - Commands like `/activate`, `/id`, `/unlock`, `/debug`, and `/ping` are allowed through even if the group is not yet authorized.
3.  **Activity Tracker**: Upserts user data (`userId`, `last_seen`) into the `User` collection.
4.  **Link Shield**: 
    - Scans text for patterns matching `http`, `www`, or common TLDs (`.com`, `.net`, etc.).
    - Verified against `isGroupAdmin`.
    - Automatically deletes unauthorized links.
5.  **File Moderation**: 
    - Monitors `document` events.
    - Blocks banned extensions: `.exe`, `.apk`, `.scr`, `.bat`, `.cmd`, `.sh`, `.com`, `.msi`, `.jar`.
    - Deletes malicious uploads and notifies the group.

## 4. Logical Workflows

### 4.1 Group Activation
1. User runs `/generate_key` (Owner only).
2. Owner gives key to a Group Admin.
3. Admin runs `/activate <KEY>` in the target group.
4. Bot verifies key exists and is not redeemed.
5. Bot updates `License` (redeemed status) and `Group` (isAuthorized status).
6. Bot updates `authorizedCache` to allow subsequent messages.

### 4.2 Inactive User Management (`/kick_inactive`)
1. Admin runs `/kick_inactive <days>`.
2. Bot calculates cutoff timestamp (`Date.now() - days`).
3. Bot queries `User` collection for matching IDs.
4. Bot executes `banChatMember` followed by `unbanChatMember` (the standard "Kick" maneuver in Telegram).

### 4.3 New Member Verification
1. `new_chat_members` event triggers.
2. Bot fetches `ADMIN_USERNAME` from the `Setting` collection.
3. Bot tags the admin in the group for manual verification.

## 5. Deployment Architecture
- **Environment Management**: `.env` file for local development; Platform Variables for Railway/Production.
- **Process Management**: `Procfile` specifies `worker: npm start`.
- **Portability**: Codebase is fully portable to any Node.js environment with outbound port 27017 (for DB) and 443 (for Telegram API) open.