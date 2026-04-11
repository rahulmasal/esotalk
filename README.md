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

### 3. Database Setup

Ensure **PostgreSQL** and **Redis** are running on your machine:

```bash
# PostgreSQL — Create a new database
psql -U postgres -c "CREATE DATABASE esotalk;"

# Redis — Should be running on default port 6379
redis-cli ping   # Should return PONG
```

### 4. Environment Variables

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

### 5. Start the Server

```bash
node index.js
```

On the first run, Sequelize will automatically create all database tables:
`Users`, `Conversations`, `Channels`, `Posts`, `Messages`, `Reports`, `AuditLogs`, `Polls`, `Bookmarks`, `Drafts`, `BannedIPs`

Visit **http://localhost:3000** in your browser.

### 6. Create an Admin User

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
