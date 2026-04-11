# esoTalk Plus: Core Features Index

esoTalk Plus is a completely rewritten, modern Node.js and Express.js forum application adapted from the legacy PHP framework (esoTalk). Below is the comprehensive documentation of its integrated features and architecture.

---

## ⚙️ Architecture & Infrastructure
* **Node.js + Express**: Lightning-fast event-driven backend replacing traditional PHP synchronous request blockers.
* **PostgreSQL Engine**: Moved away from unscalable SQLite files to a robust, transactional cloud-ready database using Sequelize ORM.
* **Redis Sessions**: Drop-in session persistence. If the Node.js server restarts, users do not get logged out. 
* **Real-time Event Bus**: Native `Socket.io` integration. Allows bidirectional messaging for toasts, typing notifications, and instant activity indicators.
* **Unified Template Rendering**: Uses `EJS` templating bound strictly to the original legacy CSS wrappers ensuring backward compatibility with old themes.

---

## 🔐 Advanced Authentication & Security
esoTalk Plus has moved away from weak home-brewed salt logic and handles state-of-the-art authentication pipelines natively:
* **Disposable Email Blocker**: Instantly rejects disposable or temporary inboxes (like Mailinator) during signup via a dynamically updated blacklist.
* **OTP Email Verification**: Enforces a strict Two-Step Signup process. Users are temporarily staged in Redis cache and must input a 6-digit One-Time Password sent via local SMTP (`nodemailer`) before database injection.
* **Compulsory Two-Factor Authentication (2FA)**: All users (local and OAuth) must scan a QR code with Google Authenticator/Authy and verify a TOTP token before account creation or login.
* **Local Auth**: Bulletproof password hashing via `bcryptjs`.
* **OAuth 2.0 Providers**: Out-of-the-box Single Sign-On (SSO) with Google and GitHub. OAuth users are intercepted and forced through 2FA setup before gaining access.

---

## 🛡️ Security Hardening
* **Helmet.js**: Automatically sets secure HTTP headers (XSS protection, content-type sniffing prevention, clickjacking defense).
* **Rate Limiting**: Global limiter (100 req/15min per IP) and strict auth limiter (10 login attempts/15min) to prevent brute-force and DDoS.
* **Cookie Parser**: Secure cookie handling for session management.
* **File Upload Filtering**: Multer-based uploads with strict file type whitelisting (images, PDFs, videos) and 10MB size cap.

---

## 👮 Moderation & Administration
* **Role-Based Access Control (RBAC)**: Three-tier permission system — `Admin`, `Moderator`, `Member`. Middleware enforces access at every route.
* **Admin Dashboard** (`/admin`): Full analytics panel showing user count, post count, thread count, and pending reports. Includes user management, IP banning, and audit log viewer.
* **User Banning**: Admins can ban users, destroying their session instantly via the moderation addon.
* **IP Firewall**: Cached middleware checks incoming IPs against a database ban list (refreshed every 60s). Banned IPs receive `403 Forbidden`.
* **Content Reporting**: Users can flag posts for inappropriate behavior. Moderators review via a dedicated Reports Queue.
* **Audit Logs**: All admin/moderator actions are tracked (bans, role changes, post deletions) with actor, target, timestamp, and IP.
* **Spam Detection**: Keyword filtering hook available in the addon system for automated content screening.

---

## 🧩 Modular Plugin Engine (`AddonManager.js`)
A custom Express middleware interception engine that fully replicates the old `ET::trigger()` hook system, allowing hot-plugging UI features without altering core routes:

### Engagement & Identity
* **Mentions System**: Typing `@username` auto-converts to a clickable tag. Exposes a frontend `api/users/autocomplete` polling endpoint.
* **Reactions & Emojis**: Users can append JSONB reaction arrays directly to posts via API.
* **Reputation & Badges**: Background tasks hooked into reactions. Users automatically earn dynamic badges (e.g. *Community Pillar*).

