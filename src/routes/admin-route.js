const express = require('express');
const multer = require('multer');
const router = express.Router();

// Import các controller con
const dashboardController = require('../controllers/admin/dashboard-controller');
const userController = require('../controllers/admin/user-controller');
const roleController = require('../controllers/admin/role-controller');
const scoreImportController = require('../controllers/admin/score-import-controller');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
});
const uploadScoreWorkbook = (req, res, next) => upload.single('file')(req, res, error => {
    if (error instanceof multer.MulterError) {
        const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
        const message = error.code === 'LIMIT_FILE_SIZE'
            ? 'File Excel không được vượt quá 5 MB.'
            : 'Không thể nhận file Excel đã tải lên.';
        return res.status(status).send(message);
    }
    if (error) return next(error);
    return next();
});

// Middleware bảo vệ
const { isAuthenticated } = require('../middlewares/auth-middleware');
const { checkRole } = require('../middlewares/role-middleware');

router.use(isAuthenticated, checkRole('admin'));

// Route Dashboard & Logs
router.get(['/', '/dashboard'], dashboardController.getDashboard);
router.get('/logs', dashboardController.getAllLogs);
router.post('/logs/clear', dashboardController.clearAllLogs);

// Route User
router.get('/users', userController.getUsers);
router.post('/users/lock/:id', userController.lockUser);
router.post('/users/unlock/:id', userController.unlockUser);
router.get('/users/reset-password/:id', userController.resetPasswordView);
router.post('/users/reset-password/:id', userController.postResetPassword);

// Route Role
router.get('/roles', roleController.getRolesPage);
router.post('/roles/update/:id_glv', roleController.updateUserRoles);

// Import điểm
router.get('/score-import', scoreImportController.getPage);
router.get('/score-import/template', scoreImportController.downloadTemplate);
router.post('/score-import', uploadScoreWorkbook, scoreImportController.importWorkbook);

module.exports = router;