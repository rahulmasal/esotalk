# esoTalk Plus: Core Features Index

esoTalk Plus is a completely rewritten, modern Node.js and Express.js forum application adapted from the legacy PHP framework (esoTalk). Below is the comprehensive documentation of its integrated features and architecture.

## ⚙️ Architecture & Infrastructure
* **Node.js + Express**: Lightning-fast event-driven backend replacing traditional PHP synchronous request blockers.
* **PostgreSQL Engine**: Moved away from unscalable SQLite files to a robust, transactional cloud-ready database using Sequelize ORM.
* **Redis Sessions**: Drop-in session persistence. If the Node.js server restarts, users do not get logged out. 
* **Real-time Event Bus**: Native `Socket.io` integration. Allows bidirectional messaging for toasts, typing notifications, and instant activity indicators.
* **Unified Template Rendering**: Uses `EJS` templating bound strictly to the original legacy CSS wrappers ensuring backward compatibility with old themes.

## 🔐 Advanced Authentication (`Passport.js`)
esoTalk Plus has moved away from weak home-brewed salt logic and handles state-of-the-art authentication pipelines natively:
* **Local Auth**: Bulletproof password hashing via `bcryptjs`.
* **OAuth 2.0 Providers**: Out-of-the-box Single Sign-On (SSO) with direct links via `Google OAuth` and `GitHub OAuth`. Auto-maps existing user emails.

## 🧩 Modular Plugin Engine (`AddonManager.js`)
We constructed a custom Express middleware interception engine that fully replicates the old `ET::trigger()` hook system, allowing hot-plugging UI features without altering core `routes`:

### Engagement & Identity
* **Mentions System**: Typing `@username` auto-converts to a clickable tag. Exposes a frontend `api/users/autocomplete` polling endpoint.
* **Reactions & Emojis**: Instead of typing replies, users can append JSONB reaction arrays directly to the PostgreSQL record of a post locally.
* **Reputation & Badges**: Background tasks hooked into reactions. If a user accumulates upvotes, they are instantly awarded dynamic badges (e.g. *Community Pillar*).

### Content Rendering
* **Markdown Parser**: Uses `marked` + `DOMpurify` safely to convert hashes (`# Title`) and code blocks into sanitized rich HTML. 
* **Rich Link Previews**: Leverages the `open-graph-scraper` hook to intercept bare URLs (like YouTube) and expands them into beautiful thumbnail preview cards. (Enforces a 3-second timeout).
* **i18n Translation Matrix**: Global dictionary fallback system allowing the application to render different variables in multiple languages locally.

### Frontend Interactions
* **Live Notifications**: Bound explicitly to `Mentions` and `Reactions`. Whenever triggered, `Socket.io` pushes an instant visual toast specifically mapped to the active User's socket ID in the browser.
* **Dark Mode Core**: A tokenized `localStorage` script that dynamically overrides `default.master.ejs` wrapper classes.
* **Infinite Scroll**: An event-listener hook embedded in the footer to seamlessly AJAX-poll the next batch of posts without reloading the browser.

## 🛡️ Security & Moderation
esoTalk Plus enforces strict defense mechanisms upstream before reaching the application timeline logic:
* **JSONB Protection**: We utilized native JSON blocks rather than weak SQL foreign-tables to prevent cascade injection failures.
* **Suspended Accounts Drop**: Checks `isBanned` against the `User` passport token and immediately destroys the backend session cache.
* **Global IP Banning Engine**: A cached firewall middleware. It queries the `BannedIP` table (refreshed every 60s) to instantly `403 Forbidden` offending network IPv4/IPv6 addresses, massively reducing server load from bot spam.
