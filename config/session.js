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
        pool: pool,                // Sử dụng pool kết nối PostgreSQL ở trên
        tableName: 'session',      // Tên bảng sẽ tự động tạo trong database của bạn để lưu session
        createTableIfMissing: true, // Tự động tạo bảng 'session' nếu chưa có trong DB
        pruneSessionInterval: false
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 30 * 60 * 1000, // 30 phút
        secure: process.env.NODE_ENV === 'production', // Bật true nếu chạy HTTPS trên VPS (tùy chọn)
        httpOnly: true,
        sameSite: 'lax'
    } 
});