const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const { Sequelize } = require('sequelize');
const { createClient } = require('redis');
const crypto = require('crypto');

module.exports = function startSetupServer() {
    const app = express();
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(express.static(path.join(__dirname, 'public')));

    app.get('/', (req, res) => {
        res.render('setup-wizard', { data: {} });
    });

    app.post('/', async (req, res) => {
        const data = req.body;
        let error = null;

        try {
            // 1. Verify PostgreSQL connection
            const sequelize = new Sequelize(data.db_name, data.db_user, data.db_pass, {
                host: data.db_host,
                port: parseInt(data.db_port || '5432'),
                dialect: 'postgres',
                logging: false,
                /* Lower timeout so it doesn't hang forever */
                dialectOptions: {
                    connectTimeout: 5000
                }
            });
            await sequelize.authenticate();
            await sequelize.close(); // Close the test connection
        } catch (err) {
            error = `PostgreSQL Connection Failed: ${err.message}`;
            return res.render('setup-wizard', { data, error });
        }

        try {
            // 2. Verify Redis connection
            const redisClient = createClient({
                url: data.redis_url,
                socket: { connectTimeout: 5000 }
            });
            await redisClient.connect();
            await redisClient.disconnect();
        } catch (err) {
            error = `Redis Connection Failed: ${err.message}`;
            return res.render('setup-wizard', { data, error });
        }

        // Connection successful. Generate secure random keys
        const sessionSecret = crypto.randomBytes(32).toString('hex');
        const setupToken = crypto.randomBytes(16).toString('hex');

        // Construct .env content
        let envContent = `# ── Server ──\nPORT=3000\n\n`;
        envContent += `# ── Security ──\nSESSION_SECRET=${sessionSecret}\nADMIN_SETUP_TOKEN=${setupToken}\n\n`;
        envContent += `# ── Database (PostgreSQL) ──\n`;
        envContent += `DB_NAME=${data.db_name}\n`;
        envContent += `DB_USER=${data.db_user}\n`;
        envContent += `DB_PASS=${data.db_pass}\n`;
        envContent += `DB_HOST=${data.db_host}\n`;
        envContent += `DB_PORT=${data.db_port}\n\n`;
        envContent += `# ── Redis ──\nREDIS_URL=${data.redis_url}\n\n`;

        if (data.smtp_host) {
            envContent += `# ── SMTP Email ──\n`;
            envContent += `SMTP_HOST=${data.smtp_host}\n`;
            envContent += `SMTP_PORT=${data.smtp_port}\n`;
            envContent += `SMTP_USER=${data.smtp_user}\n`;
            envContent += `SMTP_PASS=${data.smtp_pass}\n`;
        }

        // Write to .env
        try {
            fs.writeFileSync(path.join(__dirname, '.env'), envContent);
            
            // Render success page telling user to restart
            res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>Setup Complete</title>
                    <link rel="stylesheet" href="/css/base.css">
                    <style>
                        body { background-color: #f4f6f9; font-family: sans-serif; text-align: center; padding-top: 50px; }
                        .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
                        h1 { color: #28a745; margin-top: 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>✅ Configuration Saved!</h1>
                        <p>Your database and Redis connected successfully.</p>
                        <p>The <code>.env</code> file has been created.</p>
                        <br>
                        <h3>⚠️ Action Required</h3>
                        <p>Please stop the server (Ctrl+C in terminal) and start it again using:</p>
                        <pre style="background:#eee; padding:10px; border-radius:4px; display:inline-block;">node index.js</pre>
                        <br><br>
                        <p style="font-size:0.9em; color:#666;">Note: The server will automatically exit in 5 seconds if running manually.</p>
                    </div>
                    <script>
                        // Try redirecting automatically after 5-6 seconds if pm2 restarted it
                        setTimeout(() => { window.location = '/'; }, 6000);
                    </script>
                </body>
                </html>
            `);

            // Give Express time to send the response, then gracefully exit
            // so nodemon/PM2 can naturally restart it, or return to prompt for manual start.
            setTimeout(() => {
                console.log('\n✅ Setup completed. Exiting so the main application can start.\n');
                process.exit(0);
            }, 1000);

        } catch (err) {
            error = `Failed to write .env file: ${err.message}`;
            return res.render('setup-wizard', { data, error });
        }
    });

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`\n========================================`);
        console.log(`🚀 esoTalk Plus is not configured!`);
        console.log(`👉 Please visit http://localhost:${PORT} in your browser to run the Setup Wizard.`);
        console.log(`========================================\n`);
    });
};
