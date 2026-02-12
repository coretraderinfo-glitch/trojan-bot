# Paid Hosting Guide for Trojan Bot 🚀

To ensure your bot is responsive, fast, and stays online 24/7 without "sleeping," we strongly recommend upgrading to a paid hosting plan.

## 🏨 Recommended Hosting: Railway (Preferred)
Railway is excellent because it's easy to set up and very reliable.

### 💰 Pricing Recommendation:
- **Plan**: Hobby/Starter
- **Cost**: ~$5/month (Prepaid or Credits)
- **Why?**:
    - **No Sleeping**: Free plans often "sleep" after 30 minutes of inactivity. When a user sends a command, the bot might take 30 seconds to wake up or ignore the first message.
    - **Speed**: Paid instances get better CPU/RAM allocation.
    - **24/7 Uptime**: Essential for catching malicious links and kicks immediately.

---

## 🛠️ Step-by-Step Upgrade (Railway)
1. **Login** to your [Railway.app](https://railway.app/) dashboard.
2. Click on your **Bot Project**.
3. Go to **Settings** -> **Billing**.
4. Add a payment method and select the **Hobby Plan**.
5. Ensure your `env` variables are correctly transferred.

---

## 🔒 Telegram BotFather Settings (CRITICAL)
For the bot to work perfectly in all groups, you **MUST** configure these settings in Telegram:

1. Open [@BotFather](https://t.me/botfather).
2. Type `/mybots` and select your bot.
3. Go to **Bot Settings** -> **Group Privacy**.
4. Click **Turn OFF**.
    - *Wait, why?* If Privacy Mode is **ON**, the bot is "blind" in groups. It can't see the messages it needs to moderate. Turning it **OFF** allows it to see all messages so it can protect the group.
5. Go back to **Bot Settings** -> **Domain** (If using Webhooks, normally not needed for this setup).

## 🛡️ Admin Rights
Ensure the bot is added as an **ADMIN** in your group with these permissions:
- Delete messages
- Ban users
- Invite users via link (optional)

If the bot is not an admin, it cannot delete malicious files or kick deleted accounts.
