const BaseGlvModel = require('../../models/glv/base-glv-model');
const DiemDanhModel = require('../../models/glv/diem-danh-model');
const { logAction } = require('../../utils/logger');
const { getCurrentYear } = require('../../utils/current-year-helper');

const getId = value => {
    const id = Number.parseInt(value, 10);
    return Number.isInteger(id) && id > 0 ? id : null;
};

const getSmartDate = sessionType => {
    const today = new Date();
    const targetDay = sessionType === 'Lễ Thứ 3' ? 2 : sessionType === 'Lễ Thứ 5' ? 4 : 0;
    const difference = (today.getDay() - targetDay + 7) % 7;
    today.setDate(today.getDate() - difference);
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getSessionTypesForDate = value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return [];
    const [year, month, day] = value.split('-').map(Number);
    const weekDay = new Date(year, month - 1, day).getDay();
    if (weekDay === 2) return ['Lễ Thứ 3'];
    if (weekDay === 4) return ['Lễ Thứ 5'];
    if (weekDay === 0) return ['Lễ Chúa Nhật', 'Học Giáo Lý'];
    return [];
};

const DiemDanhController = {
    async getDiemDanh(req, res) {
        try {
            const idGlv = req.session.user.id_glv;
            const years = await BaseGlvModel.getAcademicYears(idGlv);
            const { selectedYearId } = getCurrentYear(years, req.session);
            const classes = selectedYearId ? await BaseGlvModel.getAssignedClasses(idGlv, selectedYearId) : [];
            const requestedClass = getId(req.query.id_lop);
            const selectedClassId = classes.some(item => item.id_lop === requestedClass)
                ? requestedClass
                : classes[0]?.id_lop;
            const selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(req.query.ngay_diem_danh || '')
                ? req.query.ngay_diem_danh
                : getSmartDate(req.query.loai_buoi || 'Học Giáo Lý');
            const sessionTypes = getSessionTypesForDate(selectedDate);
            const sessionType = sessionTypes.includes(req.query.loai_buoi)
                ? req.query.loai_buoi
                : sessionTypes[0] || '';
            const students = selectedYearId && selectedClassId
                && sessionType
                ? await DiemDanhModel.getAttendanceStudents(idGlv, selectedYearId, selectedClassId, selectedDate, sessionType)
                : [];

            return res.render('glv/diem-danh', {
                title: 'Điểm danh thiếu nhi', selectedYearId, classes,
                selectedClassId, sessionTypes, sessionType, selectedDate, students,
                message: req.query.message || null, error: req.query.error || null
            });
        } catch (error) {
            console.error('Lỗi tải trang điểm danh GLV:', error);
            return res.status(500).send('Lỗi server khi tải trang điểm danh.');
        }
    },

    async saveDiemDanh(req, res) {
        const idGlv = req.session.user?.id_glv;
        const yearId = getId(req.body.nien_khoa);
        const classId = getId(req.body.id_lop);
        const sessionType = req.body.loai_buoi;
        const attendanceDate = req.body.ngay_diem_danh;
        const attendance = Array.isArray(req.body.attendance) ? req.body.attendance : [];

        try {
            if (!getSessionTypesForDate(attendanceDate).includes(sessionType)) {
                throw new Error('Loại buổi không phù hợp với ngày đã chọn.');
            }

            await DiemDanhModel.saveAttendance(idGlv, yearId, classId, attendanceDate, sessionType, attendance);

            await logAction(req, `Lưu điểm danh thành công cho Lớp ID: ${classId} (Ngày: ${attendanceDate}, Buổi: ${sessionType})`, 'Thành công');

            const query = new URLSearchParams({
                nien_khoa: yearId, id_lop: classId, loai_buoi: sessionType,
                ngay_diem_danh: attendanceDate, message: 'Đã lưu điểm danh.'
            });
            return res.redirect(`/glv/diem-danh?${query.toString()}`);
        } catch (error) {
            console.error('Lỗi lưu điểm danh GLV:', error);
            const errMessage = error.message || 'Không thể lưu điểm danh.';

            await logAction(req, `Lưu điểm danh thất bại cho Lớp ID: ${classId} (Ngày: ${attendanceDate}, Buổi: ${sessionType}): ${errMessage}`, 'Thất bại');

            const query = new URLSearchParams({
                nien_khoa: yearId || '', id_lop: classId || '', loai_buoi: sessionType || '',
                ngay_diem_danh: attendanceDate || '', error: errMessage
            });
            return res.redirect(`/glv/diem-danh?${query.toString()}`);
        }
    }
};

module.exports = DiemDanhController;