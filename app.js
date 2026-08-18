const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
require('dotenv').config(); // Đọc file .env
const { Pool } = require('pg'); // Import thư viện pg

const app = express();
const PORT = 3000;

// Cấu hình kết nối PostgreSQL (Supabase)
const pool = new Pool({
  connectionString: `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: { rejectUnauthorized: false } // Bắt buộc khi kết nối Supabase từ bên ngoài
});

// Test nhanh kết nối cơ sở dữ liệu khi khởi động server
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Lỗi kết nối Supabase:', err.message);
  } else {
    console.log('✅ Kết nối Supabase thành công! Thời gian server:', res.rows[0].now);
  }
});

// 1. Middleware đọc dữ liệu gửi từ Form (bắt buộc để lấy SĐT và Mật khẩu từ POST)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 2. Cấu hình EJS & Layouts
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'Views'));
app.use(expressLayouts);
app.set('layout', 'layouts/GLVLayout');

// 3. Cấu hình thư mục chứa CSS, JS, Ảnh (public)
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// ROUTE TRANG LOGIN
// ==========================================

// 1. Hiển thị giao diện Đăng nhập ({ layout: false } để tắt Header chung)
app.get('/login', (req, res) => {
    res.render('login', { layout: false });
});

// 2. Xử lý khi người dùng bấm nút "Đăng nhập"
app.post('/login', async (req, res) => {
    const { phone, password } = req.body;
    
    console.log(`👉 Đang thử đăng nhập với SĐT: ${phone} | Mật khẩu: ${password}`);

    try {
        // Sau này bạn có thể query trực tiếp Supabase tại đây thế này:
        // const result = await pool.query('SELECT * FROM thieu_nhi WHERE phone = $1', [phone]);
        
        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.status(500).send("Lỗi truy vấn cơ sở dữ liệu");
    }
});

// ==========================================
// CÁC ROUTE NỘI BỘ (Có sử dụng MasterLayout)
// ==========================================

app.get('/', (req, res) => {
    res.render('glv/nhap_diem', { 
        title: 'Trang Chủ - Nhập Điểm' 
    });
});

// Khởi động Server
app.listen(PORT, () => {
    console.log(`Server đang chạy tại: http://localhost:${PORT}`);
});