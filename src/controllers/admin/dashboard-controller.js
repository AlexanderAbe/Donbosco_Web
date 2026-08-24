const DashboardModel = require('../../models/admin/dashboard-model');
const LogModel = require('../../models/admin/logs-model');
const { getAdminBaseData } = require('../../utils/base-data-helper');

exports.getDashboard = async (req, res) => {
    try {
        const [stats, recentLogs] = await Promise.all([
            DashboardModel.getDashboardStats(),
            LogModel.getRecentLogs(5)
        ]);

        res.render('admin/dashboard', { 
            ...getAdminBaseData(req, 'Quản Trị Hệ Thống'),
            stats, 
            recentLogs 
        });
    } catch (error) {
        console.error('Lỗi Dashboard:', error);
        res.status(500).send('Lỗi máy chủ');
    }
};

exports.getAllLogs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const fromDate = req.query.from || '';
        const toDate = req.query.to || '';
        const search = (req.query.search || '').trim();

        // Tự động nhận diện thiết bị: 20 bản ghi cho mobile, 50 bản ghi cho PC (nếu chưa chọn limit cụ thể)
        let limit = parseInt(req.query.limit);
        if (!limit) {
            const ua = req.headers['user-agent'] || '';
            const isMobile = /mobile|android|iphone|ipad/i.test(ua);
            limit = isMobile ? 20 : 50;
        }

        // Gọi model lấy dữ liệu đã phân trang và lọc theo ngày/người thực hiện
        const result = await LogModel.getLogsWithPagination(page, limit, fromDate, toDate, search);

        res.render('admin/logs', { 
            ...getAdminBaseData(req, 'Nhật ký hệ thống'),
            logs: result.logs,
            currentPage: page,
            totalPages: result.totalPages,
            limit: limit,
            fromDate: fromDate,
            toDate: toDate,
            search: search,
            success: req.query.success || null,
            error: req.query.error || null
        });
    } catch (error) {
        console.error('Lỗi trang Logs:', error);
        res.status(500).send('Lỗi máy chủ');
    }
};

exports.clearAllLogs = async (req, res) => {
    try {
        await LogModel.clearAllLogs();
        return res.redirect('/admin/logs?success=' + encodeURIComponent('Đã xóa toàn bộ nhật ký hoạt động.'));
    } catch (error) {
        console.error('Lỗi xóa toàn bộ logs:', error);
        return res.redirect('/admin/logs?error=' + encodeURIComponent('Không thể xóa nhật ký hoạt động.'));
    }
};