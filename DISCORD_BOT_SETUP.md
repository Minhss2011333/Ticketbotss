# Discord Bot Setup Guide

Your Tradeblox ticket system has been converted into a Discord bot! Follow these steps to get it running.

## Prerequisites

1. A Discord account
2. Permission to create applications in Discord Developer Portal
3. A Discord server where you can test the bot

## Step 1: Create a Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Name it "Tradeblox Ticket Bot" (or your preferred name)
4. Click "Create"

## Step 2: Create a Bot User

1. In your application, go to the "Bot" section in the left sidebar
2. Click "Add Bot"
3. Under "Token", click "Copy" to copy your bot token
4. **Keep this token secret and secure!**

## Step 3: Set Bot Permissions

In the "Bot" section, scroll down to "Privileged Gateway Intents" and enable:
- Message Content Intent (if you plan to read message content)

## Step 4: Configure Bot Token in Replit

1. In your Replit project, go to the "Secrets" tab (lock icon in sidebar)
2. Add a new secret:
   - Key: `DISCORD_BOT_TOKEN`
   - Value: Your bot token from Step 2

## Step 5: Invite Bot to Your Server

1. In Discord Developer Portal, go to "OAuth2" > "URL Generator"
2. Select scopes:
   - `bot`
   - `applications.commands`
3. Select bot permissions:
   - Send Messages
   - Use Slash Commands
   - Embed Links
   - Read Message History
4. Copy the generated URL and open it in your browser
5. Select your Discord server and authorize the bot

## Step 6: Start the Bot

Once you've added the `DISCORD_BOT_TOKEN` secret, restart your Replit project. The bot will automatically start alongside the web server.

## Bot Commands

Your bot supports these slash commands:

### `/setup`
Creates the ticket request embed in the current channel. Use this to set up the ticket system.

### `/tickets`
Shows all tickets in the system.

### `/ticket <number>`
Shows details for a specific ticket (e.g., `/ticket TKT-001`).

### `/claim <number>`
Claim a ticket as a middleman.

### `/close <number>`
Close a ticket.

## How to Use

1. Run `/setup` in a channel where you want users to request middlemen
2. Users click the "Request a Middleman" button
3. They fill out the form with trade details
4. Middlemen can view and claim tickets using the commands
5. Close tickets when trades are complete

## Troubleshooting

- **Bot not responding**: Check that the `DISCORD_BOT_TOKEN` is set correctly in Secrets
- **Commands not showing**: Make sure the bot has `applications.commands` scope
- **Permission errors**: Ensure the bot has proper permissions in your server

## Security Notes

- Never share your bot token publicly
- Use the Secrets tab in Replit to store sensitive information
- The bot only responds to slash commands and button interactions