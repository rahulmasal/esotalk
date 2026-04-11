const BannedIP = require('../../models/BannedIP');

module.exports = function(addonManager, app, io) {

    // Simple cache so we don't query the DB on literally every request
    let ipCache = null;
    let cacheTime = 0;

    async function isIpBanned(ip) {
        const now = Date.now();
        if (!ipCache || now - cacheTime > 60000) { // Refresh cache every 60s
            try {
                const bans = await BannedIP.findAll();
                ipCache = new Set(bans.map(b => b.ipAddress));
                cacheTime = now;
            } catch (err) {
                console.error('[Addon: Moderation] IP List Error:', err);
                return false; // Fail open if DB is unreachable
            }
        }
        // Normalize IPv6 mapped IPv4
        const normalizedIp = ip.replace(/^::ffff:/, '');
        return ipCache.has(normalizedIp) || ipCache.has(ip);
    }

    // Unshift the middleware so it executes immediately
    app.use(async (req, res, next) => {
        // 1. Check IP level ban immediately
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        
        if (await isIpBanned(clientIp)) {
            // Hard drop connection - saves CPU and blocks API & static assets
            return res.status(403).send('Connection Refused. You are banned from this server.');
        }

        // 2. Check User level ban
        if (req.isAuthenticated() && req.user && req.user.isBanned) {
            req.logout((err) => {
                req.session.destroy();
                return res.status(403).send('Your account has been officially suspended.');
            });
            return;
        }

        next();
    });

    console.log('[Addon: Moderation] Initialized Security & Banning intercepts.');
};
