const fs = require('fs');
const path = require('path');

module.exports = function(addonManager, app, io) {
    const defaultLanguage = 'en';
    const dictionary = {
      'en': {
        'Login': 'Log In',
        'Signup': 'Sign Up',
        'Topics': 'Discussions'
      },
      'fr': {
        'Login': 'Connexion',
        'Signup': 'S\'inscrire',
        'Topics': 'Sujets'
      }
    };

    // Hook into EJS locals to provide a translate function `T()` just like legacy esoTalk `T("string")`
    addonManager.registerHook('onRenderLocals', async (locals) => {
        locals.T = function(stringKey, userLang = defaultLanguage) {
            if (dictionary[userLang] && dictionary[userLang][stringKey]) {
                return dictionary[userLang][stringKey];
            }
            return stringKey; // Fallback
        };
        return locals;
    });

    console.log('[Addon: Languages] Initialized i18n T() engine.');
};
