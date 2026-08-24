const { getTruongKhoiBaseData } = require('../../utils/base-data-helper');
const LopModel = require('../../models/truong-khoi/lop-model');
const KiemTraModel = require('../../models/truong-khoi/kiem-tra-model');
const { getCurrentYear } = require('../../utils/current-year-helper');

const KiemTraController = {
    async getPage(req, res) {
        try {
            const years = await LopModel.getAcademicYears(req.session.user.id_glv);
            const { selectedYearId } = getCurrentYear(years, req.session);
            const scores = selectedYearId
                ? await KiemTraModel.getPageData(req.session.user.id_glv, selectedYearId)
                : [];
            return res.render('truong-khoi/kiem-tra', {
                ...getTruongKhoiBaseData(req, 'Điểm kiểm tra'),
                title: 'Quản lý kiểm tra',
                layout: 'layouts/truong-khoi-layout', selectedYearId, scores
            });
        } catch (error) {
            console.error('Lỗi tải trang kiểm tra:', error);
            return res.status(500).send('Lỗi server khi tải trang kiểm tra.');
        }
    }
};

module.exports = KiemTraController;
