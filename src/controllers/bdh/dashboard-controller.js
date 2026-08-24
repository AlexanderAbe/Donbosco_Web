const DashboardModel = require('../../models/bdh/dashboard-model');
const { getBdhBaseData } = require('../../utils/base-data-helper');
const { setCurrentYearId } = require('../../utils/current-year-state');

const DashboardController = {
    async getDashboard(req, res) {
        try {
            const nienKhoaList = await DashboardModel.getDanhSachNienKhoa();
            const requestedYearId = Number.parseInt(req.query.nien_khoa, 10);
            const sessionYearId = Number.parseInt(req.session.current_year_id, 10);
            const selectedYearId = nienKhoaList.some(year => year.id_cau_hinh_nam_hoc === requestedYearId)
                ? requestedYearId
                : nienKhoaList.some(year => year.id_cau_hinh_nam_hoc === sessionYearId)
                    ? sessionYearId
                    : nienKhoaList[0]?.id_cau_hinh_nam_hoc;

            req.session.current_year_id = selectedYearId || null;
            setCurrentYearId(selectedYearId);
            const stats = await DashboardModel.getDashboardStats(selectedYearId);

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
