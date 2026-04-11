module.exports = function(addonManager, app, io) {
    const connectedUsers = new Map();

    // Map socket ID to user ID so we can send direct notifications
    io.on('connection', (socket) => {
        socket.on('identify', (userId) => {
            connectedUsers.set(userId, socket.id);
            console.log(`[Socket] User ${userId} identified`);
        });

        socket.on('disconnect', () => {
            for (let [uid, sid] of connectedUsers.entries()) {
                if (sid === socket.id) connectedUsers.delete(uid);
            }
        });
    });

    // Listen to reactions and broadcast to the post owner in real-time
    addonManager.registerHook('onPostReacted', async ({ post, user, reaction }) => {
        const authorId = post.memberId;
        if (!authorId || authorId === user.id) return; // Don't notify self

        const authorSocket = connectedUsers.get(authorId);
        if (authorSocket) {
            io.to(authorSocket).emit('notification', {
                type: 'reaction',
                message: `${user.username} reacted to your post with a ${reaction}!`,
                postId: post.id
            });
        }
    });

    console.log('[Addon: LiveNotifications] Initialized Real-Time Event Bus.');
};
