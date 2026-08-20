const bcrypt = require('bcrypt');
const AuthModel = require('../models/auth-model');

// Hiển thị trang đăng nhập
exports.getLogin = (req, res) => {
    res.render('login', { layout: false, error: null });
};

// Xử lý logic đăng nhập
exports.postLogin = async (req, res) => {
    const { phone, password } = req.body; 
    
    try {
        const user = await AuthModel.findByUsername(phone);

        if (!user) {
            return res.render('login', { layout: false, error: 'Sai số điện thoại' });
        }

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.render('login', { layout: false, error: 'Sai mật khẩu' });
        }

        if (user.trang_thai === 'Đã khóa') {
            return res.render('login', { 
                layout: false, 
                error: 'Tài khoản của bạn đã bị khóa bởi quản trị viên!' 
            });
        }
        
        let isBdh = false;
        let isTruongKhoi = false;
        const id_glv = user.id_glv;

        if (id_glv) {
            isBdh = await AuthModel.checkBdh(id_glv);
            isTruongKhoi = await AuthModel.checkTruongKhoi(id_glv);
        }

        req.session.user = {
            id_tk: user.id_tk,
            username: user.username,
            ten_thanh: user.ten_thanh,
            ho_va_ten_lot: user.ho_va_ten_lot,
            ten: user.ten,
            is_admin: user.is_admin || false,
            is_bdh: isBdh,
            is_truong_khoi: isTruongKhoi,
            id_glv: id_glv,
            active_role: 'glv'
        };

        return res.redirect('/glv');

    } catch (error) {
        res.status(500).send("Lỗi máy chủ nội bộ");
    }
};

// Chuyển đổi qua lại giữa các giao diện
exports.switchRole = (req, res) => {
    const targetRole = req.params.role;
    const user = req.session.user;

    let canSwitch = false;
    if (targetRole === 'glv') canSwitch = true;
    if (targetRole === 'admin' && user.is_admin) canSwitch = true;
    if (targetRole === 'bdh' && user.is_bdh) canSwitch = true;
    if (targetRole === 'truong-khoi' && user.is_truong_khoi) canSwitch = true;

    if (canSwitch) {
        user.active_role = targetRole;
    }

    if (targetRole === 'admin') return res.redirect('/admin');
    if (targetRole === 'bdh') return res.redirect('/bdh');
    if (targetRole === 'truong-khoi') return res.redirect('/truong-khoi');
    res.redirect('/glv');
};

// Xử lý đăng xuất
exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Không thể đăng xuất, vui lòng thử lại.');
        }
        res.clearCookie('connect.sid');
        return res.redirect('/auth/login');
    });
};

// Hiển thị trang đổi mật khẩu
exports.getChangePassword = (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');
    res.render('change-password', { layout: false, error: null, success: null });
};

// Xử lý logic đổi mật khẩu
exports.postChangePassword = async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');

    const { currentPassword, newPassword, confirmPassword } = req.body;
    const id_tk = req.session.user.id_tk;

    try {
        if (newPassword !== confirmPassword) {
            return res.render('change-password', { 
                layout: false, error: 'Mật khẩu mới và xác nhận mật khẩu không khớp', success: null 
            });
        }

        const user = await AuthModel.findById(id_tk);
        if (!user) return res.status(404).send('Không tìm thấy tài khoản');

        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) {
            return res.render('change-password', { 
                layout: false, error: 'Mật khẩu hiện tại không chính xác', success: null 
            });
        }

        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        await AuthModel.updatePassword(id_tk, newPasswordHash);

        req.session.successMessage = 'Đổi mật khẩu thành công!';

        req.session.save(() => {
            if (req.session.user.is_admin) return res.redirect('/admin');
            if (req.session.user.is_bdh) return res.redirect('/bdh');
            if (req.session.user.is_truong_khoi) return res.redirect('/truong-khoi');
            return res.redirect('/glv');
        });

    } catch (error) {
        res.render('change-password', { 
            layout: false, error: 'Lỗi máy chủ nội bộ, vui lòng thử lại sau', success: null 
        });
    }
};

// Hiển thị giao diện Quên mật khẩu với danh sách Admin
exports.getForgotPassword = async (req, res) => {
    try {
        const adminList = await AuthModel.getAdminContacts();
        
        res.render('forgot-password', { 
            layout: false, 
            adminList: adminList, 
            error: null,
            success: null 
        });
    } catch (error) {
        res.render('forgot-password', { 
            layout: false, 
            adminList: [],
            error: null,
            success: null
        });
    }
};