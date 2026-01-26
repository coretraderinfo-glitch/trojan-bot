# API SPECIFICATION - Aero Smart Bot
**Version:** 2.0 (Post-Revert)
**Last Updated:** 2026-01-27T00:50:26+08:00

---

## 1. SYSTEM ARCHITECTURE

### 1.1 Technology Stack
- **Runtime**: Node.js 20.x LTS
- **Framework**: Telegraf 4.16.3 (Telegram Bot API)
- **Database**: MongoDB (Mongoose ODM 9.1.5)
- **Web Server**: Express 5.2.1 (Heartbeat/Health checks)
- **Environment**: dotenv 17.2.3

### 1.2 Core Components
1. **Bot Engine** (`src/bot.js`) - Main orchestrator
2. **Middleware Pipeline** - auth → activity → linkShield
3. **Command Registry** (`src/commands/index.js`) - 9 commands
4. **Event Handlers** (`src/handlers/index.js`) - Security shields
5. **Database Layer** - 5 MongoDB collections

---

## 2. DATABASE SCHEMA

### 2.1 Group Collection
```javascript
{
  chatId: Number (unique),
  name: String,
  isAuthorized: Boolean,
  authorizedAt: Date,
  authorizedBy: Number
}
```

### 2.2 License Collection
```javascript
{
  key: String (UUID),
  createdBy: Number,
  createdAt: Date,
  isRedeemed: Boolean,
  redeemedBy: Number,
  redeemedAt: Date,
  redeemedInChat: Number
}
```

### 2.3 SecurityLog Collection
```javascript
{
  timestamp: Date,
  type: String (enum: ['MALWARE', 'LINK', 'UNAUTHORIZED']),
  userId: Number,
  username: String,
  chatId: Number,
  chatTitle: String,
  details: {
    fileName: String,
    mimeType: String,
    link: String,
    command: String
  }
}
```

### 2.4 Setting Collection
```javascript
{
  key: String,
  value: String
}
```

### 2.5 User Collection
```javascript
{
  userId: Number (unique),
  username: String,
  last_seen: Number (timestamp)
}
```

---

## 3. COMMAND REFERENCE

### 3.1 Public Commands

#### `/ping`
- **Access**: Everyone
- **Purpose**: Health check
- **Response**: Bot status + DB connection state
- **Example**: 
  ```
  🏓 Pong! Ironclad Foundation alive.
  (DB Status: 1)
  ```

#### `/id`
- **Access**: Everyone
- **Purpose**: Get User ID and Chat ID
- **Response**: Formatted IDs
- **Example**:
  ```
  🆔 User: `123456789`
  📍 Chat: `-1001234567890`
  ```

### 3.2 Admin Commands

#### `/debug`
- **Access**: Group Admins only
- **Purpose**: System diagnostics
- **Response**: Auth status, cache status, bot permissions, owner config
- **Example**:
  ```
  🔍 Audit Report
  
  📂 DB Auth: ✅
  🚀 Cache: ✅
  🤖 Bot Admin: ✅
  👑 Owner: ✅
  ```

#### `/activate <KEY>`
- **Access**: Group Admins only
- **Purpose**: Redeem license key to authorize group
- **Parameters**: UUID license key
- **Database Operations**:
  1. Validates key in License collection
  2. Marks key as redeemed
  3. Creates/updates Group document
  4. Adds to authorizedCache
- **Example**: `/activate abc-123-def-456`

#### `/setadmin <@user>`
- **Access**: Group Admins only
- **Purpose**: Configure who gets tagged for new member alerts
- **Parameters**: @username (optional, defaults to command sender)
- **Database**: Updates Setting collection (key: 'ADMIN_USERNAME')
- **Example**: `/setadmin @Robin`

#### `/kick_inactive <days>`
- **Access**: Group Admins only
- **Purpose**: Remove users inactive for X days
- **Parameters**: Number of days
- **Logic**:
  1. Queries User collection for last_seen < cutoff
  2. Executes banChatMember + unbanChatMember (Telegram kick pattern)
- **Example**: `/kick_inactive 30`

#### `/check`
- **Access**: Group Admins only
- **Purpose**: Audit a specific user
- **Usage**: Reply to target message, then send `/check`
- **API Call**: `ctx.telegram.getChatMember(chatId, userId)`
- **Response**: User ID, status, bot flag

#### `/clean_ghosts`
- **Access**: Group Admins only
- **Purpose**: Provide guidance on removing deleted accounts
- **Response**: Instructions to run `scripts/ghost_sweeper.js`

#### `/help`
- **Access**: Everyone (dynamic based on privilege)
- **Purpose**: Show available commands
- **Logic**: Displays different menus for public/admin/owner

### 3.3 Owner Commands

#### `/generate_key`
- **Access**: Bot Owner only (OWNER_ID check)
- **Purpose**: Create new license key
- **Logic**: Generates UUID, creates License document
- **Response**: New key in code block

