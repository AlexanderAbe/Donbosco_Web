const express = require('express');
const router = express.Router();

// Import các controller con
const dashboardController = require('../controllers/admin/dashboard-controller');
const userController = require('../controllers/admin/user-controller');
const roleController = require('../controllers/admin/role-controller');

// Middleware bảo vệ
const { isAuthenticated } = require('../middlewares/auth-middleware');
const { checkRole } = require('../middlewares/role-middleware');

router.use(isAuthenticated, checkRole('admin'));

// Route Dashboard & Logs
router.get(['/', '/dashboard'], dashboardController.getDashboard);
router.get('/logs', dashboardController.getAllLogs);

// Route User
router.get('/users', userController.getUsers);
router.post('/users/lock/:id', userController.lockUser);
router.post('/users/unlock/:id', userController.unlockUser);
router.get('/users/reset-password/:id', userController.resetPasswordView);
router.post('/users/reset-password/:id', userController.postResetPassword);

// Route Role
router.get('/roles', roleController.getRolesPage);
router.post('/roles/update/:id_glv', roleController.updateUserRoles);

module.exports = router;