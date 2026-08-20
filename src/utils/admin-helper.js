/**
 * Hàm tạo dữ liệu cơ bản cho mọi view Admin
 * @param {Object} req - Request object từ Express
 * @param {String} title - Tiêu đề của trang
 */
const getBaseData = (req, title) => ({
    title: `${title} - Xứ Đoàn Don Bosco`,
    layout: 'layouts/admin-layout',
    user: req.session.user
});

module.exports = { getBaseData };