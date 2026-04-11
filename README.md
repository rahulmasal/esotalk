# esoTalk Plus 🚀

A modern, real-time forum platform — completely rewritten from legacy PHP to a high-performance **Node.js / Express.js** architecture.

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

---

## ✨ Highlights

- 🔐 **Bank-Level Security** — Compulsory 2FA (Google Authenticator), OTP email verification, disposable email blocking
- ⚡ **Real-Time** — Socket.IO powered DMs, live notifications, and instant reactions
- 🛡️ **Admin Panel** — Role-based access control, content reporting, IP firewall, full audit logs
- 🔍 **Full-Text Search** — Search threads and posts instantly via PostgreSQL
- 📊 **Polls & Surveys** — Embedded polls with multi-choice and double-vote prevention
- 📱 **PWA Ready** — Installable as a native app on any device
- 🧩 **Plugin Engine** — Hot-pluggable addon system (mentions, reactions, badges, link previews, dark mode, and more)

> For a full breakdown of all features, see [features.md](features.md).

---

## 📋 System Requirements

| Dependency | Minimum Version |
|---|---|
| **Node.js** | v18+ |
| **PostgreSQL** | v14+ |
| **Redis** | v6+ |

---

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/rahulmasal/esotalk.git
cd esotalk
```

### 2. Install Dependencies

```bash
cd node-esotalk
npm install
```

### 3. Install PostgreSQL (Database)

PostgreSQL is the main database that stores all your users, posts, messages, and settings.

<details>
<summary><strong>🪟 Windows</strong></summary>

1. Download the installer from https://www.postgresql.org/download/windows/
2. Run the installer. During setup:
   - Set a **password** for the `postgres` user (remember this — you'll need it for `.env`)
   - Keep the default port as `5432`
   - Click **Next** through the rest and finish installation
3. Open **pgAdmin 4** (installed automatically) or open **Command Prompt** and run:
   ```cmd
   psql -U postgres
   ```
   Enter your password when prompted, then create the database:
   ```sql
   CREATE DATABASE esotalk;
   \q
   ```

> **Tip:** If `psql` is not recognized, add PostgreSQL to your PATH:  
> `C:\Program Files\PostgreSQL\16\bin` (adjust version number)

</details>

<details>
<summary><strong>🍎 macOS</strong></summary>

The easiest way is using Homebrew:
```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install PostgreSQL
brew install postgresql@16

# Start the service
brew services start postgresql@16

# Create the database
createdb esotalk
```

To verify it's running:
```bash
psql -d esotalk -c "SELECT version();"
```

</details>

<details>
<summary><strong>🐧 Ubuntu / Debian Linux</strong></summary>

```bash
# Update packages
sudo apt update

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Start the service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Switch to the postgres user and create database
sudo -u postgres psql -c "CREATE DATABASE esotalk;"

# Set a password for the postgres user
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'your_password_here';"
```

</details>

---

### 4. Install Redis (Session & Cache Store)

Redis keeps your login sessions alive and powers real-time caching. Without it, users would get logged out every time the server restarts.

<details>
<summary><strong>🪟 Windows</strong></summary>

Redis doesn't officially support Windows, but there are two easy options:

**Option A: Using Memurai (Recommended for Beginners)**
1. Download Memurai (Redis-compatible) from https://www.memurai.com/get-memurai
2. Run the installer — it starts automatically as a Windows service
3. Verify it's running:
   ```cmd
   memurai-cli ping
   ```
   Should return `PONG`

**Option B: Using WSL (Windows Subsystem for Linux)**
1. Open PowerShell as Admin and run:
   ```powershell
   wsl --install
   ```
2. Restart your computer, then open the Ubuntu terminal and run:
   ```bash
   sudo apt update
   sudo apt install redis-server -y
   sudo service redis-server start
   redis-cli ping
   ```
   Should return `PONG`

</details>

<details>
<summary><strong>🍎 macOS</strong></summary>

```bash
# Install via Homebrew
brew install redis

# Start the service
brew services start redis

# Verify
redis-cli ping
```
Should return `PONG`

</details>

<details>
<summary><strong>🐧 Ubuntu / Debian Linux</strong></summary>

```bash
# Install Redis
sudo apt update
sudo apt install redis-server -y

