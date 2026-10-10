const express = require('express');
const http = require('http'); // 1. Thêm module http
const { Server } = require('socket.io'); // 2. Thêm socket.io
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
require('dotenv').config();
require('./config/database');

// Import Session và Middleware từ thư mục riêng
const sessionMiddleware = require('./config/session');
const flashMiddleware = require('./src/middlewares/flash-middleware');

const app = express();
const server = http.createServer(app); // 3. Tạo http server từ express
const io = new Server(server); // 4. Khởi tạo socket.io gắn vào server

const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

// Lưu `io` vào app để các controller/routes có thể gọi sử dụng (ví dụ: phát sự kiện cập nhật điểm)
app.set('io', io);

// Cấu hình cơ bản
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/vendor/html5-qrcode', express.static(path.join(__dirname, 'node_modules', 'html5-qrcode')));
app.use(express.static(path.join(__dirname, 'public')));

// Sử dụng Session và Flash Middleware
app.use(sessionMiddleware);
app.use(flashMiddleware);

// View Engine & Layouts
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/glv-layout');

// --- 5. LẮNG NGHE KẾT NỐI WEBSOCKET ---
io.on('connection', (socket) => {
    console.log('Một client đã kết nối, ID:', socket.id);

    // Lắng nghe sự kiện client join vào phòng học/tháng cụ thể
    socket.on('join_room', (roomName) => {
        socket.join(roomName);
        console.log(`Socket ${socket.id} đã vào phòng: ${roomName}`);
    });

    // (Giữ lại phòng cũ nếu các tính năng khác của bạn đang dùng)
    socket.on('join_class', (classId) => {
        socket.join(`class_${classId}`);
        console.log(`Socket ${socket.id} đã vào phòng: class_${classId}`);
    });

    socket.on('disconnect', () => {
        console.log('Client đã ngắt kết nối:', socket.id);
    });
});

// Routes
app.use('/auth', require('./src/routes/auth-route'));
app.use('/admin', require('./src/routes/admin-route'));
app.use('/bdh', require('./src/routes/bdh-route'));
app.use('/truong-khoi', require('./src/routes/truong-khoi-route'));
app.use('/glv', require('./src/routes/glv-route'));

// Route Sitemap.xml cho SEO Google
app.get('/sitemap.xml', (req, res) => {
    try {
        const urls = [
            { loc: 'https://thieunhitanthaison.com/', priority: '1.0' },
            { loc: 'https://thieunhitanthaison.com/auth/login', priority: '0.8' },
            { loc: 'https://thieunhitanthaison.com/auth/forgot-password', priority: '0.5' }
        ];

        let xml = '<?xml version="1.0" encoding="UTF-8"?>';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
        
        urls.forEach(item => {
            xml += '<url>';
            xml += `<loc>${item.loc}</loc>`;
            xml += `<priority>${item.priority}</priority>`;
            xml += '</url>';
        });
        
        xml += '</urlset>';

        res.header('Content-Type', 'application/xml');
        res.send(xml);
    } catch (err) {
        res.status(500).end();
    }
});

// Trang chủ chuyển hướng về đăng nhập
app.get('/', (req, res) => {
    res.redirect('/auth/login');
});

// --- 6. QUAN TRỌNG: Dùng server.listen thay vì app.listen ---
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT} (PID: ${process.pid})`);
});