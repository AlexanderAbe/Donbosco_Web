const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const session = require('express-session');
require('dotenv').config();
require('./config/database');

const app = express();
const PORT = 3000;

// Cấu hình cơ bản
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Session
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 30 * 60 * 1000 // Tăng lên 30 phút cho thoải mái sử dụng
    } 
}));

// Truyền session và flash message vào view
app.use((req, res, next) => {
    res.locals.session = req.session; 
    res.locals.success = req.session.successMessage;
    delete req.session.successMessage;
    next();
});

// View Engine & Layouts
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/glv-layout');

// Routes
app.use('/auth', require('./src/routes/auth-route'));
app.use('/admin', require('./src/routes/admin-route'));
app.use('/bdh', require('./src/routes/bdh-route'));
//app.use('/truong-khoi', require('./src/routes/truong-khoi-route'));
app.use('/glv', require('./src/routes/glv-route'));

// Trang chủ chuyển hướng về đăng nhập
app.get('/', (req, res) => {
    res.redirect('/auth/login');
});

// Khởi động Server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});