// src/routes/truong-khoi-route.js
const express = require('express');
const router = express.Router();
const truongKhoiController = require('../controllers/truong-Khoi-controller');
const { isAuthenticated } = require('../middlewares/auth-middleware');
const { checkRole } = require('../middlewares/role-middleware');

// Bảo vệ toàn bộ các route con bên trong /truong-khoi (Chỉ tài khoản có quyền truong-khoi mới truy cập được)
router.use(isAuthenticated, checkRole('truong-khoi'));

// Định nghĩa các đường dẫn gọi qua Controller tương ứng
router.get('/', truongKhoiController.getDashboard);
router.get('/dashboard', truongKhoiController.getDashboard);
router.get('/lop', truongKhoiController.getLop);
router.get('/phan-cong-glv', truongKhoiController.getPhanCongGlv);
router.get('/kiem-tra', truongKhoiController.getKiemTra);
router.get('/diem-danh', truongKhoiController.getDiemDanh);
router.get('/change-password', truongKhoiController.getChangePassword);

module.exports = router;