# Start and enable the service
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify
redis-cli ping
```
Should return `PONG`

</details>

---

### 5. Install Node.js

<details>
<summary><strong>🪟 Windows</strong></summary>

1. Download the LTS installer from https://nodejs.org/
2. Run the installer — keep all defaults, make sure **"Add to PATH"** is checked
3. Restart your terminal, then verify:
   ```cmd
   node --version
   npm --version
   ```

</details>

<details>
<summary><strong>🍎 macOS</strong></summary>

```bash
brew install node
node --version
npm --version
```

</details>

<details>
<summary><strong>🐧 Ubuntu / Debian Linux</strong></summary>

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node --version
npm --version
```

</details>

### 6. Environment Variables

Create a `.env` file inside the `node-esotalk/` directory:

```env
# ── Server ──
PORT=3000

# ── Security ──
SESSION_SECRET=your_super_secret_session_key_here

# ── Database (PostgreSQL) ──
DB_NAME=esotalk
DB_USER=postgres
DB_PASS=your_postgres_password
DB_HOST=localhost
DB_PORT=5432

# ── Redis ──
REDIS_URL=redis://localhost:6379

# ── SMTP (for OTP emails) ──
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# ── OAuth (Optional — Google & GitHub SSO) ──
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

> **Note:** If `SMTP_USER` is not set, OTP codes will be printed to the server console for development/testing purposes.

### 7. Start the Server

```bash
node index.js
```

On the first run, Sequelize will automatically create all database tables:
`Users`, `Conversations`, `Channels`, `Posts`, `Messages`, `Reports`, `AuditLogs`, `Polls`, `Bookmarks`, `Drafts`, `BannedIPs`

Visit **http://localhost:3000** in your browser.

### 8. Create an Admin User

After registering your first account, promote it to admin directly in PostgreSQL:

```sql
UPDATE "Users" SET role = 'admin' WHERE username = 'your_username';
```

Then access the admin dashboard at **http://localhost:3000/admin**.

---

## 🗂️ Project Structure

```
node-esotalk/
├── addons/                 # Plugin engine & all addons
│   ├── AddonManager.js     # Core hook system
│   ├── badges/             # Reputation & badge system
│   ├── darkMode/           # Theme toggle
│   ├── infiniteScroll/     # Lazy-load posts
│   ├── languages/          # i18n translations
│   ├── linkPreviews/       # OpenGraph rich previews
│   ├── liveNotifications/  # Socket.IO toasts
│   ├── markdown/           # Safe markdown rendering
│   ├── mentions/           # @username tagging
│   ├── moderation/         # IP/User ban firewall
│   ├── reactions/          # Post reactions
│   └── skins/              # CSS themes
├── config/
│   ├── database.js         # Sequelize PostgreSQL config
│   └── passport.js         # Auth strategies
├── middleware/
│   └── rbac.js             # Role-based access control
├── models/
│   ├── User.js             # Users (roles, 2FA, bio, avatar)
│   ├── Post.js             # Posts (reactions, mentions)
│   ├── Conversation.js     # Threads (tags, pins)
│   ├── Channel.js          # Forums/Categories
│   ├── Message.js          # Private DMs
│   ├── Report.js           # Content flagging
│   ├── AuditLog.js         # Admin action tracking
│   ├── Poll.js             # Embedded polls
│   ├── Bookmark.js         # Saved threads
│   ├── Draft.js            # Auto-saved drafts
│   └── BannedIP.js         # IP firewall
├── routes/
│   ├── auth.js             # Login, Signup, OTP, 2FA, OAuth
│   ├── forum.js            # Home, Search, Tags, Polls, Bookmarks
│   ├── admin.js            # Admin panel, reports, bans, audit
│   ├── messages.js         # Private messaging
│   ├── uploads.js          # File upload API
│   └── profile.js          # User profiles, avatars, drafts
├── views/                  # EJS templates
├── public/
│   ├── css/                # Stylesheets
│   ├── js/app.js           # Keyboard shortcuts, PWA, auto-save
│   ├── sw.js               # Service worker
│   └── manifest.json       # PWA manifest
├── uploads/                # User-uploaded files
├── index.js                # Main server entry point
└── package.json
```

---

## 🔐 Authentication Flow

```
Registration:  Signup → Disposable Email Check → OTP Email → Verify OTP → Scan 2FA QR → Verify Token → Account Created
Local Login:   Email/Password → 2FA Token → Session Created
OAuth Login:   Google/GitHub → (New? → 2FA Setup) or (Returning? → 2FA Token) → Session Created
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+K` / `Cmd+K` | Jump to search |
| `Ctrl+Enter` | Submit current form |
| `Escape` | Close modals |

---

## 📜 License

ISC License — Originally created by Toby Zerner, modernized for Node.js.
