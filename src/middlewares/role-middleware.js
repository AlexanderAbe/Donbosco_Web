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

        // 2. Kiểm tra xem active_role hiện tại có khớp với trang yêu cầu không
        if (user.active_role === requiredRole) {
            return next(); // Đúng vai trò -> Cho phép truy cập
        }

        // 3. Nếu không khớp, hiển thị thông báo lỗi thân thiện kèm hướng dẫn dùng nút Switch
        return res.status(403).send(`
            <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px; padding: 20px;">
                <h2 style="color: #d9534f;">⚠️ Truy cập bị từ chối</h2>
                <p>Bạn đang đứng ở giao diện <b>${user.active_role.toUpperCase()}</b> nên không có quyền truy cập trang này.</p>
                <p>Vui lòng bấm nút <b>Switch</b> trên header để chuyển đổi sang đúng giao diện!</p>
                <br>
                <a href="/auth/switch-role/glv" style="background: #0275d8; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Quay về giao diện GLV</a>
            </div>
        `);
    };
};

module.exports = { checkRole };