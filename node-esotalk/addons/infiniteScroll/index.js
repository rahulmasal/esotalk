module.exports = function(addonManager, app, io) {

    const clientScript = `
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            // Infinite scroll logic
            let isLoading = false;
            let offset = 20;

            window.addEventListener('scroll', () => {
                if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
                    if (!isLoading) {
                        isLoading = true;
                        // Fetch next batch of posts (assuming /api/posts endpoint exists)
                        fetch(\`/api/posts?offset=\${offset}\`)
                            .then(res => res.json())
                            .then(data => {
                                if(data && data.posts && data.posts.length > 0) {
                                    offset += data.posts.length;
                                    // Append to DOM logic goes here
                                }
                                isLoading = false;
                            }).catch(err => {
                                console.error('Infinite Scroll End', err);
                                isLoading = false;
                            });
                    }
                }
            });
        });
    </script>
    `;

    // Inject the script just before the closing </body> tag via a hook
    addonManager.registerHook('onFooterRender', async (footerHTML) => {
        return (footerHTML || '') + '\n' + clientScript;
    });

    console.log('[Addon: InfiniteScroll] Front-end JS injected.');
};
