const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/glv/dashboard-controller');
const danhSachLopController = require('../controllers/glv/danh-sach-lop-controller');
const bangDiemController = require('../controllers/glv/bang-diem-controller');
const kiemTraController = require('../controllers/glv/kiem-tra-controller');
const kyLuatController = require('../controllers/glv/ky-luat-controller');
const diemDanhController = require('../controllers/glv/diem-danh-controller');
const profileController = require('../controllers/glv/profile-controller'); // Khai báo controller profile của bạn
const { isAuthenticated } = require('../middlewares/auth-middleware');
const { checkRole } = require('../middlewares/role-middleware');

// Bảo vệ toàn bộ các route con bên trong /glv (Chỉ tài khoản đang active role là glv mới truy cập được)
router.use(isAuthenticated, checkRole('glv'));

// Dashboard
router.get(['/', '/dashboard'], dashboardController.getDashboard);

// Hồ sơ cá nhân
router.get('/profile', profileController.getProfile);
router.post('/profile/update', profileController.updateProfile);

// Danh sách lớp
router.get('/danh-sach-lop', danhSachLopController.getDanhSachLop);
router.get('/danh-sach-lop/:id/detail', danhSachLopController.getStudentDetail);
router.post('/danh-sach-lop/:id/update', danhSachLopController.updateStudent);
router.post('/danh-sach-lop/:id/status', danhSachLopController.updateStudentStatus);

// Bảng điểm
router.get('/bang-diem', bangDiemController.getBangDiem);
router.get('/bang-diem/realtime-data', bangDiemController.getRealtimeScores);
router.post('/bang-diem/print-history', bangDiemController.getStudentPrintHistories);
router.post('/bang-diem/:id/update-result', bangDiemController.updateResult);

// Kiểm tra
router.get('/kiem-tra', kiemTraController.getKiemTra);
router.post('/kiem-tra/print-data', kiemTraController.getExamScoresForPrint);
router.post('/kiem-tra/save', kiemTraController.saveKiemTra);
router.post('/kiem-tra/entry-save', kiemTraController.saveExamScoreEntry);

// Kỷ luật
router.get('/ky-luat', kyLuatController.getKyLuat);
router.post('/ky-luat/print-data', kyLuatController.getDisciplineScoresForPrint);
router.post('/ky-luat/save', kyLuatController.saveKyLuat);
router.post('/ky-luat/entry-save', kyLuatController.saveDisciplineScoreEntry);

// Điểm danh
router.get('/diem-danh', diemDanhController.getDiemDanh);
router.get('/diem-danh/qr', diemDanhController.getQrDiemDanh);
router.post('/diem-danh/print-data', diemDanhController.getMonthlyAttendanceForPrint);
router.post('/diem-danh/save', diemDanhController.saveDiemDanh);
router.post('/diem-danh/qr/save', diemDanhController.saveQrDiemDanh);
router.post('/diem-danh/entry-save', diemDanhController.saveAttendanceEntry);
router.post('/diem-danh/scan', diemDanhController.scanDiemDanh);

module.exports = router;