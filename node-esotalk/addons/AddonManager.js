const fs = require('fs');
const path = require('path');

class AddonManager {
    constructor() {
        this.hooks = {};
        this.addons = [];
    }

    // Register a function to run whenever an event is fired
    registerHook(eventName, callback) {
        if (!this.hooks[eventName]) {
            this.hooks[eventName] = [];
        }
        this.hooks[eventName].push(callback);
    }

    // Fire an event, allowing addons to modify the data sequentially
    async triggerHook(eventName, data) {
        if (!this.hooks[eventName]) return data;
        let runningData = data;
        for (const callback of this.hooks[eventName]) {
            runningData = await callback(runningData);
        }
        return runningData;
    }

    // Utility to get all registered plugins for UI iteration
    getLoadedAddons() {
        return this.addons;
    }

    // Auto-discover and load addons
    loadAddons(app, io) {
        const addonsPath = path.join(__dirname);
        const addonFolders = fs.readdirSync(addonsPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        addonFolders.forEach(folder => {
            const addonEntryPoint = path.join(addonsPath, folder, 'index.js');
            if (fs.existsSync(addonEntryPoint)) {
                try {
                    const addonInit = require(addonEntryPoint);
                    addonInit(this, app, io);
                    this.addons.push(folder);
                    console.log(`Successfully loaded addon: ${folder}`);
                } catch (err) {
                    console.error(`Failed to load addon [${folder}]:`, err);
                }
            }
        });
    }
}

module.exports = new AddonManager();
