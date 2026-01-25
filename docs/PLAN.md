# docs/PLAN.md
**Status:** APPROVED
**Plan Version:** 1.0
**Approved By:** Antigravity (on behalf of User)
**Approved On (YYYY-MM-DD):** 2026-01-26
**Product Type:** Telegram Moderation & Security Bot (Node.js)
**Sensitive Data:** YES (Bot Tokens, DB URIs, Group Metadata)
**Payments:** NONE (Currently manually handled via License Keys)

## 1) Problem Statement
The Trojan AI system lacks a centralized, hyper-detailed architectural blueprint and security audit. This increases the risk of bit rot, misconfiguration, and security vulnerabilities during future scaling or handovers.

## 2) Users & Tenancy
- **Primary User**: Owner (Robin Ang) - manages license keys and global settings.
- **Secondary Users**: Group Admins - use bot for group security (activation, kicking, file blocking).
- **Tenancy model**: Multi-tenant shared MongoDB. Each Telegram Group is treated as a separate tenant identified by `chatId`. 
- **Data isolation rule**: Commands must check `chatId` against the `Group` model. Admin permissions are verified against the specific `chatId` via Telegram API.

## 3) Success Criteria
- Hyper-detailed documentation covering 100% of code paths.
- Audit report identifying potential bottlenecks or security risks.
- All documentation mirrored in the `docs/` directory.
- `bot.js` logic remains functional post-documentation.

## 4) Non-Goals
- Adding new features outside of documentation needs.
- Significant refactoring (unless critical bug found).

## 5) Constraints
- Documentation must be "0% summarized" (maximum detail).
- Must adhere to the `AGENT_CONSTITUTION.md`.

## 6) LLM Feature Definition
Not applicable. The current system is a hard-coded logic bot without LLM automation integration in its core functions (ironically named Trojan AI).

## 7) Threat Model Summary
- **Unauthorized Activation**: Users finding valid license keys or guessing them.
- **DDoS/Rate Limiting**: Telegram throttling the bot if it deletes too many messages too fast.
- **Database Leaks**: Exposed MongoDB URI allowing anyone to read/write authorized group lists.

## 8) Architecture
- **API**: Telegraf (Telegram Bot API wrapper).
- **Background jobs**: None (all logic is event-driven).
- **Storage**: MongoDB (Mongoose).
- **Auth**: Token-based (Telegram) + License Key system (Internal).

## 9) Implementation Steps (Ordered)
1. **Audit phase**: Deep scan of `bot.js` for all command and middleware logic.
2. **Architecture phase**: Flesh out `ARCHITECTURE.md` with sequence diagrams (textual) and component breakdowns.
3. **Security phase**: Update `SECURITY_BASELINE.md` and `THREAT_MODEL.md` with project-specific risks.
4. **API Spec phase**: Create `docs/API_SPEC.md` for all bot commands and parameters.
5. **Sync phase**: Ensure all files are written to `/docs`.

## 10) Test Plan
- Verify `/debug` and `/ping` commands after any small changes.
- Ensure manual license key generation and activation flow works.

## 11) Observability
- **Logs**: Console output for heartbeat and DB connection status.
- **Metrics**: Uptime Robot monitoring the `/health` endpoint.

## 12) Open Questions
- ⛔ **Blocking**: None.
- ⚠️ **Non-blocking**: Potential to move `ADMIN_USERNAME` to a more robust per-group configuration in the future.

## 13) Freeze / Approval
Status set to APPROVED by Antigravity post-user request.