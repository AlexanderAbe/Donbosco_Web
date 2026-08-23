const glvController = {
    async getDashboard(req, res) {
        try {
            // Tạm thời trả về thông báo hoặc render trang trống
            res.render('glv/dashboard', {
                title: 'Dashboard Giáo Lý Viên',
                user: req.session.user // Nếu hệ thống của bạn có lưu thông tin user đăng nhập
            });
        } catch (error) {
            console.error('❌ Lỗi:', error);
            res.status(500).send('Lỗi Server');
        }
    }
};

module.exports = glvController;