const UserModel = require('../../models/admin/user-model');
const AuthModel = require('../../models/auth-model');
const { getAdminBaseData } = require('../../utils/base-data-helper');
const { logAction } = require('../../utils/logger'); // Import helper ghi log

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
            ...getAdminBaseData(req, 'Quản Lý Người Dùng'),
            activeUsers, 
            lockedUsers, 
            searchQuery: searchQuery || ''
        });
    } catch (error) {
        console.error('❌ Lỗi trang quản lý user:', error);
        res.status(500).send('Lỗi máy chủ');
    }
};

// Hiển thị trang đổi mật khẩu người dùng
exports.resetPasswordView = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await UserModel.getUserById(userId); 
        res.render('admin/reset-password', { 
            ...getAdminBaseData(req, 'Đổi mật khẩu người dùng'), 
            targetUser: user
        });
    } catch (error) {
        console.error('❌ Lỗi tải trang đổi mật khẩu:', error);
        res.status(500).send('Lỗi máy chủ');
    }
};

// Xử lý logic đổi mật khẩu (POST)
exports.postResetPassword = async (req, res) => {
    const userId = req.params.id; // Đã nằm ngoài try, an toàn cho cả catch

    try {
        const { newPassword } = req.body;
        
        // Cập nhật mật khẩu trong DB
        await UserModel.updatePassword(userId, newPassword);

        // --- GHI AUDIT LOG: Thành công ---
        await logAction(req, `Đặt lại mật khẩu cho tài khoản (ID: ${userId})`, 'Thành công');

        // Lấy lại thông tin user để render lại trang kèm toast thành công
        const user = await UserModel.getUserById(userId); 
        
        return res.render('admin/reset-password', { 
            ...getAdminBaseData(req, 'Đổi mật khẩu người dùng'), 
            targetUser: user,
            success: 'Đổi mật khẩu thành công cho người dùng!'
        });

    } catch (error) {
        console.error('❌ Lỗi xử lý đổi mật khẩu:', error);
        
        // --- GHI AUDIT LOG: Thất bại ---
        await logAction(req, `Đặt lại mật khẩu cho tài khoản thất bại (ID: ${userId})`, 'Thất bại');

        // Lấy lại thông tin user để khi render lỗi giao diện không bị mất dữ liệu
        const user = await UserModel.getUserById(userId).catch(() => null);

        return res.render('admin/reset-password', { 
            ...getAdminBaseData(req, 'Đổi mật khẩu người dùng'), 
            targetUser: user,
            error: 'Đã xảy ra lỗi máy chủ khi đổi mật khẩu!'
        });
    }
};

// 1. Khóa tài khoản ngay lập tức
exports.lockUser = async (req, res) => {
    const userId = req.params.id; // Đưa ra ngoài try để catch đọc được

    try {
        await UserModel.updateUserStatus(userId, 'Đã khóa');

        // --- GHI AUDIT LOG: Thành công ---
        await logAction(req, `Khóa tài khoản người dùng (ID: ${userId})`, 'Thành công');

        return res.redirect('/admin/users');
    } catch (error) {
        console.error('Lỗi khóa tài khoản:', error);

        // --- GHI AUDIT LOG: Thất bại ---
        await logAction(req, `Khóa tài khoản người dùng thất bại (ID: ${userId})`, 'Thất bại');

        return res.status(500).send('Lỗi máy chủ');
    }
};

// 2. Mở khóa tài khoản ngay lập tức
exports.unlockUser = async (req, res) => {
    const userId = req.params.id; // Đưa ra ngoài try để catch đọc được

    try {
        await UserModel.updateUserStatus(userId, 'Đang hoạt động');

        // --- GHI AUDIT LOG: Thành công ---
        await logAction(req, `Mở khóa tài khoản người dùng (ID: ${userId})`, 'Thành công');

        return res.redirect('/admin/users');
    } catch (error) {
        console.error('Lỗi mở khóa tài khoản:', error);

        // --- GHI AUDIT LOG: Thất bại ---
        await logAction(req, `Mở khóa tài khoản người dùng thất bại (ID: ${userId})`, 'Thất bại');

        return res.status(500).send('Lỗi máy chủ');
    }
};