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
            const { selectedYearId, selectedYear } = getCurrentYear(years, req.session);
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
                academicYear: selectedYear?.nien_khoa || '',
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

    async getDisciplineScoresForPrint(req, res) {
        const idGlv = req.session.user?.id_glv;
        const classId = getId(req.body?.id_lop);
        if (!classId) {
            return res.status(400).json({ error: 'Lớp cần in không hợp lệ.' });
        }

        try {
            const years = await BaseGlvModel.getAcademicYears(idGlv);
            const { selectedYearId, selectedYear } = getCurrentYear(years, req.session);
            const academicYear = /^(\d{4})-(\d{4})$/.exec(selectedYear?.nien_khoa || '');
            if (!selectedYearId || !academicYear) {
                return res.status(400).json({ error: 'Không xác định được niên khóa để in điểm kỷ luật.' });
            }

            const disciplineData = await KyLuatModel.getDisciplineScoresForPrint(
                idGlv,
                selectedYearId,
                classId
            );
            return res.json({
                className: disciplineData.className,
                academicYear: selectedYear.nien_khoa,
                months: [
                    ...Array.from({ length: 4 }, (_, index) => ({
                        month: index + 9,
                        year: Number(academicYear[1])
                    })),
                    ...Array.from({ length: 8 }, (_, index) => ({
                        month: index + 1,
                        year: Number(academicYear[2])
                    }))
                ],
                students: disciplineData.students
            });
        } catch (error) {
            console.error('Lỗi tải dữ liệu in điểm kỷ luật GLV:', error);
            const status = error.code === 'FORBIDDEN' ? 403 : 500;
            return res.status(status).json({
                error: status === 403 ? error.message : 'Lỗi máy chủ khi tải dữ liệu in điểm kỷ luật.'
            });
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
    },

    async saveDisciplineScoreEntry(req, res) {
        const idGlv = req.session.user?.id_glv;
        const yearId = getId(req.body.nien_khoa);
        const classId = getId(req.body.id_lop);
        const month = getId(req.body.thang);
        const studentId = getId(req.body.id_tn);
        const rawScore = String(req.body.diem ?? '').trim();

        const score = rawScore === '' ? null : Number(rawScore);
        if (!yearId || !classId || !month || month > 12 || !studentId
            || (score !== null && (!Number.isFinite(score) || score < 0 || score > 10))) {
            return res.status(400).json({ success: false, message: 'Thông tin điểm kỷ luật không hợp lệ.' });
        }

        try {
            await KyLuatModel.saveDisciplineScores(
                idGlv, yearId, classId, month, [{ id_tn: studentId, diem: rawScore }], false
            );

            // --- BỔ SUNG WEBSOCKET REAL-TIME Ở ĐÂY ---
            const io = req.app.get('io');
            if (io) {
                // Tạo phòng riêng biệt theo cả Lớp và Tháng để tránh nhầm dữ liệu
                io.to(`class_${classId}_month_${month}`).emit('discipline_score_updated', {
                    studentId,
                    newScore: rawScore
                });
            }
            // ----------------------------------------

            return res.json({ success: true });
        } catch (error) {
            console.error('Lỗi lưu điểm kỷ luật thiếu nhi:', error);
            const status = error.code === 'FORBIDDEN' ? 403
                : error.code === 'DISCIPLINE_ABSENCE'
                    || error.message === 'Điểm kỷ luật phải nằm trong khoảng từ 0 đến 10.' ? 400
                    : 500;
            return res.status(status).json({
                success: false,
                message: status === 500 ? 'Không thể lưu điểm kỷ luật.' : error.message
            });
        }
    }
};

module.exports = KyLuatController;