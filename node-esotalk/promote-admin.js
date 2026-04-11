#!/usr/bin/env node

/**
 * esoTalk Plus — Admin Promotion CLI Tool
 * 
 * Usage:
 *   node promote-admin.js <username>
 * 
 * Example:
 *   node promote-admin.js rahul
 */

require('dotenv').config();
const sequelize = require('./config/database');
const User = require('./models/User');

const username = process.argv[2];

if (!username) {
    console.error('\n❌ Usage: node promote-admin.js <username>\n');
    console.error('Example: node promote-admin.js rahul\n');
    process.exit(1);
}

(async () => {
    try {
        await sequelize.authenticate();
        
        const user = await User.findOne({ where: { username } });
        
        if (!user) {
            console.error(`\n❌ User "${username}" not found.\n`);
            console.log('Available users:');
            const allUsers = await User.findAll({ attributes: ['username', 'email', 'role'] });
            allUsers.forEach(u => console.log(`  - ${u.username} (${u.email}) [${u.role}]`));
            process.exit(1);
        }
        
        if (user.role === 'admin') {
            console.log(`\n✅ User "${username}" is already an admin.\n`);
            process.exit(0);
        }

        user.role = 'admin';
        await user.save();
        
        console.log(`\n🎉 SUCCESS: "${username}" has been promoted to admin!`);
        console.log(`   Access the admin panel at: http://localhost:${process.env.PORT || 3000}/admin\n`);
        process.exit(0);
    } catch (err) {
        console.error('\n❌ Database connection failed:', err.message);
        console.error('Make sure PostgreSQL is running and .env is configured.\n');
        process.exit(1);
    }
})();
