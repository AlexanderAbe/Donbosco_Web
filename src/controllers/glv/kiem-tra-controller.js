const BaseGlvModel = require('../../models/glv/base-glv-model');
const KiemTraModel = require('../../models/glv/kiem-tra-model');
const { logAction } = require('../../utils/logger');
const { getCurrentYear } = require('../../utils/current-year-helper');

const getId = value => {
    const id = Number.parseInt(value, 10);
    return Number.isInteger(id) && id > 0 ? id : null;
};

const KiemTraController = {
    async getKiemTra(req, res) {
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
            const examCount = selectedYearId
                ? await KiemTraModel.getExamCount(selectedYearId)
                : 0;
            const requestedExam = getId(req.query.bai_kiem_tra);
            const selectedExam = requestedExam && requestedExam <= examCount ? requestedExam : 1;
            const students = selectedYearId && selectedClassId
                ? await KiemTraModel.getExamStudents(idGlv, selectedYearId, selectedClassId, selectedExam)
                : [];

            // Lấy ngày kiểm tra từ học sinh đầu tiên (nếu có dữ liệu) để hiển thị lên input date
            let selectedDate = '';
            if (students.length > 0 && students[0].ngay_kiem_tra) {
                // Định dạng ngày sang YYYY-MM-DD để hiển thị chuẩn trong input[type="date"]
                const d = new Date(students[0].ngay_kiem_tra);
                if (!isNaN(d.getTime())) {
                    selectedDate = d.toISOString().split('T')[0];
                }
            }

            return res.render('glv/kiem-tra', {
                title: 'Nhập điểm kiểm tra',
                selectedYearId,
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

    async saveKiemTra(req, res) {
        const idGlv = req.session.user?.id_glv;
        const yearId = getId(req.body.nien_khoa);
        const classId = getId(req.body.id_lop);
        const examNumber = getId(req.body.bai_kiem_tra);
        const ngayKiemTra = req.body.ngay_kiem_tra || null; // Lấy ngày kiểm tra từ form gửi lên
        const scores = Array.isArray(req.body.scores) ? req.body.scores : [];

        if (!yearId || !classId || !examNumber) {
            await logAction(req, `Lưu điểm kiểm tra thất bại: Thông tin bài kiểm tra, lớp hoặc niên khóa không hợp lệ (Lớp ID: ${req.body.id_lop}, Bài KT: ${req.body.bai_kiem_tra})`, 'Thất bại');
            return res.status(400).send('Thông tin bài kiểm tra không hợp lệ.');
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

            return res.redirect(`/glv/kiem-tra?nien_khoa=${yearId}&id_lop=${classId}&bai_kiem_tra=${examNumber}&message=Đã lưu điểm kiểm tra.`);
        } catch (error) {
            console.error('Lỗi lưu điểm kiểm tra GLV:', error);
            const errMessage = error.message || 'Không thể lưu điểm kiểm tra.';

            await logAction(req, `Lưu điểm kiểm tra thất bại cho Lớp ID: ${classId} (Bài kiểm tra số: ${examNumber}): ${errMessage}`, 'Thất bại');

            const query = new URLSearchParams({
                nien_khoa: req.body.nien_khoa || '',
                id_lop: req.body.id_lop || '',
                bai_kiem_tra: req.body.bai_kiem_tra || '',
                error: errMessage
            });
            return res.redirect(`/glv/kiem-tra?${query.toString()}`);
        }
    }
};

module.exports = KiemTraController;