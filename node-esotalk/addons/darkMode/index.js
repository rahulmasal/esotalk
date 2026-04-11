module.exports = function(addonManager, app, io) {

    const clientScript = `
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const isDark = localStorage.getItem('theme') === 'dark';
            if (isDark) {
                document.body.classList.add('dark-mode');
            }

            // Optional: Auto-inject a toggle button if not present
            const userMenu = document.getElementById('userMenu');
            if (userMenu) {
                const li = document.createElement('li');
                li.innerHTML = '<a href="#" id="toggleTheme" style="cursor:pointer;">🌙 Theme</a>';
                userMenu.appendChild(li);

                document.getElementById('toggleTheme').addEventListener('click', (e) => {
                    e.preventDefault();
                    const currentDark = document.body.classList.toggle('dark-mode');
                    localStorage.setItem('theme', currentDark ? 'dark' : 'light');
                });
            }
        });
    </script>
    <style>
        body.dark-mode { background-color: #1a1a1a; color: #f0f0f0; }
        body.dark-mode #hdr { background-color: #222; border-bottom: 1px solid #333; }
        body.dark-mode a { color: #66b2ff; }
        body.dark-mode .auth-container, body.dark-mode .link-preview-card { background: #333; border-color: #444; color: #fff; }
        body.dark-mode input { background: #444; color: #fff; border-color: #555; }
    </style>
    `;

    // Injecting CSS and JS into the head
    addonManager.registerHook('onHeaderRender', async (headerHTML) => {
        return (headerHTML || '') + '\n' + clientScript;
    });

    console.log('[Addon: DarkMode] Injected dynamic theme toggle.');
};
