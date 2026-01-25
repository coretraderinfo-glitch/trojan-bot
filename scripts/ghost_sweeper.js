const { TelegramClient, Api } = require("telegram");
const { StringSession } = require("telegram/sessions");
const input = require("input"); // npm install input

// --- Configuration ---
// Provided by User
const apiId = 31163964;
const apiHash = "9587f525eb22d418b1c3f86f70f645e5";
const stringSession = new StringSession(""); // Save session string if needed

(async () => {
    console.log("👻 Ghost Sweeper: Connecting to Telegram...");

    const client = new TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: 5,
    });

    await client.start({
        phoneNumber: async () => await input.text("📱 Please enter your number (e.g. +601xxxx): "),
        password: async () => await input.text("🔐 Please enter your password (likely empty if 2FA off): "),
        phoneCode: async () => await input.text("📩 Please enter the code you received on Telegram App: "),
        onError: (err) => console.log(err),
    });

    console.log("\n✅ You are now connected as User!\n");

    // 1. Fetch Dialogs to find relevant groups
    const dialogs = await client.getDialogs({ limit: 50 });
    const groups = dialogs.filter(d => d.isGroup || d.isChannel);

    console.log("📂 found groups:");
    groups.forEach((g, i) => {
        console.log(`${i + 1}. ${g.title} (ID: ${g.id})`);
    });

    // 2. Ask User to Select Group
    const indexStr = await input.text("\n👉 Enter the NUMBER of the group you want to clean: ");
    const index = parseInt(indexStr) - 1;

    if (isNaN(index) || !groups[index]) {
        console.log("❌ Invalid selection. Exiting.");
        process.exit(1);
    }
    const selectedGroup = groups[index];
    console.log(`\n🧹 Selected: "${selectedGroup.title}". Scanning for ghosts...`);

    // 3. Scan Participants
    let ghostCount = 0;
    let kickedCount = 0;

    // Use getParticipants (this can be slow for large groups)
    const participants = await client.getParticipants(selectedGroup, {
        limit: 5000 // Limit to avoid hitting severe limits, can be increased
    });

    for (const user of participants) {
        if (user.deleted) {
            ghostCount++;
            process.stdout.write(`\r👻 Found Ghost: ${user.id}... KICKING `);

            try {
                await client.kickParticipant(selectedGroup.id, user.id);
                kickedCount++;
                process.stdout.write("✅\n");
            } catch (e) {
                process.stdout.write(`❌ Error: ${e.message}\n`);
            }

            // Sleep slightly to avoid flood limits
            await new Promise(r => setTimeout(r, 500));
        }
    }

    if (ghostCount === 0) {
        console.log("\n✨ This group is sparkly clean! No deleted accounts found.");
    } else {
        console.log(`\n🏁 Done! Found ${ghostCount} ghosts. Kicked ${kickedCount}.`);
    }

    process.exit(0);
})();
