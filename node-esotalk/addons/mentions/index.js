const User = require('../../models/User');

module.exports = function(addonManager, app, io) {

    // 1. Hook into markdown rendering to format @username as a clickable link and record mentions
    addonManager.registerHook('onPostRender', async (postText) => {
        if (!postText) return postText;

        // Naive regex to locate @username
        const mentionRegex = /@([a-zA-Z0-9_]+)/g;
        
        let modifiedHtml = postText.replace(mentionRegex, (match, username) => {
            return `<a href="/member/${username}" class="mention-tag">${match}</a>`;
        });

        return modifiedHtml;
    });

    // 2. An API endpoint for frontend autocomplete to search users by typing
    app.get('/api/users/autocomplete', async (req, res) => {
        try {
            const query = req.query.q || '';
            const { Op } = require('sequelize');
            const users = await User.findAll({
                where: {
                    username: {
                        [Op.iLike]: `${query}%`
                    }
                },
                attributes: ['id', 'username'],
                limit: 5
            });
            res.json(users);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Server Error' });
        }
    });

    console.log('[Addon: Mentions] Initialized @mentions hook and autocomplete endpoint.');
};
