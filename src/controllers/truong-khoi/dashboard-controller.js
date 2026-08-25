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
            const sacramentBlocks = selectedYearId
                ? await DashboardModel.getSacramentBlocks(req.session.user.id_glv, selectedYearId)
                : [];
            return res.render('truong-khoi/dashboard', {
                ...getTruongKhoiBaseData(req, 'Tổng quan Trưởng Khối'),
                title: 'Tổng quan Trưởng Khối',
                layout: 'layouts/truong-khoi-layout', selectedYear, selectedYearId, stats, ...details, sacramentBlocks
            });
        } catch (error) {
            console.error('Lỗi tải dashboard trưởng khối:', error);
            return res.status(500).send('Lỗi server khi tải dashboard.');
        }
    },

    async createSacramentBulk(req, res) {
        const yearId = Number.parseInt(req.body.yearId, 10);
        const blockId = Number.parseInt(req.body.blockId, 10);
        try {
            const count = await DashboardModel.createSacramentBulk(
                req.session.user.id_glv,
                yearId,
                blockId,
                req.body.sacramentType,
                req.body.receivedDate,
                Array.isArray(req.body.studentIds) ? req.body.studentIds.map(id => Number.parseInt(id, 10)).filter(Number.isInteger) : undefined
            );
            return res.json({ success: true, count });
        } catch (error) {
            console.error('Lỗi tạo bí tích hàng loạt:', error);
            return res.status(400).json({ error: error.message || 'Không thể tạo bí tích hàng loạt.' });
        }
    },

    async getSacramentStudents(req, res) {
        const yearId = Number.parseInt(req.query.yearId, 10);
        const blockId = Number.parseInt(req.query.blockId, 10);
        try {
            const students = await DashboardModel.getSacramentStudents(req.session.user.id_glv, yearId, blockId);
            return res.json(students);
        } catch (error) {
            console.error('Lỗi lấy danh sách thiếu nhi bí tích:', error);
            return res.status(400).json({ error: 'Không thể tải danh sách thiếu nhi.' });
        }
    }
};

module.exports = TruongKhoiDashboardController;
