const DashboardModel = require('../../models/bdh/dashboard-model');
const { getBdhBaseData } = require('../../utils/base-data-helper');

const DashboardController = {
    async getDashboard(req, res) {
        try {
            const selectedYearId = req.query.nien_khoa;

            const [nienKhoaList, stats] = await Promise.all([
                DashboardModel.getDanhSachNienKhoa(),
                DashboardModel.getDashboardStats(selectedYearId)
            ]);

            res.render('bdh/dashboard', {
                ...getBdhBaseData(req, 'Dashboard Ban Điều Hành'),
                nienKhoaList,
                stats,
                recentLogs: []
            });
        } catch (error) {
            console.error('❌ Lỗi Controller Dashboard BDH:', error);
            res.status(500).send('Đã xảy ra lỗi khi tải trang Dashboard.');
        }
    }
};

module.exports = DashboardController;
