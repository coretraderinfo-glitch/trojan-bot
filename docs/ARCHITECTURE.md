# docs/ARCHITECTURE.md
**Version:** 1.1
**Project Code:** Aero Smart (Enterprise-Grade Modular Resilience)

## 1. System Philosophy (The "Ironclad" Rule)
Aero Smart is architected on the principle of **Modular Isolation**. Every feature (Command, Event, Logic) is decoupled from the main process thread. This ensures that a failure in one module (e.g., AI Greeting) cannot compromise the core mission (Security & Moderation).

---

## 2. Directory Structure Blueprint (Additive Hierarchy)

```text
/
├── bot.js                  # Operational Proxy (Bootloader)
├── package.json            # Manifest & Dependency Engine
├── Procfile                # Cloud Deployment instruction (Railway/Heroku)
├── .env                    # Secure Environment Vault (Non-committed)
├── scripts/                # Local Utility Scripts
│   └── ghost_sweeper.js    # MTProto Userbot for member-list scrubbing
├── src/                    # The Modular Core
│   ├── bot.js              # Instance Controller & Pipeline Assembly
│   ├── config/             # System Configuration Baseline
│   │   └── index.js        # Environment mapping & "Risk 0" Extension Roster
│   ├── commands/           # Interactive Command Definitions
│   │   └── index.js        # Registry for Ping, ID, Help, Admin & Owner tools
│   ├── database/           # Persistence Lifecycle
│   │   ├── connection.js   # Robust MongoDB Retry & Reconnect logic
│   │   └── models/         # Mongoose Schema Definitions
│   │       ├── Group.js    # Tenant Authorization states
│   │       ├── License.js  # Access Token management
│   │       ├── Roster.js   # Phase 3: Staff code management
│   │       ├── Sale.js     # Phase 3: Transaction telemetry
│   │       ├── SecurityLog.js # Phase 2.2: Defensive audit trail
│   │       ├── Setting.js  # Dynamic Global KV Store
│   │       └── User.js     # Activity Telemetry
│   ├── middleware/         # The Security Firewall (Interceptor Pipeline)
│   │   ├── activity.js     # User Telemetry capturing
│   │   ├── auth.js         # Zero-Trust Access Control (Cache-First)
│   │   └── shield.js       # The "Link Shield" (Anti-Phishing Layer)
│   ├── handlers/           # Event-Driven Logic
│   │   └── index.js        # The "Malware Shield" (DEI Engine) & Roster logic
│   └── utils/              # Utility Helpers
│       └── helpers.js      # Admin verification & ID masking logic
└── docs/                   # Engineering Knowledge Base
    ├── API_SPEC.md         # 100% Granular Feature Blueprint
    ├── ARCHITECTURE.md    # System Design & Structural Rationale
    ├── EXECUTION_PLAN.md  # Active Phase Roadmap
    └── SECURITY_BASELINE.md # Threat Modeling & Zero-Trust specs
```

---

## 3. Engineering Root Cause Principles

### 3.1 Security-First Interception
- **Problem**: Bots often rely on simple search patterns.
- **Root Cause Engineered Solution**: The **Deep Extension Inspection (DEI)** engine in `handlers/index.js`. It performs recursive segment analysis on every file dot-separator to find hidden `.exe` or `.zip` payloads, regardless of where they are in the filename.

### 3.2 Resilience & Synchronization
- **Problem**: In-memory caches drift during cloud-auto-restarts.
- **Root Cause Engineered Solution**: A 5-minute **Cache TTL Heartbeat** in `src/bot.js` calls `preloadCache()` periodically, ensuring that license activations on any instance are synchronized across the cluster in <300 seconds.

### 3.3 Database Stability
- **Problem**: Connection drops can "hang" the entire bot.
- **Root Cause Engineered Solution**: `connection.js` uses strict `bufferCommands: false`. If MongoDB is down, the bot will fail gracefully for DB commands while keeping diagnostic paths (like `/ping`) open, preventing a complete system lockup.

---

## 4. Operational Readiness Baseline (Level 0)
1. **Malware Shield**: Active. 30+ extensions blocked via DEI logic.
2. **Link Shield**: Active. Level 1 strict blocking for non-admin URLs.
3. **Uptime Heartbeat**: Active. Express.js `/health` endpoint live on Port 3000.
4. **License Engine**: Active. Group authorization required prior to bot interaction.

## 5. Software & Hardware Recommendations
- **Platform**: Best-in-class running on **Railway (Pro Plan)** for persistent CPU allocation.
- **Database**: **MongoDB Atlas (M10+)** for consistent latency below 50ms.
- **Runtime**: Node.js **20.x LTS or higher** (The system is verified on Node 22+).
- **Hardening**: Periodically execute `npm audit` to verify the 0V (Zero Vulnerability) state.