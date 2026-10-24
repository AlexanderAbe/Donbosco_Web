const xlsx = require('xlsx');
const ScoreImportModel = require('../../models/admin/score-import-model');
const { getAdminBaseData } = require('../../utils/base-data-helper');
const { logAction } = require('../../utils/logger');
const { parseWorkbook, SCORE_SHEETS } = require('../../utils/score-import-parser');
const { broadcastBangDiemRefresh } = require('../../utils/bang-diem-realtime');

const getId = value => {
    const id = Number.parseInt(value, 10);
    return Number.isInteger(id) && id > 0 ? id : null;
};

const getPageData = async (req, yearValue, classValue) => {
    const years = await ScoreImportModel.getOptions();
    const requestedYearId = getId(yearValue);
    const selectedYear = years.find(year => year.id_cau_hinh_nam_hoc === requestedYearId) || years[0] || null;
    const classes = selectedYear
        ? await ScoreImportModel.getClasses(selectedYear.id_cau_hinh_nam_hoc)
        : [];
    const requestedClassId = getId(classValue);
    const selectedClass = classes.find(item => item.id_lop === requestedClassId) || classes[0] || null;
    return {
        ...getAdminBaseData(req, 'Import bảng điểm'),
        years,
        classes,
        selectedYearId: selectedYear?.id_cau_hinh_nam_hoc || '',
        selectedClassId: selectedClass?.id_lop || '',
        selectedYear: selectedYear?.nien_khoa || '',
        selectedClass: selectedClass?.ten_lop || ''
    };
};

const renderPage = async (req, res, options = {}) => {
    const pageData = await getPageData(req, options.yearId ?? req.query.yearId, options.classId ?? req.query.classId);
    return res.status(options.status || 200).render('admin/score-import', {
        ...pageData,
        success: options.success || '',
        error: options.error || '',
        validationErrors: options.validationErrors || []
    });
};

const getSchoolYear = year => {
    const match = String(year).match(/^(\d{4})-(\d{4})$/);
    if (!match || Number(match[2]) !== Number(match[1]) + 1) {
        throw new Error('Niên khóa không đúng định dạng năm-năm liên tiếp.');
    }
    return [Number(match[1]), Number(match[2])];
};

const attendanceSessions = year => {
    const [startYear, endYear] = getSchoolYear(year);
    const sessions = [];
    for (let month = 9; month <= 12; month += 1) addMonthSessions(sessions, startYear, month);
    for (let month = 1; month <= 8; month += 1) addMonthSessions(sessions, endYear, month);
    return sessions;
};

function addMonthSessions(sessions, year, month) {
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    for (let day = 1; day <= daysInMonth; day += 1) {
        const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
        const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (weekday === 2) sessions.push({ date, label: 'T3', type: 'Lễ Thứ 3' });
        else if (weekday === 4) sessions.push({ date, label: 'T5', type: 'Lễ Thứ 5' });
        else if (weekday === 0) {
            sessions.push({ date, label: 'Lễ', type: 'Lễ Chúa Nhật' });
            sessions.push({ date, label: 'GL', type: 'Học Giáo Lý' });
        }
    }
}

const buildTemplate = data => {
    const workbook = xlsx.utils.book_new();
    const examCount = Math.max(0, data.year.so_luong_bai_ktra);
    const examScores = new Map();
    const examDates = new Map();
    for (const row of data.examScores) {
        const key = `${row.id_tn}|${row.stt_bai_ktra}`;
        examScores.set(key, row.diem_so);
        if (row.ngay_kiem_tra) examDates.set(row.stt_bai_ktra, row.ngay_kiem_tra);
    }
    const examSheet = [
        ['STT', 'Mã số', 'Tên thánh', 'Họ và tên lót', 'Tên', ...Array.from({ length: examCount }, (_, index) => examDates.get(index + 1) || '')],
        ['', '', '', '', '', ...Array.from({ length: examCount }, (_, index) => `Bài ${index + 1}`)]
    ];
    data.students.forEach((student, index) => {
        examSheet.push([
            index + 1,
            String(student.mstn || ''),
            student.ten_thanh || '',
            student.ho_va_ten_lot || '',
            student.ten || '',
            ...Array.from({ length: examCount }, (_, examIndex) => examScores.get(`${student.id_tn}|${examIndex + 1}`) ?? '')
        ]);
    });
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet(examSheet), SCORE_SHEETS.exams);

    const existingAttendance = new Map(data.attendance.map(row => [
        `${row.id_tn}|${row.ngay_diem_danh}|${row.loai_buoi}`,
        row.trang_thai
    ]));
    const statusCodes = new Map([
        ['Đi sớm', 'S'],
        ['Có mặt', '-'],
        ['Vắng không phép', 'V'],
        ['Vắng phép', 'P']
    ]);
    const sessions = attendanceSessions(data.year.nien_khoa);
    const currentStudents = data.students.filter(student => student.trang_thai === 'Đang học');
    const attendanceSheet = [
        ['STT', 'Mã TN', 'Tên thánh', 'Họ và tên lót', 'Tên', ...sessions.map(session => session.date)],
        ['', '', '', '', '', ...sessions.map(session => session.label)]
    ];
    currentStudents.forEach((student, index) => {
        attendanceSheet.push([
            index + 1,
            String(student.mstn || ''),
            student.ten_thanh || '',
            student.ho_va_ten_lot || '',
            student.ten || '',
            ...sessions.map(session => statusCodes.get(existingAttendance.get(
                `${student.id_tn}|${session.date}|${session.type}`
            )) || '')
        ]);
    });
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet(attendanceSheet), SCORE_SHEETS.attendance);

    const existingDiscipline = new Map(data.disciplineScores.map(row => [
        `${row.id_tn}|${row.thang}`,
        row.diem
    ]));
    const disciplineSheet = [
        ['STT', 'Mã số', 'Tên thánh', 'Họ và tên lót', 'Tên', ...Array.from({ length: 12 }, (_, index) => `Tháng ${index + 1}`)]
    ];
    data.students.forEach((student, index) => {
        disciplineSheet.push([
            index + 1,
            String(student.mstn || ''),
            student.ten_thanh || '',
            student.ho_va_ten_lot || '',
            student.ten || '',
            ...Array.from({ length: 12 }, (_, monthIndex) => existingDiscipline.get(`${student.id_tn}|${monthIndex + 1}`) ?? '')
        ]);
    });
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet(disciplineSheet), SCORE_SHEETS.discipline);

    return workbook;
};

