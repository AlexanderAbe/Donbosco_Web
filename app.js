const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
require('dotenv').config();
require('./config/database');

// Import Session và Middleware từ thư mục riêng
const sessionMiddleware = require('./config/session');
const flashMiddleware = require('./src/middlewares/flash-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 'loopback');

// Cấu hình cơ bản
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Sử dụng Session và Flash Middleware
app.use(sessionMiddleware);
app.use(flashMiddleware);

// View Engine & Layouts
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/glv-layout');

// Routes
app.use('/auth', require('./src/routes/auth-route'));
app.use('/admin', require('./src/routes/admin-route'));
app.use('/bdh', require('./src/routes/bdh-route'));
app.use('/truong-khoi', require('./src/routes/truong-khoi-route'));
app.use('/glv', require('./src/routes/glv-route'));

// Trang chủ chuyển hướng về đăng nhập
app.get('/', (req, res) => {
    res.redirect('/auth/login');
});

// Khởi động Server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT} (PID: ${process.pid})`);
});