// Role-Based Access Control Middleware

function requireAuth(req, res, next) {
    if (!req.isAuthenticated()) {
        return res.redirect('/auth/login');
    }
    if (req.user && req.user.isBanned) {
        return req.logout(() => {
            req.session.destroy(() => {
                res.status(403).send('Your account has been suspended.');
            });
        });
    }
    next();
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.isAuthenticated()) {
            return res.redirect('/auth/login');
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).send('Access Denied: Insufficient permissions.');
        }
        next();
    };
}

function requireAdmin(req, res, next) {
    return requireRole('admin')(req, res, next);
}

function requireModerator(req, res, next) {
    return requireRole('admin', 'moderator')(req, res, next);
}

module.exports = { requireAuth, requireRole, requireAdmin, requireModerator };
