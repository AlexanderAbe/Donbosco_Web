const express = require('express');
const router = express.Router();
const bdhController = require('../controllers/bdh-controller');
const { isAuthenticated } = require('../middlewares/auth-middleware');
const { checkRole } = require('../middlewares/role-middleware');

// Bảo vệ toàn bộ các route con bên trong /bdh (Chỉ tài khoản có quyền bdh mới truy cập được)
router.use(isAuthenticated, checkRole('bdh'));

// Định nghĩa các đường dẫn gọi qua Controller tương ứng
router.get('/', bdhController.getDashboard);
router.get('/dashboard', bdhController.getDashboard);
router.get('/thieu-nhi', bdhController.getThieuNhi);
router.get('/glv', bdhController.getGlv);
router.get('/phan-cong', bdhController.getPhanCong);
router.get('/khoi', bdhController.getKhoi);
router.get('/lop', bdhController.getLop);
router.get('/bang-diem', bdhController.getBangDiem);
router.get('/bang-khen', bdhController.getBangKhen);
router.get('/change-password', bdhController.getChangePassword);

module.exports = router;