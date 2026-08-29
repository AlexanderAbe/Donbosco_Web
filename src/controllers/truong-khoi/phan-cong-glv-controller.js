const { getTruongKhoiBaseData } = require('../../utils/base-data-helper');
const LopModel = require('../../models/truong-khoi/lop-model');
const PhanCongGlvModel = require('../../models/truong-khoi/phan-cong-glv-model');
const { getCurrentYear } = require('../../utils/current-year-helper');
const { logAction } = require('../../utils/logger');

const TruongKhoiPhanCongGlvController = {
    async getPage(req, res) {
        try {
            const years = await LopModel.getAcademicYears(req.session.user.id_glv);
            const { selectedYearId } = getCurrentYear(years, req.session);
            const data = selectedYearId
                ? await PhanCongGlvModel.getPageData(req.session.user.id_glv, selectedYearId)
                : { classes: [], glvList: [] };
            return res.render('truong-khoi/phan-cong-glv', {
                ...getTruongKhoiBaseData(req, 'Phân công Giáo lý viên'),
                title: 'Phân công giáo lý viên',
                layout: 'layouts/truong-khoi-layout',
                years,
                selectedYearId,
                ...data,
                error: req.query.error || null
            });
        } catch (error) {
            console.error('Lỗi tải trang phân công GLV:', error);
            return res.status(500).send('Lỗi server khi tải trang phân công GLV.');
        }
    },

    async getDetail(req, res) {
        try {
            const detail = await PhanCongGlvModel.getDetail(
                Number.parseInt(req.params.id, 10),
                Number.parseInt(req.query.nien_khoa, 10),
                req.session.user.id_glv
            );
            if (!detail) return res.status(404).json({ error: 'Không tìm thấy GLV trong khối phụ trách.' });
            return res.json(detail);
        } catch (error) {
            console.error('Lỗi lấy chi tiết GLV Trưởng Khối:', error);
            return res.status(500).json({ error: 'Không thể tải thông tin GLV.' });
        }
    },

    async saveAll(req, res) {
        const yearId = req.body.yearId;
        try {
            const teacherId = req.session.user.id_glv;
            const assignments = req.body.assignments || {}; // { id_glv: id_lop, ... }

            await PhanCongGlvModel.saveAll(
                teacherId,
                Number.parseInt(yearId, 10),
                assignments
            );

            await logAction(req, `Cập nhật phân công hàng loạt GLV thành công (Niên khóa ID: ${yearId})`, 'Thành công');
            return res.redirect(`/truong-khoi/phan-cong-glv?nien_khoa=${yearId}`);
        } catch (error) {
            console.error('Lỗi lưu phân công hàng loạt:', error);
            await logAction(req, `Lỗi lưu phân công hàng loạt: ${error.message}`, 'Thất bại');
            return res.redirect(`/truong-khoi/phan-cong-glv?nien_khoa=${yearId}&error=${encodeURIComponent(error.message)}`);
        }
    }
};

module.exports = TruongKhoiPhanCongGlvController;
