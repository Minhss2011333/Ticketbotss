# Tradeblox Ticket System

## Overview

This is a Discord-style ticket management system for the Tradeblox platform, designed to facilitate secure trading through middleman services. The application provides a Discord-like interface where users can request middlemen for trades and track ticket statuses.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with custom Discord-themed design variables
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for client-side routing
- **Form Handling**: React Hook Form with Zod validation

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

### Frontend Components
- **DiscordInterface**: Main application shell mimicking Discord layout
- **Sidebar**: Channel navigation and ticket listing
- **TicketEmbed**: Interactive ticket creation interface
- **TicketModal**: Form for creating new middleman requests
- **TicketDetails**: Ticket management and status updates

### Backend Services
- **Storage Interface**: Abstracted storage layer for future database integration
- **Ticket Operations**: CRUD operations for ticket management
- **API Routes**: RESTful endpoints for frontend communication

## Data Flow

1. **Ticket Creation**: User fills form → Validation → Storage → UI update
2. **Ticket Claiming**: Middleman claims ticket → Status update → Notification
3. **Ticket Closure**: Final status update → Archive → UI refresh
4. **Real-time Updates**: TanStack Query handles cache invalidation and refetching

## External Dependencies

### UI/Styling
- Radix UI primitives for accessible components
- Tailwind CSS for styling with custom color variables
- Lucide React for consistent iconography

### Data Management
- TanStack Query for server state management
- React Hook Form for form handling
- Zod for runtime type validation
- Drizzle ORM for database operations

### Development Tools
- Vite for fast development and building
- ESBuild for server-side bundling
- TypeScript for type safety
- Replit-specific development enhancements

## Deployment Strategy

### Development Environment
- **Command**: `npm run dev` starts both client and server
- **Port**: Application runs on port 5000
- **Hot Reload**: Vite provides instant client updates
- **Database**: Uses in-memory storage for development

### Production Build
- **Build Process**: Vite builds client, ESBuild bundles server
- **Static Assets**: Client built to `dist/public`
- **Server Bundle**: Node.js compatible ES modules
- **Environment**: Requires `DATABASE_URL` for PostgreSQL connection

### Replit Configuration
- **Modules**: Node.js 20, Web, PostgreSQL 16
- **Deployment**: Autoscale deployment target
- **Workflows**: Parallel execution with port waiting

## Changelog
- June 26, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.