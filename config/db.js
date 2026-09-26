const mysql = require('mysql2/promise')
const dotenv = require('dotenv')

dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
    }
});

(async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Successfully connected to the MySQL database.')
        connection.release()
    } catch (error) {
        console.log('❌ Database connection failed:', error.message)
    }
})();

module.exports = pool;