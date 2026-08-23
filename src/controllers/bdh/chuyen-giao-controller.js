const PDFDocument = require('pdfkit');
const path = require('path');
const pool = require('../../../config/database');
const NamHocMoiModel = require('../../models/bdh/chuyen-giao');
const { getBdhBaseData } = require('../../utils/base-data-helper');

const getYearId = value => Number(value);

const ChuyenGiaoController = {
    async getPage(req, res) {
        try {
            const academicYears = await NamHocMoiModel.getAcademicYears();
            const selectedOldId = getYearId(req.query.nien_khoa_cu) || academicYears[0]?.id_cau_hinh_nam_hoc;
            const selectedNewId = getYearId(req.query.nien_khoa_moi);
            const oldYear = academicYears.find(year => year.id_cau_hinh_nam_hoc === selectedOldId);
            const newYear = academicYears.find(year => year.id_cau_hinh_nam_hoc === selectedNewId);
            const hasSummary = selectedOldId ? await NamHocMoiModel.hasSummary(selectedOldId) : false;

            return res.render('bdh/chuyen-giao', {
                ...getBdhBaseData(req, 'Chuyển giao niên khóa'),
                academicYears,
                selectedOldId,
                selectedNewId,
                oldYear,
                newYear,
                hasSummary,
                message: req.query.message || null
            });
        } catch (error) {
            console.error('❌ Lỗi tải trang chuyển giao:', error);
            return res.status(500).send('Đã xảy ra lỗi khi tải trang chuyển giao.');
        }
    },

    async lockYear(req, res) {
        const yearId = getYearId(req.body.nien_khoa_cu);
        try {
            if (!Number.isInteger(yearId)) return res.status(400).send('Niên khóa không hợp lệ.');
            if (!(await NamHocMoiModel.hasSummary(yearId))) {
                return res.status(400).send('Cần tổng kết điểm trước khi khóa niên khóa.');
            }
            await NamHocMoiModel.lockNienKhoa(yearId);
            return res.redirect(`/bdh/chuyen-giao?nien_khoa_cu=${yearId}&message=Đã khóa niên khóa thành công.`);
        } catch (error) {
            console.error('❌ Lỗi khóa niên khóa:', error);
            return res.status(500).send('Đã xảy ra lỗi khi khóa niên khóa.');
        }
    },

    async transferYear(req, res) {
        const oldYearId = getYearId(req.body.nien_khoa_cu);
        const newYearId = getYearId(req.body.nien_khoa_moi);
        const client = await pool.connect();
        let transactionStarted = false;

        try {
            if (!Number.isInteger(oldYearId) || !Number.isInteger(newYearId) || oldYearId === newYearId) {
                return res.status(400).send('Niên khóa chuyển giao không hợp lệ.');
            }
            if (!(await NamHocMoiModel.hasSummary(oldYearId))) {
                return res.status(400).send('Cần tổng kết điểm trước khi chuyển giao.');
            }
            const oldYear = (await NamHocMoiModel.getAcademicYears())
                .find(year => year.id_cau_hinh_nam_hoc === oldYearId);
            if (!oldYear?.is_locked) {
                return res.status(400).send('Cần khóa niên khóa cũ trước khi chuyển giao.');
            }
            const years = await NamHocMoiModel.getAcademicYears();
            const newYear = years.find(year => year.id_cau_hinh_nam_hoc === newYearId);
            if (!newYear) {
                return res.status(404).send('Không tìm thấy niên khóa mới.');
            }
            if (newYear.is_locked) {
                return res.status(400).send('Không thể chuyển giao vào niên khóa đã khóa.');
            }

            await client.query('BEGIN');
            transactionStarted = true;
            await client.query('CALL sp_chuyen_giao_nien_khoa($1, $2)', [oldYearId, newYearId]);
            await client.query('COMMIT');

            return res.redirect(`/bdh/chuyen-giao?nien_khoa_cu=${oldYearId}&nien_khoa_moi=${newYearId}&message=Đã chuyển giao học sinh thành công.`);
        } catch (error) {
            if (transactionStarted) await client.query('ROLLBACK');
            console.error('❌ Lỗi chuyển giao niên khóa:', error);
            return res.status(500).send('Đã xảy ra lỗi khi chuyển giao niên khóa.');
        } finally {
            client.release();
        }
    },

    async exportAwards(req, res) {
        try {
            const yearId = getYearId(req.query.nien_khoa_cu);
            const academicYears = await NamHocMoiModel.getAcademicYears();
            const year = academicYears.find(item => item.id_cau_hinh_nam_hoc === yearId);
            if (!year) return res.status(404).send('Không tìm thấy niên khóa.');
            if (!(await NamHocMoiModel.hasSummary(yearId))) {
                return res.status(400).send('Niên khóa chưa có dữ liệu tổng kết.');
            }

            const students = await NamHocMoiModel.getAwardStudents(yearId);
            if (students.length === 0) return res.status(404).send('Không có học sinh đạt điều kiện nhận bằng khen.');

            const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });
            const fontPath = path.join(__dirname, '../../../public/fonts');
            doc.registerFont('Roboto', path.join(fontPath, 'Roboto-Regular.ttf'));
            doc.registerFont('Roboto-Bold', path.join(fontPath, 'Roboto-Bold.ttf'));
            const backgroundPath = path.join(__dirname, '../../../public/imgs/mau-bang-khen.png');

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=Bang_Khen_${year.nien_khoa.replace(/\s+/g, '_')}.pdf`);
            doc.pipe(res);

            students.forEach((student, index) => {
                if (index > 0) doc.addPage({ size: 'A4', layout: 'landscape', margin: 0 });
                doc.image(backgroundPath, 0, 0, { width: 842, height: 595 });
                doc.font('Roboto-Bold').fontSize(19).fillColor('#111827');
                const fullName = `${student.ten_thanh || ''} ${student.ho_va_ten_lot || ''} ${student.ten || ''}`.trim();
                doc.text(fullName, 180, 222.5, { width: 520, lineBreak: false });
                doc.fontSize(18).text(student.ten_khoi || '', 383, 253, { width: 380, lineBreak: false });
                doc.text(year.nien_khoa, 230, 280.8, { width: 190, lineBreak: false });
                doc.text(student.ten_xep_loai || '', 470, 280.5, { width: 250, lineBreak: false });
                const today = new Date();
                doc.fontSize(12).font('Roboto-Bold');
                doc.text(String(today.getDate()).padStart(2, '0'), 622.4, 410.2, { width: 26, align: 'center', lineBreak: false });
                doc.text(String(today.getMonth() + 1).padStart(2, '0'), 680, 410.2, { width: 26, align: 'center', lineBreak: false });
                doc.text(String(today.getFullYear()), 724.2, 410.2, { width: 45, align: 'center', lineBreak: false });
            });
            doc.end();
        } catch (error) {
            console.error('❌ Lỗi xuất bằng khen:', error);
            if (!res.headersSent) return res.status(500).send('Đã xảy ra lỗi khi xuất bằng khen.');
        }
    }
};

module.exports = ChuyenGiaoController;