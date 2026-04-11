const User = require('../../models/User');

module.exports = function(addonManager, app, io) {

    // Listen to reactions being added to potentially bump reputation and grant badges
    addonManager.registerHook('onPostReacted', async ({ post, user, reaction }) => {
        try {
            // Find the author of the post that was reacted to
            const authorId = post.memberId;
            if (!authorId || authorId === user.id) return; // Ignore self-likes

            const author = await User.findByPk(authorId);
            if (!author) return;

            // Simple reputation increment logic
            author.reputation += 1;

            // Badge award logc
            let newBadges = [...author.badges];
            if (author.reputation === 10 && !newBadges.includes('Rising Star')) {
                newBadges.push('Rising Star');
            } else if (author.reputation === 100 && !newBadges.includes('Community Pillar')) {
                newBadges.push('Community Pillar');
            }

            if (newBadges.length > author.badges.length) {
                author.badges = newBadges;
                author.changed('badges', true);
            }

            await author.save();
            console.log(`[Badges] Enhanced reputation for ${author.username}`);

        } catch (error) {
            console.error('[Addon: Badges] Error evaluating reputation:', error);
        }
    });

    console.log('[Addon: Badges] Initialized reputation and badge scanner.');
};
