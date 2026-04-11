module.exports = function(addonManager, app, io) {
    
    // An API endpoint for clients to react to a post via AJAX
    app.post('/api/posts/:postId/react', async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
            
            const postId = req.params.postId;
            const reaction = req.body.reactionType; // e.g., 'like', 'heart'
            const userId = req.user.id;

            const Post = require('../../models/Post');
            const post = await Post.findByPk(postId);
            if (!post) return res.status(404).json({ error: 'Post not found' });

            let reactions = post.reactions || {};
            if (!reactions[reaction]) reactions[reaction] = [];

            // Toggle reaction
            const userIndex = reactions[reaction].indexOf(userId);
            if (userIndex > -1) {
                reactions[reaction].splice(userIndex, 1);
            } else {
                reactions[reaction].push(userId);
            }

            post.reactions = reactions;
            post.changed('reactions', true); // Force sequelize to update JSONB
            await post.save();

            // Trigger hook to notify other plugins (like badging or live notifications)
            addonManager.triggerHook('onPostReacted', { post, user: req.user, reaction });

            res.json({ success: true, reactions: post.reactions });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Server Error' });
        }
    });

    console.log('[Addon: Reactions] Initialized. Emojis ready.');
};
