const BaseGlvModel = require('../../models/glv/base-glv-model');
const DiemDanhModel = require('../../models/glv/diem-danh-model');
const { logAction } = require('../../utils/logger');
const { getCurrentYear } = require('../../utils/current-year-helper');

const getId = value => {
    const id = Number.parseInt(value, 10);
    return Number.isInteger(id) && id > 0 ? id : null;
};

const getTodayKey = () => {
    const today = new Date();
    return [today.getFullYear(), today.getMonth() + 1, today.getDate()]
        .map((value, index) => index === 0 ? String(value) : String(value).padStart(2, '0'))
        .join('-');
};

const isFutureDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && value > getTodayKey();

const isTodayDate = value => value === getTodayKey();

const getAttendanceRoom = (yearId, classId, attendanceDate, sessionType) =>
    `attendance_${yearId}_${classId}_${attendanceDate}_${encodeURIComponent(sessionType)}`;

const broadcastAttendanceUpdate = (req, yearId, classId, attendanceDate, sessionType, data) => {
    const io = req.app.get('io');
    if (io) {
        io.to(getAttendanceRoom(yearId, classId, attendanceDate, sessionType))
            .emit('attendance_entry_updated', data);
    }
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

const getAutomaticQrSessionType = sessionTypes => {
    if (!sessionTypes.length) return '';
    if (!sessionTypes.includes('Học Giáo Lý')) return sessionTypes[0];

    const now = new Date();
    return now.getHours() >= 9 ? 'Học Giáo Lý' : 'Lễ Chúa Nhật';
};

const parseQrValue = value => {
    const rawValue = String(value || '').trim();
    if (!rawValue) return null;

    try {
        const payload = JSON.parse(rawValue);
        if (payload && (payload.id_tn || payload.mstn)) {
            return {
                studentId: getId(payload.id_tn),
                mstn: payload.mstn ? String(payload.mstn).trim() : null
            };
        }
    } catch (error) {
    }

    const studentMatch = rawValue.match(/^(?:student|id_tn)\s*:\s*(\d+)$/i);
    if (studentMatch) return { studentId: getId(studentMatch[1]), mstn: null };

    const mstnMatch = rawValue.match(/^mstn\s*:\s*(.+)$/i);
    if (mstnMatch) return { studentId: null, mstn: mstnMatch[1].trim() };

    const firstToken = rawValue.split(/\s+/)[0];
    return { studentId: null, mstn: firstToken };
};

const getQrAttendanceStatus = (attendanceDate, sessionType) => {
    if (sessionType !== 'Lễ Chúa Nhật') return 'Có mặt';

    const now = new Date();
    const today = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
        .map((value, index) => index === 0 ? String(value) : String(value).padStart(2, '0'))
        .join('-');
    const beforeEarlyDeadline = now.getHours() < 7
        || (now.getHours() === 7 && now.getMinutes() < 45);

    return attendanceDate === today && beforeEarlyDeadline ? 'Đi sớm' : 'Có mặt';
};

const DiemDanhController = {
    async getQrDiemDanh(req, res) {
        try {
            const idGlv = req.session.user.id_glv;
            const years = await BaseGlvModel.getAcademicYears(idGlv);
            const { selectedYearId } = getCurrentYear(years, req.session);
            const classes = selectedYearId ? await BaseGlvModel.getAssignedClasses(idGlv, selectedYearId) : [];
            const requestedClass = getId(req.query.id_lop);
            const selectedClassId = classes.some(item => item.id_lop === requestedClass)
                ? requestedClass
                : classes[0]?.id_lop;
            const selectedDate = getTodayKey();
            const sessionTypes = getSessionTypesForDate(selectedDate);
            const sessionType = getAutomaticQrSessionType(sessionTypes);

            return res.render('glv/diem-danh-qr', {
                title: 'Quét QR điểm danh', selectedYearId, classes,
                selectedClassId, sessionTypes, sessionType, selectedDate,
                todayKey: getTodayKey(),
                isFutureDate: isFutureDate(selectedDate),
                isQrDate: isTodayDate(selectedDate)
            });
        } catch (error) {
            console.error('Lỗi tải trang quét QR GLV:', error);
            return res.status(500).send('Lỗi server khi tải trang quét QR.');
        }
    },

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
                : getTodayKey();
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
                todayKey: getTodayKey(),
                isFutureDate: isFutureDate(selectedDate),
                isQrDate: isTodayDate(selectedDate),
                message: req.query.message || null, error: req.query.error || null
            });
        } catch (error) {
            console.error('Lỗi tải trang điểm danh GLV:', error);
            return res.status(500).send('Lỗi server khi tải trang điểm danh.');
        }
    },

    async getMonthlyAttendanceForPrint(req, res) {
        const idGlv = req.session.user?.id_glv;
        const classId = getId(req.body?.id_lop);
        const month = getId(req.body?.thang);
        if (!classId || !month || month > 12) {
            return res.status(400).json({ error: 'Lớp hoặc tháng điểm danh không hợp lệ.' });
        }

        try {
            const years = await BaseGlvModel.getAcademicYears(idGlv);
            const { selectedYearId, selectedYear } = getCurrentYear(years, req.session);
            const academicYear = /^(\d{4})-(\d{4})$/.exec(selectedYear?.nien_khoa || '');
            if (!selectedYearId || !academicYear) {
                return res.status(400).json({ error: 'Không xác định được niên khóa để in điểm danh.' });
            }

            const calendarYear = Number(month >= 9 ? academicYear[1] : academicYear[2]);
            const attendanceData = await DiemDanhModel.getMonthlyAttendanceForPrint(
                idGlv,
                selectedYearId,
                classId,
                calendarYear,
                month
            );
            return res.json({
                className: attendanceData.className,
                month,
                calendarYear,
                academicYear: selectedYear.nien_khoa,
                students: attendanceData.students
            });
        } catch (error) {
            console.error('Lỗi tải dữ liệu in điểm danh GLV:', error);
            const status = error.code === 'FORBIDDEN' ? 403 : 500;
            return res.status(status).json({
                error: status === 403 ? error.message : 'Lỗi máy chủ khi tải dữ liệu in điểm danh.'
            });
        }
    },

    async saveDiemDanh(req, res, unmarkedStatus = 'Có mặt') {
        const idGlv = req.session.user?.id_glv;
        const yearId = getId(req.body.nien_khoa);
        const classId = getId(req.body.id_lop);
        const sessionType = req.body.loai_buoi;
        const attendanceDate = req.body.ngay_diem_danh;
        const attendance = Array.isArray(req.body.attendance) ? req.body.attendance : [];

        try {
            if (isFutureDate(attendanceDate)) {
                throw new Error('Không thể lưu điểm danh cho ngày chưa tới.');
            }
            if (!getSessionTypesForDate(attendanceDate).includes(sessionType)) {
                throw new Error('Loại buổi không phù hợp với ngày đã chọn.');
            }

            await DiemDanhModel.saveAttendance(
                idGlv, yearId, classId, attendanceDate, sessionType, attendance, unmarkedStatus
            );
            const savedStudents = await DiemDanhModel.getAttendanceStudents(
                idGlv, yearId, classId, attendanceDate, sessionType
            );
            savedStudents.forEach(student => broadcastAttendanceUpdate(
                req, yearId, classId, attendanceDate, sessionType,
                { studentId: student.id_tn, status: student.trang_thai_diem_danh, saved: student.da_luu }
            ));

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
    },

    async saveQrDiemDanh(req, res) {
        return DiemDanhController.saveDiemDanh(req, res, 'Vắng không phép');
    },

    async saveAttendanceEntry(req, res) {
        const idGlv = req.session.user?.id_glv;
        const yearId = getId(req.body.nien_khoa);
        const classId = getId(req.body.id_lop);
        const studentId = getId(req.body.id_tn);
        const sessionType = req.body.loai_buoi;
        const attendanceDate = req.body.ngay_diem_danh;
        const status = req.body.trang_thai;

        try {
            if (!yearId || !classId || !studentId
                || isFutureDate(attendanceDate)
                || !getSessionTypesForDate(attendanceDate).includes(sessionType)) {
                return res.status(400).json({ success: false, message: 'Thông tin điểm danh không hợp lệ.' });
            }
            await DiemDanhModel.saveStudentAttendance(
                idGlv, yearId, classId, studentId, attendanceDate, sessionType, status
            );
            broadcastAttendanceUpdate(req, yearId, classId, attendanceDate, sessionType, {
                studentId,
                status,
                saved: true
            });
            return res.json({ success: true });
        } catch (error) {
            console.error('Lỗi lưu điểm danh thiếu nhi:', error);
            const statusCode = error.code === 'FORBIDDEN' ? 403 : 500;
            return res.status(statusCode).json({
                success: false,
                message: statusCode === 403 ? error.message : 'Không thể lưu điểm danh.'
            });
        }
    },

    async scanDiemDanh(req, res) {
        const idGlv = req.session.user?.id_glv;
        const yearId = getId(req.body.nien_khoa);
        const classId = getId(req.body.id_lop);
        const sessionType = req.body.loai_buoi;
        const attendanceDate = req.body.ngay_diem_danh;
        const qrPayload = parseQrValue(req.body.qr_value);

        try {
            if (!isTodayDate(attendanceDate)) {
                throw new Error('Quét QR chỉ được sử dụng trong đúng ngày hôm nay.');
            }
            if (!qrPayload || !getSessionTypesForDate(attendanceDate).includes(sessionType)) {
                throw new Error('QR, ngày hoặc loại buổi không hợp lệ.');
            }

            const status = getQrAttendanceStatus(attendanceDate, sessionType);
            const student = await DiemDanhModel.markAttendanceByQr(
                idGlv, yearId, classId, qrPayload.studentId, qrPayload.mstn,
                attendanceDate, sessionType, status
            );
            broadcastAttendanceUpdate(req, yearId, classId, attendanceDate, sessionType, {
                studentId: student.id_tn,
                status,
                saved: true
            });
            await logAction(req, `Quét QR điểm danh thành công cho ${student.ho_ten} (Lớp ID: ${classId})`, 'Thành công');
            return res.json({ success: true, status, student: { name: student.ho_ten, mstn: student.mstn } });
        } catch (error) {
            console.error('Lỗi quét QR điểm danh:', error);
            await logAction(req, `Quét QR điểm danh thất bại (Lớp ID: ${classId || 'N/A'}): ${error.message}`, 'Thất bại');
            return res.status(400).json({ success: false, message: error.message || 'Không thể ghi nhận QR.' });
        }
    }
};

module.exports = DiemDanhController;