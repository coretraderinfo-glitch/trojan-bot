# docs/SECURITY_BASELINE.md

## 1. Zero-Trust File Security (ZTFS)
The Aero Smart security architecture operates on a **Zero-Trust Hierarchy** for all inbound file transfers. Given that Telegram is a high-volume vector for "Social Engineering" malware, our baseline is designed to eliminate 100% of the common and obfuscated execution pathways.

### 1.1 Deep Extension Inspection (DEI)
- **Engine Logic**: The bot does not merely check the suffix of the filename. It tokenizes the filename by the dot (`.`) separator and performs a recursive scan across all extension segments.
- **Case Sensitivity**: All checks are performed in a lower-cased normalization buffer to prevent bypasses like `.EXE` or `.Zip`.
- **Double-Extension Mitigation**: Detects and nullifies patterns such as `contract.pdf.zip` or `urgent_invoice.jpg.exe`.

### 1.2 The "Nuclear Banned Roster"
Our rejection criteria are categorized by threat potential to ensure an **Unbreakable Perimeter**:
1. **Direct Executables**: `.exe`, `.msi`, `.dll`, `.pif`, `.scr`, `.com`, `.wsf`, `.cpl`.
2. **Interpreter Scripts**: `.js`, `.vbs`, `.ps1`, `.sh`, `.bat`, `.cmd`, `.jar`.
3. **Archive Vectors (Smuggling)**: `.zip`, `.rar`, `.7z`, `.iso`, `.tar`, `.gz`, `.img`, `.bin`.
4. **Macro-Enabled Documents**: `.docm`, `.xlsm`, `.pptm`.
5. **System Modification Links**: `.reg`, `.lnk`, `.inf`, `.sct`.

### 1.3 Automatic Quarantine & Erasure
1. **Immediate Deletion**: Within <100ms of message delivery, the offending message is targeted for deletion.
2. **Contextual Tagging**: The bot publicly tags the offender and logs the specific filename to the server console for Admin audit.
3. **MIME Masking Detection**: Checks if internal MIME types (e.g., `application/x-msdownload`) mismatch the declared extension.

## 2. Link Shield Protocol (Anti-Phishing)
Aero Smart implements a **Level 1 Nuclear Shield** against URL-based phishing.
- **Mechanism**: Every text message passes through a Regex interrogator.
- **Detection Scope**: `http`, `https`, `www`, and TLD-based domain detection (e.g., `site.xyz`).
- **Enforcement**: Any match from a non-admin account triggers immediate `deleteMessage`.
- **Logic Goal**: Forces all external coordination through trusted Admins, preventing unauthorized staff from clicking malicious external links.

## 3. Physical Intelligence & Userbot Scrubbing
For threats that are invisible to the standard Bot API (such as **Deleted Account Ghosts**), we leverage high-privilege Userbot automation.
- **The Script**: `scripts/ghost_sweeper.js`.
- **Operational Mode**: Runs locally on the Admin's machine using `MTProto` via `telegram` library.
- **Direct List Access**: Bypass Bot API limitations to iterate through the group's full member list.
- **Heuristic**: Flags users with the `deleted: true` property.
- **Mitigation**: Systematic banning and unbanning to scrub the group roster clean and lower the "Member Count" overhead.