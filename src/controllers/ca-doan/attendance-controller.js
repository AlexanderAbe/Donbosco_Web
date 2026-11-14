const { AttendanceModel, sessionTypesByWeekday, isAttendanceSession } = require('../../models/ca-doan/attendance-model');
const { logAction } = require('../../utils/logger');
const { broadcastBangDiemRefresh } = require('../../utils/bang-diem-realtime');
const { getCaDoanBaseData } = require('../../utils/base-data-helper');

const broadcastAttendanceUpdate = (req, yearId, student, attendanceDate, sessionType) => {
    const io = req.app.get('io');
    if (!io || !student.id_lop) return;

    io.to(`attendance_${yearId}_${student.id_lop}_${attendanceDate}_${encodeURIComponent(sessionType)}`)
        .emit('attendance_entry_updated', {
            studentId: student.id_tn,
            status: student.trang_thai_diem_danh,
            saved: true
        });
};

const getPositiveInt = value => {
    const id = Number(value);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
};

const getTodayKey = () => {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
};

const isValidDate = value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

const parseQrValue = value => {
    const rawValue = String(value || '').trim();
    if (!rawValue) return null;

    try {
        const payload = JSON.parse(rawValue);
        if (payload && payload.id_tn) {
            const studentId = getPositiveInt(payload.id_tn);
            return studentId ? { studentId, mstn: null } : null;
        }
        if (payload && payload.mstn) return { studentId: null, mstn: String(payload.mstn).trim() };
    } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
    }

    const studentMatch = rawValue.match(/^(?:student|id_tn)\s*:\s*(\d+)$/i);
    if (studentMatch) return { studentId: getPositiveInt(studentMatch[1]), mstn: null };
    const mstnMatch = rawValue.match(/^mstn\s*:\s*(.+)$/i);
    if (mstnMatch) return { studentId: null, mstn: mstnMatch[1].trim() };
    return { studentId: null, mstn: rawValue.split(/\s+/)[0] };
};

const getAttendanceStatus = (attendanceDate, sessionType) => {
    if (sessionType !== 'Lễ Chúa Nhật' || attendanceDate !== getTodayKey()) return 'Có mặt';
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    const minutes = Number(values.hour) * 60 + Number(values.minute);
    return minutes < 7 * 60 + 45 ? 'Đi sớm' : 'Có mặt';
};

const AttendanceController = {
    async getPage(req, res) {
        try {
            const years = await AttendanceModel.getAcademicYears();
            const requestedYearId = getPositiveInt(req.query.nien_khoa);
            const selectedYearId = years.some(year => year.id_cau_hinh_nam_hoc === requestedYearId)
                ? requestedYearId
                : years[0]?.id_cau_hinh_nam_hoc || null;
            const todayKey = getTodayKey();
            const requestedDate = String(req.query.ngay_diem_danh || todayKey);
            const selectedDate = isValidDate(requestedDate) ? requestedDate : todayKey;
            const weekday = new Date(`${selectedDate}T00:00:00Z`).getUTCDay();
            const sessionTypes = sessionTypesByWeekday.get(weekday) || [];
            const sessionType = sessionTypes.includes(req.query.loai_buoi)
                ? req.query.loai_buoi
                : sessionTypes[0] || '';
            const futureDate = selectedDate > todayKey;
            const students = selectedYearId && sessionType && !futureDate
                ? await AttendanceModel.getChoirStudents(selectedYearId, selectedDate, sessionType)
                : [];

            return res.render('ca-doan/diem-danh', {
                ...getCaDoanBaseData(req, 'Điểm danh ca đoàn'),
                years,
                selectedYearId,
                selectedDate,
                sessionTypes,
                sessionType,
                todayKey,
                futureDate,
                students,
                message: req.query.message || ''
            });
        } catch (error) {
            console.error('Lỗi tải trang điểm danh ca đoàn:', error);
            return res.status(500).send('Lỗi máy chủ khi tải trang điểm danh ca đoàn.');
        }
    },

    async markPresent(req, res) {
        const yearId = getPositiveInt(req.body.nien_khoa);
        const studentId = getPositiveInt(req.body.id_tn);
        const attendanceDate = String(req.body.ngay_diem_danh || '');
        const sessionType = String(req.body.loai_buoi || '');
        if (!yearId || !studentId || !isValidDate(attendanceDate)
            || attendanceDate > getTodayKey() || !isAttendanceSession(attendanceDate, sessionType)) {
            return res.status(400).json({ success: false, message: 'Ngày hoặc buổi lễ không hợp lệ.' });
        }

        try {
            const student = await AttendanceModel.markPresent({
                yearId,
                studentId,
                mstn: null,
                attendanceDate,
                sessionType,
                status: getAttendanceStatus(attendanceDate, sessionType),
                idTk: req.session.user.id_tk
            });
            broadcastBangDiemRefresh(req, yearId);
            broadcastAttendanceUpdate(req, yearId, student, attendanceDate, sessionType);
            return res.json({
                success: true,
                studentId: student.id_tn,
                status: student.trang_thai_diem_danh,
                name: student.ho_ten
            });
        } catch (error) {
            console.error('Lỗi điểm danh ca đoàn:', error);
            await logAction(req, `Điểm danh ca đoàn thất bại (Học viên ID: ${studentId}): ${error.message}`, 'Thất bại');
            const statusCode = error.code === 'NOT_FOUND' ? 404 : 500;
            return res.status(statusCode).json({
                success: false,
                message: statusCode === 404 ? error.message : 'Không thể lưu điểm danh ca đoàn.'
            });
        }
    },

    async scanQr(req, res) {
        const yearId = getPositiveInt(req.body.nien_khoa);
        const attendanceDate = String(req.body.ngay_diem_danh || '');
        const sessionType = String(req.body.loai_buoi || '');
        const qrPayload = parseQrValue(req.body.qr_value);
        if (!yearId || !qrPayload || (!qrPayload.studentId && !qrPayload.mstn)
            || !isValidDate(attendanceDate) || attendanceDate > getTodayKey()
            || !isAttendanceSession(attendanceDate, sessionType)) {
            return res.status(400).json({ success: false, message: 'QR, ngày hoặc loại buổi lễ không hợp lệ.' });
        }

        try {
            const student = await AttendanceModel.markPresent({
                yearId,
                studentId: qrPayload.studentId,
                mstn: qrPayload.mstn,
                attendanceDate,
                sessionType,
                status: getAttendanceStatus(attendanceDate, sessionType),
                idTk: req.session.user.id_tk
            });
            broadcastBangDiemRefresh(req, yearId);
            broadcastAttendanceUpdate(req, yearId, student, attendanceDate, sessionType);
            return res.json({
                success: true,
                studentId: student.id_tn,
                status: student.trang_thai_diem_danh,
                name: student.ho_ten,
                mstn: student.mstn
            });
        } catch (error) {
            console.error('Lỗi quét QR điểm danh ca đoàn:', error);
            await logAction(req, `Quét QR điểm danh ca đoàn thất bại (Ngày: ${attendanceDate}, Buổi: ${sessionType}): ${error.message}`, 'Thất bại');
            const statusCode = error.code === 'NOT_FOUND' ? 404 : 500;
            return res.status(statusCode).json({
                success: false,
                message: statusCode === 404 ? error.message : 'Không thể ghi nhận QR điểm danh.'
            });
        }
    }
};

module.exports = AttendanceController;
