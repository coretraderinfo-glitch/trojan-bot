# docs/API_SPEC.md

## 1. System Architecture Overview
Aero Smart is engineered as a **Modular Singleton Architecture**, ensuring that each security component (Link Shield, Malware Shield, Access Control) operates as a high-performance interceptor within the Telegraf middleware pipeline.

### 1.1 Core Engine Architecture
- **Environment Gateway**: Uses `dotenv` for zero-leak configuration.
- **Service Layer**: 
    - **Telegraf 4.16+**: Principal MTProto interface.
    - **Express.js**: Lifecycle heartbeat and health-check responder.
    - **Mongoose ODM**: Transactional integrity for MongoDB persistence.
- **Middleware Chain**: `auth` -> `activity` -> `linkShield` -> `Handlers`.

---

## 2. Global Database Blueprint (MongoDB)

### 2.1 Schema: `User`
*Tracks identity and activity telemetry for spam prevention and retention audit.*
- `userId`: **Number (Unique)**. Primary Telegram identifier.
- `username`: **String**. Captured @handle for mention-tagging.
- `last_seen`: **Number**. Unix timestamp of the most recent message received.

### 2.2 Schema: `Group`
*Manages authorization states for the multi-tenant group environment.*
- `chatId`: **Number (Unique)**. Target group identifier.
- `name`: **String**. The display name of the group.
- `isAuthorized`: **Boolean**. Master switch for bot functionality.
- `authorizedAt`: **Date**. 
- `authorizedBy`: **Number**.

### 2.3 Schema: `License`
*Secures the monetization and access control gate.*
- `key`: **String (UUID)**. Unique activation token.
- `isRedeemed`: **Boolean**.
- `redeemedBy`: **Number**.
- `redeemedInChat`: **Number**.

### 2.4 Schema: `Setting`
*Global KV store for dynamic configuration.*
- `key`: **String**. e.g., `ADMIN_USERNAME`.
- `value`: **String**. Current configuration value.

---

## 3. Security Middleware Specifications

### 3.1 `authMiddleware`
- **Objective**: Zero-Trust access control.
- **Workflow**: 
    1. Check `ctx.chat.type`; if `private`, bypass authorization.
    2. Interrogate `authorizedCache` (in-memory Set).
    3. If cache miss, query `Group` collection.
    4. If unauthorized and not a whitelist command (`/activate`, `/id`, `/unlock`), terminate request.

### 3.2 `Link Shield` (Level 1: Nuclear)
- **Objective**: Prevent 100% of malicious URL distribution.
- **Regex Pattern**: `/(https?:\/\/[^\s]+)|(www\.[^\s]+)|(\b\w+\.(com|net|org|xyz|info|biz|io|me)\b)/gi`
- **Exceptions**: `isGroupAdmin(ctx)` returns true.

### 3.3 `Malware Shield` (Nuclear Roster)
- **Objective**: Neutralize file-based attack vectors.
- **Logic**: **Deep Extension Inspection (DEI)**. Splits filename by dots and checks every segment against the Banned List.
- **Banned Extensions**: 
    - `.exe, .msi, .dll, .pif, .scr, .com, .wsf, .cpl` (Executables)
    - `.js, .vbs, .ps1, .sh, .bat, .jar` (Scripts)
    - `.zip, .rar, .7z, .iso, .tar, .bin` (Archives)
    - `.docm, .xlsm, .pptm` (Macros)
- **MIME Masquerade Check**: Deletes `.jpg/.pdf` files that possess `application/x-msdownload` binary signatures.

---

## 4. Full Command Matrix

| Command | Purpose | Access | Interaction Logic |
| :--- | :--- | :--- | :--- |
| `/ping` | Health Audit | Public | Checks Node.js uptime and Mongo connection state. |
| `/id` | Debug Identity | Public | Returns Chat and User numeric IDs. |
| `/activate` | Key Redemption | Admin | Moves Group from 'Locked' to 'Authorized' via License Key. |
| `/setadmin` | Alert Routing | Admin | Updates persistent `ADMIN_USERNAME` for join alerts. |
| `/kick_inactive` | Member Purge | Admin | Analyzes `User.last_seen` and bulk-removes inactive accounts. |
| `/debug` | System Audit | Admin | Reports Auth state, Cache state, and Bot Admin rights. |
| `/check` | User Verification | Admin | **(Restoring)** Inspects profile of the replied-to user. |
| `/clean_ghosts` | Support Info | Admin | **(Restored)** Guidance on Userbot scrubbing for deleted accounts. |
| `/generate_key` | Key Minting | Owner | Secure UUID generation via `License` model. |
| `/unlock` | Master Override | Owner | Direct database authorization bypass. |

---

## 5. [Phase 9] Sales Tracking Projection
- **Input Pattern**: `Code+Amount` (e.g., `S12+1000`).
- **Engine**: Additive transaction logic with daily persistence.
- **Reporting**: Full roster broadcast on every successful entry.
