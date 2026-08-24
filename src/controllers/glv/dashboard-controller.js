const BaseGlvModel = require('../../models/glv/base-glv-model');
const DashboardModel = require('../../models/glv/dashboard-model');
const { getCurrentYear } = require('../../utils/current-year-helper');

const getId = value => {
    const id = Number.parseInt(value, 10);
    return Number.isInteger(id) && id > 0 ? id : null;
};

const DashboardController = {
    async getDashboard(req, res) {
        try {
            const idGlv = req.session.user.id_glv;
            const years = await BaseGlvModel.getAcademicYears(idGlv);
            const { selectedYearId, selectedYear } = getCurrentYear(years, req.session);
            const dashboard = selectedYearId
                ? await DashboardModel.getDashboardData(idGlv, selectedYearId)
                : { classes: [], attendance: null, attendanceAlerts: [], scoreAlerts: [] };
            return res.render('glv/dashboard', {
                title: 'Tổng quan GLV',
                user: req.session.user,
                year: selectedYear,
                ...dashboard
            });
        } catch (error) {
            console.error('Lỗi tải dashboard GLV:', error);
            return res.status(500).send('Lỗi server khi tải dashboard GLV.');
        }
    }
};

module.exports = DashboardController;
