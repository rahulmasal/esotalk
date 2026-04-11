const ogs = require('open-graph-scraper');

module.exports = function(addonManager, app, io) {

    // Helper function to extract URL and generate rich card HTML
    async function createRichLink(url) {
        try {
            const options = { url, timeout: 3000 };
            const { result } = await ogs(options);
            if (result && result.success && result.ogTitle) {
                return `
                <div class="link-preview-card" style="border: 1px solid #ddd; padding: 10px; border-radius: 8px; margin: 10px 0; background: #fafafa;">
                    ${result.ogImage && result.ogImage.length ? `<img src="${result.ogImage[0].url}" style="max-width:100px; float:left; margin-right:15px; border-radius:4px;">` : ''}
                    <div>
                        <h4 style="margin:0 0 5px 0;"><a href="${url}" target="_blank" style="text-decoration:none;">${result.ogTitle}</a></h4>
                        <p style="margin:0; font-size: 0.9em; color:#555;">${result.ogDescription || ''}</p>
                    </div>
                    <div style="clear:both;"></div>
                </div>`;
            }
        } catch (err) {
            console.error('[Addon: LinkPreviews] Failed to fetch:', url, err.message);
        }
        return `<a href="${url}" target="_blank">${url}</a>`; // Fallback to plain link
    }

    // Hook into post render
    addonManager.registerHook('onPostRender', async (postText) => {
        if (!postText) return postText;

        // Regex to find bare URLs
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const matches = postText.match(urlRegex);

        if (!matches || matches.length === 0) return postText;

        let enrichedText = postText;
        for (const url of matches) {
            const richCard = await createRichLink(url);
            enrichedText = enrichedText.replace(url, richCard);
        }

        return enrichedText;
    });

    console.log('[Addon: LinkPreviews] Initialized OpenGraph scanner.');
};
