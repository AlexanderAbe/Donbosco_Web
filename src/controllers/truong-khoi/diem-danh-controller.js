const { getTruongKhoiBaseData } = require('../../utils/base-data-helper');
const LopModel = require('../../models/truong-khoi/lop-model');
const DiemDanhModel = require('../../models/truong-khoi/diem-danh-model');
const { getCurrentYear } = require('../../utils/current-year-helper');

const DiemDanhController = {
    async getPage(req, res) {
        try {
            const years = await LopModel.getAcademicYears(req.session.user.id_glv);
            const { selectedYearId } = getCurrentYear(years, req.session);
            const attendance = selectedYearId
                ? await DiemDanhModel.getPageData(req.session.user.id_glv, selectedYearId)
                : [];
            return res.render('truong-khoi/diem-danh', {
                ...getTruongKhoiBaseData(req, 'Chi tiết điểm danh'),
                title: 'Quản lý điểm danh',
                selectedYearId, attendance
            });
        } catch (error) {
            console.error('Lỗi tải trang điểm danh:', error);
            return res.status(500).send('Lỗi server khi tải trang điểm danh.');
        }
    }
};

module.exports = DiemDanhController;
