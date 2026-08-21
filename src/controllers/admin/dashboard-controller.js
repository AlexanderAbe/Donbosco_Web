const DashboardModel = require('../../models/admin/dashboard-model');
const LogModel = require('../../models/admin/logs-model');
const { getBaseData } = require('../../utils/admin-helper');

exports.getDashboard = async (req, res) => {
    try {
        const [stats, recentLogs] = await Promise.all([
            DashboardModel.getDashboardStats(),
            LogModel.getRecentLogs(5)
        ]);

        res.render('admin/dashboard', { 
            ...getBaseData(req, 'Quản Trị Hệ Thống'),
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
            ...getBaseData(req, 'Nhật ký hệ thống'),
            logs: result.logs,
            currentPage: page,
            totalPages: result.totalPages,
            limit: limit,
            fromDate: fromDate,
            toDate: toDate,
            search: search
        });
    } catch (error) {
        console.error('Lỗi trang Logs:', error);
        res.status(500).send('Lỗi máy chủ');
    }
};