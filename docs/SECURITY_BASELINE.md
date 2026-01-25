# docs/SECURITY_BASELINE.md
**Project Security Standards**

## 1. Secrets & Credentials
- **BOT_TOKEN**: Must never be hardcoded. Load exclusively via `process.env.BOT_TOKEN`.
- **MONGO_URI**: Contains database credentials. Bypassing SRV for shard-direct strings must still include password encoding safety.
- **OWNER_ID**: Numeric Telegram ID. Strictly enforced for destructive/administrative commands.

## 2. Infrastructure Security
- **IP Whitelisting**: The MongoDB Atlas cluster must be set to `0.0.0.0/0` only if dynamic IP environments (like Railway) are used. 
- **Encryption**: 
    - TLS 1.2+ required for all connections to Telegram and MongoDB.
    - MongoDB `ssl=true` parameter must be present in the connection string.

## 3. Data Integrity & Isolation
- **Tenant Separation**: Telegram group isolation is enforced by using `chat.id` as the primary key for all authorization lookups.
- **Input Validation**: 
    - `/kick_inactive`: Input must be parsed with `parseInt` and checked for `NaN`.
    - `/activate`: Keys are validated against the `License` collection before any state change.
    - `/setadmin`: Usernames are escaped or used within standard string boundaries.

## 4. Operational Security
- **Least Privilege**: The Bot should be granted the minimum necessary permissions in Telegram (Delete Messages, Ban Users).
- **Graceful Shutdown**: `SIGINT` and `SIGTERM` handlers ensure the bot stops and disconnects from MongoDB cleanly, preventing orphaned connections.
- **Global Error Handling**: `bot.catch` prevents the process from crashing on a single malformed update, ensuring overall system availability.

## 5. Audit Policy
- All group-level activations and license redeems are logged in MongoDB with the user ID of the redeemer and the timestamp.
- Debug outputs for `OWNER_ID` are masked using the `getLast4Digits` helper to prevent leaking the full ID in shared diagnostic screenshots.