### Content Rendering
* **Markdown Parser**: Uses `marked` + `DOMpurify` to safely convert markdown into sanitized rich HTML. 
* **Rich Link Previews**: Leverages `open-graph-scraper` to expand bare URLs into thumbnail preview cards (3-second timeout).
* **i18n Translation Matrix**: Global dictionary fallback system for multilingual support.

### Frontend Interactions
* **Live Notifications**: Real-time toasts via Socket.IO when someone mentions or reacts to your post.
* **Dark Mode**: `localStorage`-powered theme toggle with CSS variable injection.
* **Infinite Scroll**: Intersection Observer hook that fetches post batches via `/api/posts?offset=N`.

---

## ✉️ Private Messaging
* **Real-Time Direct Messages**: Full inbox system with conversation threads. Messages are delivered instantly via Socket.IO.
* **Read Receipts**: Tracks read/unread status per message.
* **Chat Interface**: Bubble-style chat UI with auto-scrolling and real-time message injection.

---

## 🔍 Full-Text Search & Discovery
* **Search Engine**: PostgreSQL `iLike` powered search across both thread titles and post content.
* **Tag System**: Conversations support JSONB tag arrays. Filter by tag via `/tag/:tagname`.
* **Pinned Threads**: Admins can pin important conversations to the top of the feed.

---

## 📊 Polls & Surveys
* **Embedded Polls**: Create polls with multiple options inside any conversation thread.
* **Multi-Choice Support**: Optional multi-choice voting mode.
* **Double-Vote Prevention**: Server-side enforcement prevents duplicate votes.

---

## 🔖 Bookmarks & Drafts
* **Bookmarks**: Save any conversation for later. View bookmarks from your profile.
* **Auto-Save Drafts**: Client-side script auto-saves your post content every 30 seconds via API. Never lose work again.

---

## 📁 File & Image Uploads
* **Drag-and-Drop Uploads**: Multer-powered file upload system with single and multi-file support.
* **Avatar Upload**: Users can upload custom profile avatars (2MB limit).
* **File Type Security**: Only allows JPEG, PNG, GIF, WebP, PDF, MP4, and ZIP files.

---

## 👤 User Profiles
* **Public Profiles**: Each user has a profile page (`/profile/:username`) showing bio, avatar, badges, reputation, post count, and recent activity.
* **Bio Editing**: Users can edit their own bio directly from their profile.
* **Custom Avatars**: Upload personalized profile pictures.
* **Profile-to-DM**: Click "Send Message" on any profile to start a private conversation.

---

## 📱 Progressive Web App (PWA)
* **Service Worker**: Network-first caching strategy with offline fallback.
* **Web App Manifest**: Installable as a native app on mobile and desktop with custom icon and theme color.

---

## ⌨️ Keyboard Shortcuts
* **`Ctrl+K` / `Cmd+K`**: Jump to search bar instantly.
* **`Ctrl+Enter`**: Submit the currently focused form.
* **`Escape`**: Close modals and popups.

---

## 📊 SEO Optimization
* **Descriptive Title Tags**: Every page renders a unique, keyword-rich `<title>`.
* **Meta Descriptions**: Profile pages include OpenGraph-compatible meta descriptions.
* **SEO-Friendly Slugs**: Conversations use human-readable URL slugs.

---

## 📦 Dependencies
| Package | Purpose |
|---|---|
| `express` | Web framework |
| `sequelize` + `pg` | PostgreSQL ORM |
| `redis` + `connect-redis` | Session store |
| `passport` + strategies | Authentication |
| `socket.io` | Real-time events |
| `helmet` | Security headers |
| `express-rate-limit` | DDoS/brute-force protection |
| `multer` | File uploads |
| `otplib` + `qrcode` | Two-Factor Authentication |
| `nodemailer` | Email dispatch |
| `disposable-email-domains` | Temp email blocking |
| `marked` + `dompurify` | Safe markdown rendering |
| `open-graph-scraper` | Link preview cards |
