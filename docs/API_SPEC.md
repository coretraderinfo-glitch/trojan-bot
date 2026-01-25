# docs/API_SPEC.md
**Command Reference & Operational Guide**

This document provides a 100% comprehensive breakdown of every command available in the Trojan AI (Aero Smart) system.

## 1. Global Commands (Public/Admin)

### `/ping`
- **Purpose**: Diagnostic check for process and database health.
- **Logic**: Returns a message containing the current node process status and the MongoDB readyState.
- **Access**: Public.
- **No-DB Mode**: Fully functional even if MongoDB is disconnected.

### `/id`
- **Purpose**: Retrieve numeric IDs for troubleshooting.
- **Logic**: Extracts `from.id` and `chat.id` from the context and returns them in a Markdown block.
- **Access**: Public.

---

## 2. Security Commands (Admin Only)

### `/activate <LICENSE_KEY>`
- **Purpose**: Authenticate and authorize a group for bot services.
- **Logic**:
    1. Validates that the message sender is a Group Admin.
    2. Searches MongoDB `License` collection for the provided key.
    3. Checks `isRedeemed` status.
    4. Updates Group record to `isAuthorized: true`.
    5. Adds `chatId` to the in-memory `authorizedCache`.
- **Response**: "Activation Successful!" or detailed error.

### `/setadmin [@username]`
- **Purpose**: Configure the target for automatic security alerts.
- **Logic**: 
    1. If a username is provided (e.g., `/setadmin @Robin`), it saves that string.
    2. If no username provided, it default-tags the sender.
    3. Saves the value to the `Setting` collection under the key `ADMIN_USERNAME`.
- **Persistence**: Saved to DB; survives bot restarts.

### `/kick_inactive <DAYS>`
- **Purpose**: Bulk cleanup of users who have not participated in the group.
- **Logic**:
    1. Queries the `User` collection for any `userId` with `last_seen < (now - days)`.
    2. Iterates through the list of matches.
    3. Executes `ban` followed by `unban` on each user.
- **Safety**: Captures and logs errors for specific users to prevent script termination.

### `/debug`
- **Purpose**: Full system verification for admins.
- **Logic**: 
    - Reports Database authorization status.
    - Reports Cache status.
    - Reports Bot Admin rights (can delete messages?).
    - Reports Owner configuration status.
- **Usage**: Critical for troubleshooting "Silent bot" issues.

### `/check` (Reply to message)
- **Purpose**: Verify the status of a specific user.
- **Logic**: Calls `getChatMember` for the user being replied to.
- **Identification**: Identifies if the user is a Bot, has left, is kicked, or is active.

---

## 3. Owner Only Commands

### `/generate_key`
- **Purpose**: Mint a new activation license.
- **Restriction**: Strictly checked against `OWNER_ID` in `.env`.
- **Logic**:
    1. Generates a fresh `uuidv4` string.
    2. Creates a new `License` record with `isRedeemed: false`.
- **Output**: The raw key and instructions for activation.

### `/unlock`
- **Purpose**: Immediate authorization without a license key.
- **Logic**: Directly updates the `Group` model and `authorizedCache` for the current chat.
- **Usage**: Emergency access for the bot owner to bypass licensing.

---

## 4. Automatic Moderation

### Link Shield (Passive)
- **Trigger**: Every text message.
- **Rule**: If a URL is detected AND sender is not Admin → Delete.
- **Result**: Self-cleaning chat environment.

### File Moderation (Passive)
- **Trigger**: `document` uploads.
- **Rule**: If `file_name` ends in banned list (`.exe`, `.apk`, etc.) → Delete.
- **Result**: Protection against malware distribution.
