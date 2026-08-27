const express = require('express');
const multer = require('multer');
const router = express.Router();
const DashboardController = require('../controllers/bdh/dashboard-controller');
const KhoiController = require('../controllers/bdh/khoi-controller');
const LopController = require('../controllers/bdh/lop-controller');
const PhanCongController = require('../controllers/bdh/phan-cong-controller');
const GlvController = require('../controllers/bdh/glv-controller');
const ThieuNhiController = require('../controllers/bdh/thieu-nhi-controller');
const weightController = require('../controllers/bdh/weight-controller');
const settingsController = require('../controllers/bdh/settings-controller');
const BangDiemController = require('../controllers/bdh/bang-diem-controller');
const ChuyenGiaoController = require('../controllers/bdh/chuyen-giao-controller');

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 5 * 1024 * 1024 }
});

const { isAuthenticated } = require('../middlewares/auth-middleware');
const { checkRole } = require('../middlewares/role-middleware');

// Bảo vệ toàn bộ các route con bên trong /bdh (Chỉ tài khoản có quyền bdh mới truy cập được)
router.use(isAuthenticated, checkRole('bdh'));

// Định nghĩa các đường dẫn gọi qua Controller tương ứng
router.get(['/', '/dashboard'], DashboardController.getDashboard);

// Quản lý thiếu nhi
router.get('/thieu-nhi', ThieuNhiController.getTrangQuanLy);
router.get('/thieu-nhi/:id/detail', ThieuNhiController.getDetail);
router.post('/thieu-nhi/import', upload.single('file'), ThieuNhiController.importExcel);

// Quản lý khối (Ngành)
router.get('/khoi', KhoiController.getTrangQuanLy);
router.post('/khoi/create', KhoiController.postCreate);
router.post('/khoi/update', KhoiController.postUpdate);
router.post('/khoi/toggle', KhoiController.postToggle);
router.post('/khoi/toggle-sacrament', KhoiController.postToggleSacrament);

// Quản lý lớp học theo niên khóa
router.get('/lop', LopController.getTrangQuanLy);
router.post('/lop/create', LopController.postCreate);
router.post('/lop/update', LopController.postUpdate);

// Phân công GLV theo lớp và Trưởng khối theo niên khóa
router.get('/phan-cong', PhanCongController.getTrangQuanLy);
router.post('/phan-cong/glv', PhanCongController.postAssignGlv);
router.post('/phan-cong/glv/bulk', PhanCongController.postAssignGlvBulk);
router.post('/phan-cong/glv/remove', PhanCongController.postRemoveGlv);
router.post('/phan-cong/truong-khoi', PhanCongController.postAssignTruongKhoi);
router.post('/phan-cong/truong-khoi/remove', PhanCongController.postRemoveTruongKhoi);

// Quản lý giáo lý viên
router.get('/glv', GlvController.getTrangQuanLy);
router.post('/glv/create', GlvController.postCreate);
router.post('/glv/import', upload.single('file'), GlvController.postImport);
router.post('/glv/:id/update', GlvController.postUpdate);
router.post('/glv/:id/status', GlvController.postStatus);

// Route Weight
router.get('/weight', weightController.getWeightPage);
router.post('/weight/save', weightController.saveWeightConfig);

// 1. Route hiển thị trang settings
router.get('/settings', settingsController.getSettingsPage);
router.post('/settings/save', settingsController.saveSettingsConfig);
router.post('/settings/update-year', settingsController.updateYearConfig);

// Bảng điểm tổng kết cuối năm
router.get('/bang-diem', BangDiemController.getBangDiemPage);
router.get('/bang-diem/export', BangDiemController.exportBangDiem);
router.post('/bang-diem/tong-ket', BangDiemController.tongKetDiem);
router.get('/chuyen-giao', ChuyenGiaoController.getPage);
router.post('/chuyen-giao/lock', ChuyenGiaoController.lockYear);
router.post('/chuyen-giao/transfer', ChuyenGiaoController.transferYear);
router.get('/chuyen-giao/export-awards', ChuyenGiaoController.exportAwards);

module.exports = router;