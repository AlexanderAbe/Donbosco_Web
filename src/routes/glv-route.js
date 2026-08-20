// src/routes/glv-route.js
const express = require('express');
const router = express.Router();
const glvController = require('../controllers/glv-controller');
const { isAuthenticated } = require('../middlewares/auth-middleware');
const { checkRole } = require('../middlewares/role-middleware');

// Bảo vệ toàn bộ các route con bên trong /glv (Chỉ tài khoản đang active role là glv mới truy cập được)
router.use(isAuthenticated, checkRole('glv'));

// Định nghĩa các đường dẫn gọi qua Controller tương ứng
router.get('/', glvController.getDashboard);
router.get('/dashboard', glvController.getDashboard);
router.get('/danh-sach-lop', glvController.getDanhSachLop);
router.get('/bang-diem', glvController.getBangDiem);
router.get('/kiem-tra', glvController.getKiemTra);
router.get('/diem-danh', glvController.getDiemDanh);
router.get('/ky-luat', glvController.getKyLuat);
router.get('/change-password', glvController.getChangePassword);

module.exports = router;