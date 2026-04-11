# esoTalk Node.js Edition (esoTalk Plus)

esoTalk Plus is a modernized, extremely fast, free, open-source forum software upgraded from its legacy PHP roots to a fully real-time Node.js/Express.js architecture.

It utilizes the original, incredibly simple esoTalk UI (HTML/CSS) but replaces the backend with a powerful PostgreSQL, Redis, and Socket.IO stack.

## System Requirements

- **Node.js** (v18 or higher recommended)
- **PostgreSQL** (v14 or higher)
- **Redis** (v6 or higher)

## Installation Guide

### 1. Database Setup
Ensure that **PostgreSQL** and **Redis** are running on your system locally:
- PostgreSQL default port: `5432`
- Redis default port: `6379`

Create a new PostgreSQL database (e.g. `esotalk`).

### 2. Install Dependencies
Navigate to the application subdirectory and install the required Node modules:
```bash
cd node-esotalk
npm install
```

### 3. Environment Variables
Create a `.env` file within the `node-esotalk` directory. Populate it with your secrets and keys for the database, session, and any OAuth providers.
```env
# Server
PORT=3000

# Security
SESSION_SECRET=your_super_secret_session_key

# External Services (If using OAuth)
GOOGLE_CLIENT_ID=your_google_id
GOOGLE_CLIENT_SECRET=your_google_secret
GITHUB_CLIENT_ID=your_github_id
GITHUB_CLIENT_SECRET=your_github_secret
```
*(If no Redis URL is provided via `REDIS_URL`, it will attempt to connect to `redis://localhost:6379`.)*

### 4. Run the Server
Simply start the node server. On the first run, Sequelize will seamlessly sync your PostgreSQL database and create the `Users`, `Conversations`, `Channels`, and `Posts` tables automatically.
```bash
node index.js
```
Visit http://localhost:3000 in your browser.

## Features
- **Legacy UI Maintained:** The sleek and highly optimized UI originally created by Toby Zerner has been fully restored and translated to EJS templates.
- **Enterprise Databases:** Fully backed by PostgreSQL for persistence and Redis for bullet-proof sessions and memory management.
- **Unified Authentication:** Out of the box support for traditional Email login alongside Google and GitHub OAuth using Passport.js.
- **Socket.IO Integration:** Built with real-time foundations, enabling instant updates for Modern UI dynamics.
