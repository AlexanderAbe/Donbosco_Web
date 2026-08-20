const UserModel = require('../../models/admin/user-model');
const AuthModel = require('../../models/auth-model');
const { getBaseData } = require('../../utils/admin-helper');

exports.getUsers = async (req, res) => {
    try {
        const searchQuery = req.query.search; 
        let allUsers;

        // Nếu có từ khóa thì gọi Model tìm kiếm, không thì lấy tất cả
        if (searchQuery && searchQuery.trim() !== '') {
            allUsers = await UserModel.searchUsers(searchQuery.trim());
        } else {
            allUsers = await UserModel.getAllUsers();
        }

        // Dùng Promise.all để quét và check đầy đủ các role cho từng user
        allUsers = await Promise.all(allUsers.map(async (user) => {
            let roles = [];

            // 1. Nếu có liên kết GLV thì chắc chắn là Giáo lý viên
            if (user.id_glv) {
                roles.push('Giáo lý viên');

                // 2. Kiểm tra xem có nằm trong Ban Điều Hành không
                const isBdh = await AuthModel.checkBdh(user.id_glv);
                if (isBdh) {
                    roles.push('Ban Điều Hành');
                }

                // 3. Kiểm tra xem có phải Trưởng Khối không
                const isTruongKhoi = await AuthModel.checkTruongKhoi(user.id_glv);
                if (isTruongKhoi) {
                    roles.push('Trưởng Khối');
                }
            }

            // 4. Kiểm tra quyền Admin
            if (user.is_admin) {
                roles.push('Quản trị viên');
            }

            // Phòng hờ nếu tài khoản trống
            if (roles.length === 0) {
                roles.push('Tài khoản hệ thống');
            }

            return {
                ...user,
                roles: roles
            };
        }));

        // Tách danh sách thành 2 nhóm khớp với 2 bảng trong users.ejs của bạn
        const activeUsers = allUsers.filter(user => user.trang_thai === 'Đang hoạt động');
        const lockedUsers = allUsers.filter(user => user.trang_thai === 'Đã khóa');

        res.render('admin/users', { 
            ...getBaseData(req, 'Quản Lý Người Dùng'),
            activeUsers, 
            lockedUsers, 
            searchQuery: searchQuery || ''
        });
    } catch (error) {
        console.error('❌ Lỗi trang quản lý user:', error);
        res.status(500).send('Lỗi máy chủ');
    }
};

// Hiển thị trang đổi mật khẩu cho user cụ thể
exports.resetPasswordView = async (req, res) => {
    try {
        const userId = req.params.id;
        // Lấy thông tin user để hiển thị tên
        const user = await UserModel.getUserById(userId); 
        res.render('admin/reset-password', { 
            ...getBaseData(req, 'Đổi mật khẩu người dùng'), 
            targetUser: user
        });
    } catch (error) {
        console.error('❌ Lỗi tải trang đổi mật khẩu:', error);
        res.status(500).send('Lỗi máy chủ');
    }
};

// Xử lý logic đổi mật khẩu (POST)
exports.postResetPassword = async (req, res) => {
    try {
        const { newPassword } = req.body;
        const userId = req.params.id;
        await UserModel.updatePassword(userId, newPassword);
        res.redirect('/admin/users'); // Quay về trang danh sách
    } catch (error) {
        console.error('❌ Lỗi xử lý đổi mật khẩu:', error);
        res.status(500).send('Lỗi máy chủ');
    }
};

// 1. Khóa tài khoản ngay lập tức
exports.lockUser = async (req, res) => {
    try {
        const userId = req.params.id;
        await UserModel.updateUserStatus(userId, 'Đã khóa');
        res.redirect('/admin/users');
    } catch (error) {
        console.error('Lỗi khóa tài khoản:', error);
        res.status(500).send('Lỗi máy chủ');
    }
};

// 2. Mở khóa tài khoản ngay lập tức
exports.unlockUser = async (req, res) => {
    try {
        const userId = req.params.id;
        await UserModel.updateUserStatus(userId, 'Đang hoạt động');
        res.redirect('/admin/users');
    } catch (error) {
        console.error('Lỗi mở khóa tài khoản:', error);
        res.status(500).send('Lỗi máy chủ');
    }
};