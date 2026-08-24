const BaseGlvModel = require('../../models/glv/base-glv-model');
const KyLuatModel = require('../../models/glv/ky-luat-model');
const { logAction } = require('../../utils/logger');
const { getCurrentYear } = require('../../utils/current-year-helper');

const getId = value => {
    const id = Number.parseInt(value, 10);
    return Number.isInteger(id) && id > 0 ? id : null;
};

const KyLuatController = {
    async getKyLuat(req, res) {
        try {
            const idGlv = req.session.user.id_glv;
            const years = await BaseGlvModel.getAcademicYears(idGlv);
            const { selectedYearId } = getCurrentYear(years, req.session);
            const classes = selectedYearId
                ? await BaseGlvModel.getAssignedClasses(idGlv, selectedYearId)
                : [];
            const requestedClass = getId(req.query.id_lop);
            const selectedClassId = classes.some(item => item.id_lop === requestedClass)
                ? requestedClass
                : classes[0]?.id_lop;
            const requestedMonth = getId(req.query.thang);
            const selectedMonth = requestedMonth && requestedMonth <= 12 ? requestedMonth : new Date().getMonth() + 1;
            const students = selectedYearId && selectedClassId
                ? await KyLuatModel.getDisciplineStudents(idGlv, selectedYearId, selectedClassId, selectedMonth)
                : [];

            return res.render('glv/ky-luat', {
                title: 'Nhập điểm kỷ luật',
                selectedYearId,
                classes,
                selectedClassId,
                selectedMonth,
                students,
                message: req.query.message || null,
                error: req.query.error || null
            });
        } catch (error) {
            console.error('Lỗi tải trang nhập điểm kỷ luật GLV:', error);
            return res.status(500).send('Lỗi server khi tải trang nhập điểm kỷ luật.');
        }
    },

    async saveKyLuat(req, res) {
        const idGlv = req.session.user?.id_glv;
        const yearId = getId(req.body.nien_khoa);
        const classId = getId(req.body.id_lop);
        const month = getId(req.body.thang);
        const scores = Array.isArray(req.body.scores) ? req.body.scores : [];

        if (!yearId || !classId || !month || month > 12) {
            await logAction(req, `Lưu điểm kỷ luật thất bại: Thông tin tháng, lớp hoặc niên khóa không hợp lệ (Lớp ID: ${req.body.id_lop}, Tháng: ${req.body.thang})`, 'Thất bại');
            return res.status(400).send('Thông tin tháng hoặc lớp không hợp lệ.');
        }

        try {
            await KyLuatModel.saveDisciplineScores(
                idGlv,
                yearId,
                classId,
                month,
                scores
            );

            await logAction(req, `Lưu điểm kỷ luật thành công cho Lớp ID: ${classId} (Tháng: ${month}, Niên khóa ID: ${yearId})`, 'Thành công');

            return res.redirect(`/glv/ky-luat?nien_khoa=${yearId}&id_lop=${classId}&thang=${month}&message=Đã lưu điểm kỷ luật.`);
        } catch (error) {
            console.error('Lỗi lưu điểm kỷ luật GLV:', error);
            const errMessage = error.message || 'Không thể lưu điểm kỷ luật.';

            await logAction(req, `Lưu điểm kỷ luật thất bại cho Lớp ID: ${classId} (Tháng: ${month}): ${errMessage}`, 'Thất bại');

            const query = new URLSearchParams({
                nien_khoa: req.body.nien_khoa || '',
                id_lop: req.body.id_lop || '',
                thang: req.body.thang || '',
                error: errMessage
            });
            return res.redirect(`/glv/ky-luat?${query.toString()}`);
        }
    }
};

module.exports = KyLuatController;