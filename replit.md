# Tradeblox Discord Bot

## Overview

This is a Discord bot for the Tradeblox platform, designed to facilitate secure trading through middleman services. The bot provides interactive slash commands and embeds where users can request middlemen for trades and track ticket statuses directly within Discord servers.

## System Architecture

### Discord Bot Architecture
- **Bot Framework**: Discord.js v14 with TypeScript
- **Interaction Handling**: Slash commands, buttons, and modals
- **Command System**: Application commands with proper permission handling
- **Embed System**: Rich embeds for ticket display and status updates
- **Event System**: Real-time Discord event handling

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API endpoints for ticket operations
- **Storage**: In-memory storage implementation with interface for future database integration
- **Development**: Hot module replacement with Vite integration

### Data Storage Solutions
- **Current**: In-memory storage using Map collections for development
- **Database Schema**: Drizzle ORM configured for PostgreSQL with defined schemas
- **Migration Strategy**: Drizzle-kit for schema migrations
- **Future**: Ready for PostgreSQL database integration via environment variables

## Key Components

### Core Entities
1. **Users**: Basic user authentication and management
2. **Tickets**: Trade request tickets with status tracking
3. **Ticket Management**: Create, claim, and close ticket operations

### Discord Bot Components
- **TradebloxBot**: Main bot class handling all Discord interactions
- **Slash Commands**: `/setup`, `/tickets`, `/ticket`, `/claim`, `/close`
- **Interactive Elements**: Buttons for ticket claiming and closing
- **Modal Forms**: Ticket creation form with validation
- **Embed System**: Rich ticket displays with status indicators

### Backend Services
- **Storage Interface**: Abstracted storage layer for future database integration
- **Ticket Operations**: CRUD operations for ticket management
- **API Routes**: RESTful endpoints for frontend communication

## Data Flow

1. **Ticket Creation**: User clicks button → Modal form → Validation → Storage → Discord embed response
2. **Ticket Claiming**: Middleman uses slash command or button → Status update → Discord embed update
3. **Ticket Closure**: User/admin closes ticket → Final status update → Discord notification
4. **Real-time Updates**: Discord interactions provide immediate feedback and updates

## External Dependencies

### Discord Integration
- Discord.js for bot framework and API interactions
- Discord Developer Portal for bot registration and permissions
- Slash commands for user interactions
- Rich embeds for enhanced visual presentation

### Data Management
- Zod for runtime type validation and form schemas
- Drizzle ORM for database operations
- In-memory storage for development testing

### Development Tools
- Vite for fast development and building
- ESBuild for server-side bundling
- TypeScript for type safety
- Replit-specific development enhancements

## Deployment Strategy

### Development Environment
- **Command**: `npm run dev` starts both Express server and Discord bot
- **Port**: Web server runs on port 5000 (for API and fallback web interface)
- **Bot Token**: Requires `DISCORD_BOT_TOKEN` environment variable for Discord bot functionality
- **Database**: Uses in-memory storage for development

### Production Build
- **Build Process**: ESBuild bundles server with Discord bot integration
- **Server Bundle**: Node.js compatible ES modules with Discord.js
- **Environment Variables**: 
  - `DISCORD_BOT_TOKEN` for Discord bot functionality
  - `DATABASE_URL` for PostgreSQL connection (optional, falls back to in-memory storage)

### Replit Configuration
- **Modules**: Node.js 20, Web, PostgreSQL 16
- **Deployment**: Autoscale deployment target
- **Workflows**: Parallel execution with port waiting

## Discord Bot Setup

To use the Discord bot functionality:

1. **Create Discord Application**: Visit Discord Developer Portal and create a new application
2. **Create Bot User**: Add a bot to your application and copy the bot token
3. **Set Environment Variable**: Add `DISCORD_BOT_TOKEN` to your Replit Secrets
4. **Invite Bot**: Generate invite URL with `bot` and `applications.commands` scopes
5. **Start Bot**: The bot automatically starts when the server runs

### Available Commands
- `/setup` - Creates ticket request embed (admin use)
- `/tickets` - Lists all tickets in the system
- `/ticket <number>` - Shows specific ticket details
- `/claim <number>` - Claim a ticket as middleman
- `/close <number>` - Close a completed ticket

## Changelog
- June 26, 2025: Converted web application to Discord bot with full slash command integration
- June 26, 2025: Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.