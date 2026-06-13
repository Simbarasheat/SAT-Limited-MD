# SAT Limited MD - WhatsApp Bot

A powerful WhatsApp bot built with Baileys and Express.js

## Features

✅ Admin Commands (Promote, Kick, Demote, Welcome)
✅ Owner Commands
✅ Group & Direct Message Support
✅ Easy Command System

## Prerequisites

- Node.js 20.x or higher
- npm or yarn
- Render.com Account (for deployment)

## Local Installation

```bash
git clone https://github.com/Simbarasheat/SAT-Limited-MD.git
cd SAT-Limited-MD
npm install
npm start
```

The bot will start on port 3000. Scan the QR code with WhatsApp to connect.

## Deployment on Render

### Step 1: Create a New Web Service on Render
1. Go to [https://render.com](https://render.com)
2. Click "New +" → Select "Web Service"
3. Connect your GitHub repository
4. Select `SAT-Limited-MD` repository

### Step 2: Configure Deployment Settings

**Name:** `sat-limited-md` (or your preferred name)

**Environment:** `Node`

**Build Command:**
```bash
npm install
```

**Start Command:**
```bash
npm start
```

### Step 3: Set Environment Variables

Add these in the Render dashboard (Settings → Environment):

```
NODE_ENV=production
PORT=3000
```

### Step 4: Deploy

Click "Create Web Service" and Render will automatically deploy your bot.

## Important Notes for Render Deployment

⚠️ **Keep Your Account Safe:**

1. **Free Tier Usage Policy:**
   - Render allows ONE free web service
   - No resource limits on free tier (but fair usage applies)
   - Services sleep after 15 minutes of inactivity (need to keep it alive)

2. **To Prevent Suspension:**
   - ✅ Don't use the bot for spam
   - ✅ Keep message rate reasonable
   - ✅ Don't abuse group operations (kick/promote excessively)
   - ✅ Use legitimate WhatsApp numbers only
   - ✅ Follow Render's acceptable use policy
   - ✅ Don't run resource-intensive operations constantly

3. **Keep Bot Alive (Optional):**
   - The bot auto-responds to messages (natural usage)
   - Render's free tier may sleep after inactivity
   - Consider setting up a simple ping endpoint

## Usage Commands

### Admin Commands (Group Only)
```
.promote @user      - Promote a user to admin
.demote @user       - Demote an admin to member
.kick @user         - Remove user from group
.welcome [message]  - Send welcome message
```

### Owner Commands
```
.owner              - Get owner contact info
```

## Configuration

Edit `config.js` to customize:

```javascript
module.exports = {
  botName: "SAT Limited MD",
  ownerName: "SAT Limited",
  prefix: ".",
  ownerNumber: "260760576801"
}
```

## Troubleshooting

**Bot Not Responding:**
- Check if the service is running on Render dashboard
- Verify WhatsApp is connected (check logs)
- Ensure you're using the correct prefix (`.`)

**Session Lost:**
- Re-authenticate by visiting `/pair?number=YOURWHATSAPPNUMBER`
- The bot will request a pairing code

**Commands Not Working:**
- Verify the command format: `.commandname` 
- Admin commands only work in groups
- User must be a group admin to use admin commands

## Security

⚠️ **Important:**
- Never share your WhatsApp number publicly
- Don't expose sensitive credentials
- Keep your owner number private
- Use strong authentication on Render account

## License

Apache License 2.0 - See LICENSE file for details

## Support

For issues or questions, contact the owner:
📱 **+260760576801** (WhatsApp)

**Powered by SAT Limited**
