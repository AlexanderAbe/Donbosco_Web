// src/routes/truong-khoi-route.js
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/truong-khoi/dashboard-controller');
const lopController = require('../controllers/truong-khoi/lop-controller');
const phanCongGlvController = require('../controllers/truong-khoi/phan-cong-glv-controller');
const diemDanhController = require('../controllers/truong-khoi/diem-danh-controller');
const kiemTraController = require('../controllers/truong-khoi/kiem-tra-controller');
const kyLuatController = require('../controllers/truong-khoi/ky-luat-controller');
const authController = require('../controllers/auth-controller');
const { isAuthenticated } = require('../middlewares/auth-middleware');
const { checkRole } = require('../middlewares/role-middleware');

router.use(isAuthenticated, checkRole('truong-khoi'));

// Định nghĩa các đường dẫn gọi qua Controller tương ứng
router.get('/', dashboardController.getDashboard);
router.get('/dashboard', dashboardController.getDashboard);
router.post('/dashboard/sacraments/bulk', dashboardController.createSacramentBulk);
router.get('/dashboard/sacraments/students', dashboardController.getSacramentStudents);
router.get('/lop', lopController.getLop);
router.post('/lop/create', lopController.createStudent);
router.get('/lop/:id/detail', lopController.getStudentDetail);
router.post('/lop/:id/status', lopController.updateStudentStatus);
router.post('/lop/:id/transfer', lopController.transferStudent);
router.get('/phan-cong-glv', phanCongGlvController.getPage);
router.get('/phan-cong-glv/:id/detail', phanCongGlvController.getDetail);
router.post('/phan-cong-glv/assign', phanCongGlvController.assign);
router.get('/kiem-tra', kiemTraController.getPage);
router.get('/diem-danh', diemDanhController.getPage);
router.get('/ky-luat', kyLuatController.getPage);
router.get('/change-password', authController.getChangePassword);

module.exports = router;