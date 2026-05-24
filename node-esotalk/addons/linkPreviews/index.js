const ogs = require('open-graph-scraper');

module.exports = function(addonManager, app, io) {

    // Sanitize text for safe HTML embedding
    function escapeHtml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
    }

    // Helper function to extract URL and generate rich card HTML
    async function createRichLink(url) {
        try {
            const options = { url, timeout: 3000 };
            const { result } = await ogs(options);
            if (result && result.success && result.ogTitle) {
                const safeTitle = escapeHtml(result.ogTitle);
                const safeDesc = escapeHtml(result.ogDescription || '');
                const safeUrl = escapeHtml(url);
                const safeImg = result.ogImage && result.ogImage.length ? escapeHtml(result.ogImage[0].url) : '';
                return `
                <div class="link-preview-card" style="border: 1px solid #ddd; padding: 10px; border-radius: 8px; margin: 10px 0; background: #fafafa;">
                    ${safeImg ? `<img src="${safeImg}" style="max-width:100px; float:left; margin-right:15px; border-radius:4px;">` : ''}
                    <div>
                        <h4 style="margin:0 0 5px 0;"><a href="${safeUrl}" target="_blank" style="text-decoration:none;">${safeTitle}</a></h4>
                        <p style="margin:0; font-size: 0.9em; color:#555;">${safeDesc}</p>
                    </div>
                    <div style="clear:both;"></div>
                </div>`;
            }
        } catch (err) {
            console.error('[Addon: LinkPreviews] Failed to fetch:', url, err.message);
        }
        return `<a href="${escapeHtml(url)}" target="_blank">${escapeHtml(url)}</a>`;
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
