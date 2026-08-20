const isAuthenticated = (req, res, next) => {
    // Kiểm tra xem trong session đã tồn tại thông tin user chưa
    if (req.session && req.session.user) {
        return next(); // Đã đăng nhập -> Cho phép đi tiếp vào route tiếp theo
    }

    // Nếu chưa đăng nhập -> Chuyển hướng về trang đăng nhập
    return res.redirect('/auth/login');
};

module.exports = { isAuthenticated };