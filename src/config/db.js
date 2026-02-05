const mysql = require('mysql2');
require('dotenv').config();

const config = {
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'raj_leads',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

if (process.env.DB_SOCKET) {
    config.socketPath = process.env.DB_SOCKET;
} else {
    config.host = process.env.DB_HOST || 'localhost';
    config.port = Number(process.env.DB_PORT || 3306);
}

const pool = mysql.createPool(config);

const promisePool = pool.promise();

module.exports = promisePool;
