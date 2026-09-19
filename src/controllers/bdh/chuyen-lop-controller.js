const ChuyenLopModel = require('../../models/bdh/chuyen-lop-model');
const { getBdhBaseData } = require('../../utils/base-data-helper');
const { logAction } = require('../../utils/logger');
const { getCurrentYear } = require('../../utils/current-year-helper');

const parseId = value => {
    const id = Number.parseInt(value, 10);
    return Number.isInteger(id) && id > 0 ? id : null;
};

const parseIdList = value => {
    const values = Array.isArray(value) ? value : [value];
    return [...new Set(values.map(parseId).filter(Boolean))];
};

const redirect = (res, params, key, message) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([name, value]) => {
        if (value) query.set(name, value);
    });
    if (message) query.set(key, message);
    res.redirect(`/bdh/chuyen-lop?${query.toString()}`);
};

const ChuyenLopController = {
    async getPage(req, res) {
        try {
            const years = await ChuyenLopModel.getAcademicYears();
            const { selectedYearId } = getCurrentYear(years, req.session);
            const pageData = selectedYearId
                ? await ChuyenLopModel.getPageData(selectedYearId, parseId(req.query.id_lop_cu))
                : { khoiList: [], classList: [], students: [] };
            const selectedSourceClassId = pageData.classList.some(item => item.id_lop === parseId(req.query.id_lop_cu))
                ? parseId(req.query.id_lop_cu)
                : null;
            const selectedTargetClassId = pageData.classList.some(item => item.id_lop === parseId(req.query.id_lop_moi))
                ? parseId(req.query.id_lop_moi)
                : null;

            return res.render('bdh/chuyen-lop', {
                ...getBdhBaseData(req, 'Chuyển lớp'),
                years,
                selectedYearId,
                selectedSourceClassId,
                selectedTargetClassId,
                ...pageData,
                message: req.query.message || null,
                error: req.query.error || null
            });
        } catch (error) {
            console.error('Lỗi tải trang chuyển lớp:', error);
            return res.status(500).send('Lỗi server khi tải trang chuyển lớp.');
        }
    },

    async moveStudents(req, res) {
        const years = await ChuyenLopModel.getAcademicYears();
        const { selectedYearId: yearId } = getCurrentYear(years, req.session);
        const sourceClassId = parseId(req.body.id_lop_cu);
        const targetClassId = parseId(req.body.id_lop_moi);
        const studentIds = parseIdList(req.body.id_tn);
        const params = { nien_khoa: yearId, id_lop_cu: sourceClassId, id_lop_moi: targetClassId };

        if (!yearId || !sourceClassId || !targetClassId || sourceClassId === targetClassId || !studentIds.length) {
            await logAction(req, 'Chuyển lớp thất bại: Thông tin lớp hoặc danh sách thiếu nhi không hợp lệ', 'Thất bại');
            return redirect(res, params, 'error', 'Vui lòng chọn lớp nguồn, lớp đích và ít nhất một thiếu nhi.');
        }

        try {
            const movedCount = await ChuyenLopModel.moveStudents({ yearId, sourceClassId, targetClassId, studentIds });
            await logAction(req, `Chuyển lớp thành công ${movedCount} thiếu nhi từ lớp ${sourceClassId} sang lớp ${targetClassId}`, 'Thành công');
            return redirect(res, params, 'message', `Đã chuyển ${movedCount} thiếu nhi sang lớp mới.`);
        } catch (error) {
            console.error('Lỗi chuyển lớp:', error);
            await logAction(req, `Chuyển lớp thất bại từ lớp ${sourceClassId} sang lớp ${targetClassId}`, 'Thất bại');
            return redirect(res, params, 'error', error.message || 'Không thể chuyển lớp.');
        }
    }
};

module.exports = ChuyenLopController;