#### `/unlock`
- **Access**: Bot Owner only
- **Purpose**: Bypass license requirement
- **Logic**: Directly authorizes current group
- **Database**: Creates Group document with isAuthorized: true

---

## 4. SECURITY FEATURES

### 4.1 Malware Shield
**Location**: `src/handlers/index.js`
**Trigger**: `bot.on('document')`

**Detection Logic**:
1. **Deep Extension Inspection (DEI)**:
   - Splits filename by `.`
   - Checks each segment against BANNED_EXTENSIONS
   - Catches: `virus.exe.zip`, `malware.pdf.exe`

2. **MIME Masquerade Detection**:
   - Cross-verifies extension with MIME type
   - Blocks: `.jpg` files with executable signatures

**Banned Extensions** (30 total):
```javascript
['.exe', '.msi', '.dll', '.scr', '.com', '.pif', '.cpl', '.wsf',
 '.js', '.jse', '.vbs', '.vbe', '.ps1', '.hta', '.sh', '.bat', '.cmd', '.jar',
 '.zip', '.rar', '.7z', '.tar', '.gz', '.iso', '.img', '.bin',
 '.docm', '.xlsm', '.pptm',
 '.lnk', '.reg', '.inf', '.sct']
```

**Actions**:
1. Creates SecurityLog entry (type: 'MALWARE')
2. Deletes message
3. Posts public alert with filename

**Admin Exception**: Admins can upload any file type

### 4.2 Link Shield
**Location**: `src/middleware/shield.js`
**Trigger**: Every text message

**Detection Pattern**:
```javascript
/(https?:\/\/[^\s]+)|(www\.[^\s]+)|(\b\w+\.(com|net|org|xyz|info|biz|io|me)\b)/gi
```

**Actions**:
1. Creates SecurityLog entry (type: 'LINK')
2. Deletes message

**Admin Exception**: Admins can post links

### 4.3 Access Control
**Location**: `src/middleware/auth.js`

**Logic**:
1. Private chats: Always allowed
2. Groups: Check authorizedCache (in-memory Set)
3. Cache miss: Query Group collection (2-second timeout)
4. Whitelist commands: `/activate`, `/id`, `/unlock`, `/debug`, `/ping`

**Cache Refresh**: Every 5 minutes via `setInterval`

---

## 5. EVENT HANDLERS

### 5.1 New Member Alert
**Trigger**: `bot.on('new_chat_members')`
**Logic**:
1. Queries Setting collection for 'ADMIN_USERNAME'
2. Posts alert tagging configured admin
3. Skips bots

**Example**:
```
🚨 Alert: John Doe joined. @Robin, please verify.
```

### 5.2 Bot Promotion Handler
**Trigger**: `bot.on('my_chat_member')`
**Condition**: Bot promoted to administrator
**Response**:
```
🤖 Ironclad Foundation Online
I am now an Admin. Use /activate to start.
```

---

## 6. MIDDLEWARE PIPELINE

### 6.1 Execution Order
```
Incoming Message
    ↓
authMiddleware (access control)
    ↓
activityTracker (telemetry)
    ↓
linkShield (anti-phishing)
    ↓
Command/Handler
```

### 6.2 Activity Tracker
**Location**: `src/middleware/activity.js`
**Purpose**: Record user activity for `/kick_inactive`
**Database**: Upserts User collection with userId, username, last_seen

---

## 7. CONFIGURATION

### 7.1 Environment Variables
```
BOT_TOKEN=<Telegram Bot Token>
MONGO_URI=<MongoDB Connection String>
OWNER_ID=<Your Telegram User ID>
PORT=3000 (optional)
```

### 7.2 Banned Extensions
**Location**: `src/config/index.js`
**Total**: 30 extensions
**Categories**: Executables, Scripts, Archives, Macros, System files

---

## 8. HEALTH & MONITORING

### 8.1 Express Endpoints
- `GET /` - Returns "Ironclad Bot Alive 🤖"
- `GET /health` - Returns "OK" (200 status)

### 8.2 Port
- Default: 3000
- Configurable via PORT environment variable

---

## 9. ERROR HANDLING

### 9.1 Global Catch
```javascript
bot.catch((err, ctx) => {
  console.error(`❌ Global Registry Error (${ctx.updateType}):`, err.message);
});
```

### 9.2 Database Connection
- Retry logic: 10 attempts, 5-second delay
- Fail-fast: `bufferCommands: false`
- Timeout: 10 seconds

---

## 10. DEPLOYMENT

### 10.1 Production Checklist
- ✅ Environment variables configured
- ✅ MongoDB Atlas IP whitelist updated
- ✅ Railway/Heroku deployment
- ✅ Health endpoint accessible
- ✅ Bot set as group administrator

### 10.2 Dependencies
```json
{
  "dotenv": "^17.2.3",
  "express": "^5.2.1",
  "input": "^1.0.1",
  "mongoose": "^9.1.5",
  "telegraf": "^4.16.3",
  "telegram": "^2.26.22",
  "uuid": "^13.0.0"
}
```

**Security**: 0 vulnerabilities (verified via `npm audit`)
