const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');

// Tạo một pool kết nối riêng cho session sử dụng biến môi trường DATABASE_URL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Cần thiết khi kết nối với Supabase qua Cloud
    }
});

module.exports = session({
    store: new pgSession({
        pool: pool,
        tableName: 'session',
        createTableIfMissing: true,
        pruneSessionInterval: false
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: { 
        maxAge: 30 * 60 * 1000, // 30 phút
        secure: true, 
        httpOnly: true,
        sameSite: 'lax',
        domain: 'thieunhitanthaison.com'
    } 
});