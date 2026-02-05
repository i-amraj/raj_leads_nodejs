const mysql = require('mysql2/promise');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function setup() {
    try {
        // Connect without database selected to create it
        const connectionConfig = {
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        };
        if (process.env.DB_SOCKET) {
            connectionConfig.socketPath = process.env.DB_SOCKET;
        } else {
            connectionConfig.host = process.env.DB_HOST;
            connectionConfig.port = process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined;
        }

        const connection = await mysql.createConnection(connectionConfig);

        console.log('🔌 Connected to MySQL server...');

        const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        const statements = schema.split(';').filter(s => s.trim());

        for (const statement of statements) {
            if (statement.trim()) {
                await connection.query(statement);
                console.log('✅ Executed: ' + statement.substring(0, 50) + '...');
            }
        }

        console.log('🎉 Database setup complete!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Setup failed:', err);
        process.exit(1);
    }
}

setup();
