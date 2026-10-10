const BaseGlvModel = require('../../models/glv/base-glv-model');
const KiemTraModel = require('../../models/glv/kiem-tra-model');
const { logAction } = require('../../utils/logger');
const { getCurrentYear } = require('../../utils/current-year-helper');

const getId = value => {
    const id = Number.parseInt(value, 10);
    return Number.isInteger(id) && id > 0 ? id : null;
};

const isValidDateKey = value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};

const KiemTraController = {
    async getKiemTra(req, res) {
        try {
            const idGlv = req.session.user.id_glv;
            const years = await BaseGlvModel.getAcademicYears(idGlv);
            const { selectedYearId, selectedYear } = getCurrentYear(years, req.session);
            const classes = selectedYearId
                ? await BaseGlvModel.getAssignedClasses(idGlv, selectedYearId)
                : [];
            const requestedClass = getId(req.query.id_lop);
            const selectedClassId = classes.some(item => item.id_lop === requestedClass)
                ? requestedClass
                : classes[0]?.id_lop;
            const examCount = selectedYearId
                ? await KiemTraModel.getExamCount(selectedYearId)
                : 0;
            const requestedExam = getId(req.query.bai_kiem_tra);
            const selectedExam = requestedExam && requestedExam <= examCount ? requestedExam : 1;
            const students = selectedYearId && selectedClassId
                ? await KiemTraModel.getExamStudents(idGlv, selectedYearId, selectedClassId, selectedExam)
                : [];

            const savedDate = students.find(student => student.da_luu && student.ngay_kiem_tra)?.ngay_kiem_tra;
            const savedDateKey = savedDate instanceof Date
                ? `${savedDate.getFullYear()}-${String(savedDate.getMonth() + 1).padStart(2, '0')}-${String(savedDate.getDate()).padStart(2, '0')}`
                : String(savedDate || '').slice(0, 10);
            const selectedDate = Object.hasOwn(req.query, 'ngay_kiem_tra')
                ? (isValidDateKey(req.query.ngay_kiem_tra) ? req.query.ngay_kiem_tra : '')
                : (isValidDateKey(savedDateKey) ? savedDateKey : '');

            return res.render('glv/kiem-tra', {
                title: 'Nhập điểm kiểm tra',
                selectedYearId,
                academicYear: selectedYear?.nien_khoa || '',
                classes,
                selectedClassId,
                examCount,
                selectedExam,
                students,
                selectedDate, // Truyền ngày kiểm tra xuống view
                message: req.query.message || null,
                error: req.query.error || null
            });
        } catch (error) {
            console.error('Lỗi tải trang nhập điểm GLV:', error);
            return res.status(500).send('Lỗi server khi tải trang nhập điểm.');
        }
    },

    async getExamScoresForPrint(req, res) {
        const idGlv = req.session.user?.id_glv;
        const classId = getId(req.body?.id_lop);
        const fromExam = getId(req.body?.bai_tu);
        const toExam = getId(req.body?.bai_den);
        if (!classId || !fromExam || !toExam || fromExam > toExam) {
            return res.status(400).json({
                error: 'Khoảng bài kiểm tra không hợp lệ.'
            });
        }

        try {
            const years = await BaseGlvModel.getAcademicYears(idGlv);
            const { selectedYearId, selectedYear } = getCurrentYear(years, req.session);
            if (!selectedYearId) {
                return res.status(400).json({ error: 'Không xác định được niên khóa để in điểm kiểm tra.' });
            }

            const examData = await KiemTraModel.getExamScoresForPrint(
                idGlv,
                selectedYearId,
                classId,
                fromExam,
                toExam
            );
            return res.json({
                className: examData.className,
                academicYear: selectedYear?.nien_khoa || '',
                fromExam,
                toExam,
                students: examData.students
            });
        } catch (error) {
            console.error('Lỗi tải dữ liệu in điểm kiểm tra GLV:', error);
            const status = error.code === 'FORBIDDEN' ? 403
                : error.code === 'INVALID_EXAM_RANGE' ? 400
                    : 500;
            return res.status(status).json({
                error: status === 403 || status === 400
                    ? error.message
                    : 'Lỗi máy chủ khi tải dữ liệu in điểm kiểm tra.'
            });
        }
    },

    async saveKiemTra(req, res) {
        const idGlv = req.session.user?.id_glv;
        const yearId = getId(req.body.nien_khoa);
        const classId = getId(req.body.id_lop);
        const examNumber = getId(req.body.bai_kiem_tra);
        const ngayKiemTra = req.body.ngay_kiem_tra || null; // Lấy ngày kiểm tra từ form gửi lên
        const scores = Array.isArray(req.body.scores) ? req.body.scores : [];

        if (!yearId || !classId || !examNumber || !isValidDateKey(ngayKiemTra)) {
            await logAction(req, `Lưu điểm kiểm tra thất bại: Thông tin bài kiểm tra, lớp hoặc niên khóa không hợp lệ (Lớp ID: ${req.body.id_lop}, Bài KT: ${req.body.bai_kiem_tra})`, 'Thất bại');
            return res.status(400).send('Vui lòng chọn ngày kiểm tra hợp lệ.');
        }

        try {
            await KiemTraModel.saveExamScores(
                idGlv,
                yearId,
                classId,
                examNumber,
                scores,
                ngayKiemTra // Truyền thêm ngày kiểm tra vào Model
            );

            await logAction(req, `Lưu điểm kiểm tra thành công cho Lớp ID: ${classId} (Bài kiểm tra số: ${examNumber}, Ngày: ${ngayKiemTra || 'Không có'}, Niên khóa ID: ${yearId})`, 'Thành công');

            const query = new URLSearchParams({
                nien_khoa: yearId,
                id_lop: classId,
                bai_kiem_tra: examNumber,
                ngay_kiem_tra: ngayKiemTra || '',
                message: 'Đã lưu điểm kiểm tra.'
            });
            return res.redirect(`/glv/kiem-tra?${query.toString()}`);
        } catch (error) {
            console.error('Lỗi lưu điểm kiểm tra GLV:', error);
            const errMessage = error.message || 'Không thể lưu điểm kiểm tra.';

            await logAction(req, `Lưu điểm kiểm tra thất bại cho Lớp ID: ${classId} (Bài kiểm tra số: ${examNumber}): ${errMessage}`, 'Thất bại');

            const query = new URLSearchParams({
                nien_khoa: req.body.nien_khoa || '',
                id_lop: req.body.id_lop || '',
                bai_kiem_tra: req.body.bai_kiem_tra || '',
                ngay_kiem_tra: ngayKiemTra || '',
                error: errMessage
            });
            return res.redirect(`/glv/kiem-tra?${query.toString()}`);
        }
    },

    async saveExamScoreEntry(req, res) {
        const idGlv = req.session.user?.id_glv;
        const yearId = getId(req.body.nien_khoa);
        const classId = getId(req.body.id_lop);
        const examNumber = getId(req.body.bai_kiem_tra);
        const studentId = getId(req.body.id_tn);
        const rawScore = String(req.body.diem_so ?? '').trim();
        const examDate = req.body.ngay_kiem_tra || null;

        const score = rawScore === '' ? null : Number(rawScore);
        if (!yearId || !classId || !examNumber || !studentId || !isValidDateKey(examDate)
            || (score !== null && (!Number.isFinite(score) || score < 0 || score > 10))
        ) {
            return res.status(400).json({ success: false, message: 'Thông tin điểm kiểm tra không hợp lệ.' });
        }

        try {
            await KiemTraModel.saveExamScores(
                idGlv, yearId, classId, examNumber,
                [{ id_tn: studentId, diem_so: rawScore }],
                examDate,
                false
            );
            return res.json({ success: true });
        } catch (error) {
            console.error('Lỗi lưu điểm kiểm tra thiếu nhi:', error);
            const status = error.code === 'FORBIDDEN' ? 403
                : error.message === 'Điểm phải nằm trong khoảng từ 0 đến 10.' ? 400
                    : 500;
            return res.status(status).json({
                success: false,
                message: status === 500 ? 'Không thể lưu điểm kiểm tra.' : error.message
            });
        }
    }
};

module.exports = KiemTraController;