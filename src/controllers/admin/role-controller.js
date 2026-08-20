const UserModel = require('../../models/admin/user-model');
const AuthModel = require('../../models/auth-model');
const { getBaseData } = require('../../utils/admin-helper');

// 1. Hiển thị trang phân quyền
exports.getRolesPage = async (req, res) => {
    try {
        let allUsers = await UserModel.getAllUsers();

        const usersWithRoles = await Promise.all(allUsers.map(async (user) => {
            let isBdh = false;
            let isTruongKhoi = false;

            if (user.id_glv) {
                isBdh = await AuthModel.checkBdh(user.id_glv);
                isTruongKhoi = await AuthModel.checkTruongKhoi(user.id_glv);
            }

            return {
                ...user,
                is_admin: user.is_admin || false,
                is_bdh: isBdh,
                is_truong_khoi: isTruongKhoi
            };
        }));

        res.render('admin/roles', {
            ...getBaseData(req, 'Quản Lý Phân Quyền'),
            users: usersWithRoles,
            success: req.query.success // Nhận chuỗi thông báo từ URL để truyền vào toast
        });
    } catch (error) {
        console.error('❌ Lỗi tải trang phân quyền:', error);
        res.status(500).send('Lỗi máy chủ');
    }
};

// 2. Hàm cập nhật quyền cho Giáo lý viên
exports.updateUserRoles = async (req, res) => {
    try {
        const { id_glv } = req.params;
        const { is_admin, is_bdh, is_truong_khoi } = req.body;

        await UserModel.updateGlvRoles(id_glv, {
            isAdmin: !!is_admin,
            isBdh: !!is_bdh,
            isTruongKhoi: !!is_truong_khoi
        });

        // Truyền câu thông báo trực tiếp qua query
        return res.redirect('/admin/roles?success=' + encodeURIComponent('Cập nhật quyền thành công!'));
    } catch (error) {
        console.error('❌ Lỗi cập nhật quyền:', error);
        return res.redirect('/admin/roles?success=' + encodeURIComponent('Có lỗi xảy ra khi cập nhật!'));
    }
};