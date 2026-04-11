const marked = require('marked');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

module.exports = function(addonManager, app, io) {
    // Hook into post render to convert raw text -> markdown HTML
    addonManager.registerHook('onPostRender', async (postText) => {
        if (!postText) return postText;
        
        // 1. Convert Markdown to HTML
        let html = marked.parse(postText);
        
        // 2. Sanitize to prevent XSS
        html = DOMPurify.sanitize(html);
        
        return html;
    });

    console.log('[Addon: Markdown] Initialized bbcode/markdown parser.');
};
