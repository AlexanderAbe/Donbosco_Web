const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Bắt buộc cần có dòng này khi kết nối với Supabase/Cloud DB
    }
});

module.exports = pool;