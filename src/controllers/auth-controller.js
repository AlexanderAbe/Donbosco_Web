const bcrypt = require('bcrypt');
const AuthModel = require('../models/auth-model');
const { logAction } = require('../utils/logger');

// Hiển thị trang đăng nhập
exports.getLogin = (req, res) => {
    res.render('login', { layout: false, error: null });
};

// Xử lý logic đăng nhập
exports.postLogin = async (req, res) => {
    const { phone, password } = req.body; 
    
    try {
        const user = await AuthModel.findByUsername(phone);

        // 1. Không tìm thấy số điện thoại -> Ghi log thất bại (id_tk là NULL / Vãng lai)
        if (!user) {
            await logAction(req, `Đăng nhập thất bại (Không tồn tại SĐT: ${phone})`, 'Thất bại', null);
            return res.render('login', { layout: false, error: 'Sai số điện thoại' });
        }

        const match = await bcrypt.compare(password, user.password_hash);
        
        // 2. Sai mật khẩu -> Ghi log thất bại kèm id_tk của người dùng
        if (!match) {
            await logAction(req, 'Đăng nhập thất bại (Sai mật khẩu)', 'Thất bại', user.id_tk);
            return res.render('login', { layout: false, error: 'Sai mật khẩu' });
        }

        // 3. Tài khoản bị khóa -> Ghi log thất bại kèm id_tk của người dùng
        if (user.trang_thai === 'Đã khóa') {
            await logAction(req, 'Đăng nhập thất bại (Tài khoản đã bị khóa)', 'Thất bại', user.id_tk);
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

        // 4. Đăng nhập thành công -> Ghi log thành công
        await logAction(req, 'Đăng nhập vào hệ thống', 'Thành công', user.id_tk);

        return res.redirect('/glv');

    } catch (error) {
        console.error('Lỗi đăng nhập:', error);
        res.status(500).send("Lỗi máy chủ nội bộ");
    }
};

// Chuyển đổi qua lại giữa các giao diện
exports.switchRole = async (req, res) => {
    const targetRole = req.params.role;
    const user = req.session.user;

    // Quyền có thể được thay đổi trong lúc session vẫn còn hiệu lực.
    if (user.id_glv) {
        user.is_bdh = await AuthModel.checkBdh(user.id_glv);
        user.is_truong_khoi = await AuthModel.checkTruongKhoi(user.id_glv);
    }

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
exports.logout = async (req, res) => {
    try {
        if (req.session && req.session.user) {
            await logAction(req, 'Đăng xuất khỏi hệ thống', 'Thành công');
        }
    } catch (err) {
        console.error('Lỗi ghi log đăng xuất:', err);
    }

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
            // --- BỔ SUNG LOG THẤT BẠI: Mật khẩu không khớp ---
            await logAction(req, 'Thay đổi mật khẩu thất bại (Mật khẩu mới không khớp)', 'Thất bại', id_tk);
            
            return res.render('change-password', { 
                layout: false, error: 'Mật khẩu mới và xác nhận mật khẩu không khớp', success: null 
            });
        }

        const user = await AuthModel.findById(id_tk);
        if (!user) {
            await logAction(req, 'Thay đổi mật khẩu thất bại (Không tìm thấy tài khoản)', 'Thất bại', id_tk);
            return res.status(404).send('Không tìm thấy tài khoản');
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) {
            // --- BỔ SUNG LOG THẤT BẠI: Sai mật khẩu hiện tại ---
            await logAction(req, 'Thay đổi mật khẩu thất bại (Sai mật khẩu hiện tại)', 'Thất bại', id_tk);

            return res.render('change-password', { 
                layout: false, error: 'Mật khẩu hiện tại không chính xác', success: null 
            });
        }

        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        await AuthModel.updatePassword(id_tk, newPasswordHash);

        // Ghi log đổi mật khẩu thành công
        await logAction(req, 'Thay đổi mật khẩu tài khoản', 'Thành công', id_tk);

        req.session.successMessage = 'Đổi mật khẩu thành công!';

        req.session.save(() => {
            if (req.session.user.is_admin) return res.redirect('/admin');
            if (req.session.user.is_bdh) return res.redirect('/bdh');
            if (req.session.user.is_truong_khoi) return res.redirect('/truong-khoi');
            return res.redirect('/glv');
        });

    } catch (error) {
        console.error('Lỗi đổi mật khẩu:', error);
        
        // --- BỔ SUNG LOG THẤT BẠI: Lỗi hệ thống bất ngờ ---
        await logAction(req, 'Thay đổi mật khẩu thất bại (Lỗi hệ thống nội bộ)', 'Thất bại', id_tk);

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