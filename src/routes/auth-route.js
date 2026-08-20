const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth-controller');
const { isAuthenticated } = require('../middlewares/auth-middleware');

// Đăng nhập
router.get('/login', authController.getLogin);
router.post('/login', authController.postLogin);

// Chuyển đổi vai trò
router.get('/switch-role/:role', isAuthenticated, authController.switchRole); // (Giữ nguyên middleware kiểm tra của bạn)

// Đăng xuất
router.get('/logout', authController.logout);

// Đổi mật khẩu
router.get('/change-password', authController.getChangePassword);
router.post('/change-password', authController.postChangePassword);

// Quên mật khẩu
router.get('/forgot-password', authController.getForgotPassword);

module.exports = router;