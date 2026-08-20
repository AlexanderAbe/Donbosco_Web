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
            stats, recentLogs
        });
    } catch (error) {
        console.error('Lỗi Dashboard:', error);
        res.status(500).send('Lỗi máy chủ');
    }
};

exports.getAllLogs = async (req, res) => {
    try {
        const logs = await LogModel.getAllLogs(100);

        res.render('admin/logs', { 
            ...getBaseData(req, 'Nhật ký hệ thống'),
            logs
        });
    } catch (error) {
        console.error('Lỗi trang Logs:', error);
        res.status(500).send('Lỗi máy chủ');
    }
};