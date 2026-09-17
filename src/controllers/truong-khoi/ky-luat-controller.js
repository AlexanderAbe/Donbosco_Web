const { getTruongKhoiBaseData } = require('../../utils/base-data-helper');
const LopModel = require('../../models/truong-khoi/lop-model');
const KyLuatModel = require('../../models/truong-khoi/ky-luat-model');
const { getCurrentYear } = require('../../utils/current-year-helper');

const sortByStudentName = (items = []) => [...items].sort((a, b) => {
    const nameA = (a.ten || '').trim().toLowerCase();
    const nameB = (b.ten || '').trim().toLowerCase();
    if (nameA !== nameB) return nameA.localeCompare(nameB, 'vi');

    const hoA = (a.ho_va_ten_lot || '').trim().toLowerCase();
    const hoB = (b.ho_va_ten_lot || '').trim().toLowerCase();
    return hoA.localeCompare(hoB, 'vi');
});

const normalizeDiscipline = (discipline = []) => sortByStudentName(discipline).map((item) => ({
    ...item,
    _fullName: [item.ten_thanh, item.ho_va_ten_lot, item.ten].filter(Boolean).join(' ')
}));

const KyLuatController = {
    async getPage(req, res) {
        try {
            const years = await LopModel.getAcademicYears(req.session.user.id_glv);
            const { selectedYearId } = getCurrentYear(years, req.session);
            const discipline = selectedYearId
                ? await KyLuatModel.getPageData(req.session.user.id_glv, selectedYearId)
                : [];

            return res.render('truong-khoi/ky-luat', {
                ...getTruongKhoiBaseData(req, 'Điểm kỷ luật'),
                title: 'Điểm kỷ luật',
                layout: 'layouts/truong-khoi-layout',
                selectedYearId,
                discipline: normalizeDiscipline(discipline)
            });
        } catch (error) {
            console.error('Lỗi tải trang kỷ luật:', error);
            return res.status(500).send('Lỗi server khi tải trang kỷ luật.');
        }
    }
};

module.exports = KyLuatController;
