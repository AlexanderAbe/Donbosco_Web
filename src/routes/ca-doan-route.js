const express = require('express');
const router = express.Router();
const AttendanceController = require('../controllers/ca-doan/attendance-controller');
const { isAuthenticated } = require('../middlewares/auth-middleware');
const { checkRole } = require('../middlewares/role-middleware');

router.use(isAuthenticated, checkRole('ca-doan'));

router.get(['/', '/diem-danh'], AttendanceController.getPage);
router.post('/diem-danh/mark', AttendanceController.markPresent);
router.post('/diem-danh/scan', AttendanceController.scanQr);

module.exports = router;
