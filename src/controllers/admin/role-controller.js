const UserModel = require('../../models/admin/user-model');
const { getBaseData } = require('../../utils/admin-helper');
const { logAction } = require('../../utils/logger');

// 1. Hiển thị trang phân quyền
exports.getRolesPage = async (req, res) => {
    try {
        // Lấy danh sách đã được sắp xếp chung một mảng
        const users = await UserModel.getUsersWithRolesSorted();

        res.render('admin/roles', {
            ...getBaseData(req, 'Quản Lý Phân Quyền'),
            users, // Trả về mảng users duy nhất
            success: req.query.success
        });
    } catch (error) {
        console.error('❌ Lỗi tải trang phân quyền:', error);
        res.status(500).send('Lỗi máy chủ');
    }
};

// 2. Hàm cập nhật quyền cho Giáo lý viên
exports.updateUserRoles = async (req, res) => {
    // Khai báo id_glv ở ngoài try để khối catch vẫn có thể truy cập được
    const { id_glv } = req.params;

    try {
        const { is_admin, is_bdh, is_truong_khoi } = req.body;

        await UserModel.updateGlvRoles(id_glv, {
            isAdmin: !!is_admin,
            isBdh: !!is_bdh,
            isTruongKhoi: !!is_truong_khoi
        });

        // --- GHI AUDIT LOG: Cập nhật quyền THÀNH CÔNG ---
        await logAction(req, `Cập nhật quyền hệ thống cho giáo lý viên (ID_GLV: ${id_glv})`, 'Thành công');

        return res.redirect('/admin/roles?success=' + encodeURIComponent('Cập nhật quyền thành công!'));
    } catch (error) {
        console.error('❌ Lỗi cập nhật quyền:', error);

        // --- GHI AUDIT LOG: Cập nhật quyền THẤT BẠI ---
        await logAction(req, `Cập nhật quyền hệ thống cho giáo lý viên (ID_GLV: ${id_glv}) thất bại`, 'Thất bại');

        return res.redirect('/admin/roles?success=' + encodeURIComponent('Có lỗi xảy ra khi cập nhật!'));
    }
};