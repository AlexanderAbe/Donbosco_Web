const AuthModel = require('../models/auth-model');

const isAuthenticated = async (req, res, next) => {
    // Kiểm tra xem trong session đã tồn tại thông tin user chưa
    if (!req.session || !req.session.user) {
        return res.redirect('/auth/login');
    }

    try {
        const sessionUser = req.session.user;
        const user = await AuthModel.findById(sessionUser.id_tk);

        // Tài khoản bị khóa phải mất hiệu lực ngay ở request kế tiếp.
        if (!user || user.trang_thai === 'Đã khóa') {
            return req.session.destroy(() => res.redirect('/auth/login'));
        }

        const isBdh = user.id_glv ? await AuthModel.checkBdh(user.id_glv) : false;
        const isTruongKhoi = user.id_glv ? await AuthModel.checkTruongKhoi(user.id_glv) : false;
        const roles = {
            admin: Boolean(user.is_admin),
            bdh: isBdh,
            'truong-khoi': isTruongKhoi,
            glv: Boolean(user.id_glv)
        };

        Object.assign(sessionUser, {
            username: user.username,
            ten_thanh: user.ten_thanh,
            ho_va_ten_lot: user.ho_va_ten_lot,
            ten: user.ten,
            is_admin: roles.admin,
            is_bdh: roles.bdh,
            is_truong_khoi: roles['truong-khoi'],
            id_glv: user.id_glv
        });

        // Nếu role hiện tại vừa bị gỡ, chuyển về giao diện GLV hợp lệ.
        if (!roles[sessionUser.active_role]) {
            sessionUser.active_role = 'glv';
        }

        return next();
    } catch (error) {
        console.error('Lỗi đồng bộ session người dùng:', error);
        return res.status(500).send('Không thể xác thực tài khoản.');
    }
};

module.exports = { isAuthenticated };