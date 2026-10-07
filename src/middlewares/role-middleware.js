/**
 * Middleware kiểm tra active_role hiện tại của người dùng có khớp với quyền yêu cầu hay không
 * @param {String} requiredRole - Vai trò bắt buộc ('admin', 'bdh', 'truong-khoi', 'glv')
 */
const checkRole = (requiredRole) => {
    return (req, res, next) => {
        // 1. Kiểm tra xem đã đăng nhập chưa
        if (!req.session || !req.session.user) {
            return res.redirect('/auth/login');
        }

        const user = req.session.user;

        // 2. Kiểm tra role sau khi chuẩn hóa để tránh lỗi hoa/thường hoặc khoảng trắng trong session
        const activeRole = String(user.active_role || '').trim().toLowerCase();
        const normalizedRequiredRole = String(requiredRole).trim().toLowerCase();
        if (activeRole === normalizedRequiredRole) {
            return next(); // Đúng vai trò -> Cho phép truy cập
        }

        // 3. Nếu không khớp, hiển thị thông báo lỗi thân thiện kèm hướng dẫn dùng nút Switch
        return res.status(403).render('access-denied', {
            layout: false,
            user: user
        });
    };
};

module.exports = { checkRole };