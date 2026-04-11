const fs = require('fs');
const path = require('path');

module.exports = function(addonManager, app, io) {
    // Determine which skin is active (could pull from DB eventually)
    // For now we assume a legacy skin named "default"
    const activeSkin = 'base.css';

    // Hook into Header rendering to inject skin CSS
    addonManager.registerHook('onHeaderRender', async (headerHTML) => {
        const cssLink = `<link rel="stylesheet" href="/css/${activeSkin}">`;
        return (headerHTML || '') + '\n' + cssLink;
    });

    console.log('[Addon: Skins] Initialized dynamic skin loader.');
};