const ScoreImportController = {
    async getPage(req, res) {
        try {
            return await renderPage(req, res);
        } catch (error) {
            console.error('Lỗi tải trang import bảng điểm:', error);
            return res.status(500).send('Lỗi máy chủ khi tải trang import bảng điểm.');
        }
    },

    async downloadTemplate(req, res) {
        const yearId = getId(req.query.yearId);
        const classId = getId(req.query.classId);
        if (!yearId || !classId) {
            return res.status(400).send('Vui lòng chọn niên khóa và lớp hợp lệ.');
        }
        try {
            const data = await ScoreImportModel.getTemplateData(yearId, classId);
            const buffer = xlsx.write(buildTemplate(data), { type: 'buffer', bookType: 'xlsx' });
            const fileName = `mau-diem-${data.year.nien_khoa}-${data.classInfo.ten_lop}`
                .replace(/[^\p{L}\p{N}-]+/gu, '-');
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(`${fileName}.xlsx`)}`);
            return res.send(buffer);
        } catch (error) {
            console.error('Lỗi tạo mẫu import bảng điểm:', error);
            return res.status(400).send(error.message || 'Không thể tạo file mẫu.');
        }
    },

    async importWorkbook(req, res) {
        const yearId = getId(req.body.yearId);
        const classId = getId(req.body.classId);
        if (!yearId || !classId || !req.file) {
            return renderPage(req, res, {
                yearId,
                classId,
                status: 400,
                error: !req.file ? 'Vui lòng chọn file Excel.' : 'Vui lòng chọn niên khóa và lớp hợp lệ.'
            });
        }
        if (!/\.(xlsx|xls)$/i.test(req.file.originalname || '')) {
            return renderPage(req, res, {
                yearId,
                classId,
                status: 400,
                error: 'File tải lên phải có định dạng .xlsx hoặc .xls.'
            });
        }

        try {
            const context = await ScoreImportModel.getContext(yearId, classId);
            const workbook = xlsx.read(req.file.buffer, { type: 'buffer', cellDates: true });
            const parsedWorkbook = parseWorkbook(xlsx, workbook, context.year.nien_khoa);
            const result = await ScoreImportModel.importWorkbook(yearId, classId, parsedWorkbook);
            const io = req.app.get('io');
            if (io) {
                broadcastBangDiemRefresh(req, yearId);
                for (const column of parsedWorkbook.exams.columns) {
                    io.to(`exam_${yearId}_${classId}_${column.number}`).emit('score_import_completed');
                }
                for (const column of parsedWorkbook.attendance.columns) {
                    const room = `attendance_${yearId}_${classId}_${column.date}_${encodeURIComponent(column.type)}`;
                    io.to(room).emit('score_import_completed');
                }
                for (const column of parsedWorkbook.discipline.columns) {
                    io.to(`class_${classId}_month_${column.month}`).emit('score_import_completed');
                }
            }
            await logAction(
                req,
                `Import điểm lớp ${context.classInfo.ten_lop}, niên khóa ${context.year.nien_khoa}: ${result.examScores} điểm kiểm tra, ${result.attendanceEntries} buổi chuyên cần, ${result.disciplineScores} điểm kỷ luật`,
                'Thành công'
            );
            return renderPage(req, res, {
                yearId,
                classId,
                success: `Import hoàn tất: ${result.examScores} điểm kiểm tra, ${result.attendanceEntries} trạng thái chuyên cần, ${result.disciplineScores} điểm kỷ luật.`
            });
        } catch (error) {
            const validationErrors = error.validationErrors || [];
            if (validationErrors.length) {
                await logAction(req, `Import điểm thất bại: ${validationErrors.length} lỗi dữ liệu trong file`, 'Thất bại');
                return renderPage(req, res, { yearId, classId, status: 400, validationErrors });
            }
            if (error.code === 'P0001' && error.message?.includes('Thiếu nhi có buổi vắng')) {
                const message = 'Không thể nhập 10 điểm kỷ luật: thiếu nhi cần có ít nhất một buổi điểm danh và tất cả buổi trong tháng phải là có mặt hoặc đi sớm.';
                await logAction(req, `Import điểm thất bại: ${message}`, 'Thất bại');
                return renderPage(req, res, { yearId, classId, status: 400, error: message });
            }
            console.error('Lỗi import bảng điểm:', error);
            await logAction(req, `Import điểm thất bại: ${error.message}`, 'Thất bại');
            return renderPage(req, res, {
                yearId,
                classId,
                status: 400,
                error: error.message || 'Không thể import file.'
            });
        }
    }
};

module.exports = ScoreImportController;
