# docs/THREAT_MODEL.md
**Security Threat Assessment**

## 1. Threat: Unauthorized Permission Escalation
- **Description**: A non-admin user attempts to run `/kick_inactive` or `/debug`.
- **Primary Control**: `isGroupAdmin` helper function.
- **Verification**: This function fetches the sender's status (`administrator` or `creator`) directly from the Telegram API for every command check. 
- **Risk Level**: Low.

## 2. Threat: License Key Hijacking / Guessing
- **Description**: An attacker guesses a license key or finds one leaked in logs.
- **Primary Control**: `uuidv4` generation.
- **Mitigation**: License keys are 128-bit random strings, making them computationally impossible to guess. Logs only ever show keys during the initial `/generate_key` (requested by Owner).
- **Risk Level**: Very Low.

## 3. Threat: Bot Token Leakage
- **Description**: The `BOT_TOKEN` is accidentally committed to Git or leaked in a screenshot.
- **Primary Control**: `.gitignore` includes `.env`.
- **Mitigation**: Rotate the token immediately via @BotFather if leakage is suspected.
- **Risk Level**: High (Impact) / Low (Likelihood).

## 4. Threat: Database Connection Denial
- **Description**: An attacker floods the bot with messages to exhaust database connections.
- **Primary Control**: `authorizedCache` (In-memory Set).
- **Mitigation**: 99.9% of messages are checked against the in-memory cache. The database is only queried once every 5 minutes (implicitly via cache misses) or on startup. The `maxTimeMS` option prevents any single query from hanging the process.
- **Risk Level**: Medium.

## 5. Threat: Malicious File Upload
- **Description**: A user uploads a Trojan disguised as a utility.
- **Primary Control**: `File Moderation Logic`.
- **Mitigation**: Immediate deletion of banned extensions followed by a public warning.
- **Risk Level**: Low (as long as bot remains Admin).

## 6. Threat: Admin Account Ghosting
- **Description**: An admin account is deleted or leaves the group, but the bot still considers them an admin due to caching.
- **Primary Control**: Real-time `getChatMember` calls in `isGroupAdmin`.
- **Mitigation**: Caching is only used for *group authorization*, not *user permissions*. All user permission checks are real-time.
- **Risk Level**: Low.