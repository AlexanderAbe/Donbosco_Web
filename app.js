const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');

const app = express();
const PORT = 3000;

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
app.post('/login', (req, res) => {
    const { phone, password } = req.body;
    
    // In thông tin nhập ra Terminal để kiểm tra thử
    console.log(`👉 Đang thử đăng nhập với SĐT: ${phone} | Mật khẩu: ${password}`);

    // Sau này sẽ kiểm tra tài khoản trong CSDL tại đây.
    // Tạm thời cho chuyển hướng về trang chủ thành công:
    res.redirect('/');
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