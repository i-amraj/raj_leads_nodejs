const mysql = require('mysql2/promise');

const creds = [
    { user: 'root', password: '' },
    { user: 'root', password: 'password' },
    { user: 'root', password: 'root' },
    { user: 'ubuntu', password: '' },
    { user: 'ubuntu', password: 'ubuntu' },
    { user: 'admin', password: 'password' },
];

(async () => {
    console.log("🔍 Probing database credentials...");
    for (const c of creds) {
        try {
            const conn = await mysql.createConnection({
                host: 'localhost',
                user: c.user,
                password: c.password
            });
            console.log(`✅ SUCCESS! User: '${c.user}', Password: '${c.password}'`);
            await conn.end();
            process.exit(0);
        } catch (e) {
            console.log(`❌ Failed: User: '${c.user}', Password: '${c.password}' (${e.code})`);
        }
    }
    console.log("⚠️ No working credentials found in common list.");
})();
