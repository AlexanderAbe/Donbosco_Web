/**
 * Hàm tạo dữ liệu cơ bản cho trang Admin
 */
const getAdminBaseData = (req, title) => ({
    title: `${title} - Xứ Đoàn Don Bosco`,
    layout: 'layouts/admin-layout',
    user: req.session.user
});

/**
 * Hàm tạo dữ liệu cơ bản cho trang Ban Điều Hành (BDH)
 */
const getBdhBaseData = (req, title) => ({
    title: `${title} - Xứ Đoàn Don Bosco`,
    layout: 'layouts/bdh-layout',
    user: req.session.user
});

/**
 * Hàm tạo dữ liệu cơ bản cho trang Giáo Lý Viên (GLV)
 */
const getGlvBaseData = (req, title) => ({
    title: `${title} - Xứ Đoàn Don Bosco`,
    layout: 'layouts/glv-layout',
    user: req.session.user
});

/**
 * Hàm tạo dữ liệu cơ bản cho trang Trưởng Khối
 */
const getTruongKhoiBaseData = (req, title) => ({
    title: `${title} - Xứ Đoàn Don Bosco`,
    layout: 'layouts/truong-khoi-layout',
    user: req.session.user
});

module.exports = { 
    getAdminBaseData, 
    getBdhBaseData,
    getGlvBaseData,
    getTruongKhoiBaseData
};