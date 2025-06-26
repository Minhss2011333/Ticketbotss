# Deploying Tradeblox Discord Bot to Render

## Prerequisites
1. A GitHub account with your bot code
2. A Render account (free tier available)
3. Your Discord bot token

## Step 1: Prepare Your Repository

1. **Push your code to GitHub:**
   - Create a new repository on GitHub
   - Push all your current code to the repository
   - Make sure all files are committed, including:
     - `server/` folder with bot code
     - `package.json` with dependencies
     - `render.yaml` configuration file

## Step 2: Create Render Service

1. **Go to Render Dashboard:**
   - Visit https://render.com
   - Sign up or log in with your GitHub account

2. **Create New Web Service:**
   - Click "New +" button
   - Select "Web Service"
   - Connect your GitHub repository
   - Select the repository containing your bot code

3. **Configure Service Settings:**
   - **Name:** `tradeblox-discord-bot` (or your preferred name)
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** Free (sufficient for Discord bots)

## Step 3: Set Environment Variables

1. **In Render Dashboard:**
   - Go to your service settings
   - Navigate to "Environment" tab
   - Add environment variables:

   ```
   NODE_ENV = production
   DISCORD_BOT_TOKEN = your_bot_token_here
   ```

2. **Get your Discord Bot Token:**
   - Go to Discord Developer Portal (https://discord.com/developers/applications)
   - Select your bot application
   - Go to "Bot" section
   - Copy the token and paste it in Render

## Step 4: Deploy

1. **Automatic Deployment:**
   - Render will automatically start building and deploying
   - Monitor the deploy logs for any errors
   - First deployment may take 5-10 minutes

2. **Verify Deployment:**
   - Check the logs to see "Bot ready! Logged in as [Bot Name]"
   - Test the bot in your Discord server using `/setup`

## Step 5: Important Notes

- **Keep your bot token secure** - never commit it to GitHub
- The free tier has some limitations but is sufficient for Discord bots
- Your bot will sleep after 15 minutes of inactivity on free tier
- Consider upgrading to paid plan for 24/7 uptime

## Troubleshooting

**Bot not responding:**
- Check environment variables are set correctly
- Verify bot token is valid
- Check deploy logs for errors

**Build failures:**
- Ensure all dependencies are in package.json
- Check that build command completes successfully
- Review Render build logs

**Bot goes offline:**
- Free tier services sleep after inactivity
- Upgrade to paid plan for continuous uptime
- Or use a service like UptimeRobot to ping your service

## Bot Commands After Deployment

Once deployed, your bot will have these commands:
- `/setup` - Creates the middleman request embed with dropdown
- `/tickets` - View all tickets
- `/ticket <number>` - View specific ticket
- `/claim <number>` - Claim a ticket as middleman
- `/close <number>` - Close a ticket

Your Discord bot is now live and ready to handle middleman requests with the dropdown value selection!