const { getTruongKhoiBaseData } = require('../../utils/base-data-helper');
const LopModel = require('../../models/truong-khoi/lop-model');
const DashboardModel = require('../../models/truong-khoi/dashboard-model');
const { getCurrentYear } = require('../../utils/current-year-helper');

const TruongKhoiDashboardController = {
    async getDashboard(req, res) {
        try {
            const years = await LopModel.getAcademicYears(req.session.user.id_glv);
            const { selectedYearId, selectedYear } = getCurrentYear(years, req.session);
            const stats = selectedYearId
                ? await DashboardModel.getStats(req.session.user.id_glv, selectedYearId)
                : { total_thieu_nhi: 0, total_nam: 0, total_nu: 0, total_glv: 0 };
            const details = selectedYearId
                ? await DashboardModel.getDetails(req.session.user.id_glv, selectedYearId)
                : { classStats: [], statusStats: [], classesWithoutGlv: [], lowExamScores: [], lowDisciplineScores: [], recentAttendance: [] };
            return res.render('truong-khoi/dashboard', {
                ...getTruongKhoiBaseData(req, 'Tổng quan Trưởng Khối'),
                title: 'Tổng quan Trưởng Khối',
                layout: 'layouts/truong-khoi-layout', selectedYear, selectedYearId, stats, ...details
            });
        } catch (error) {
            console.error('Lỗi tải dashboard trưởng khối:', error);
            return res.status(500).send('Lỗi server khi tải dashboard.');
        }
    }
};

module.exports = TruongKhoiDashboardController;
