const BangDiemModel = require('../../models/bdh/bang-diem-model');
const { getBdhBaseData } = require('../../utils/base-data-helper');
const pool = require('../../../config/database');
const { logAction } = require('../../utils/logger'); 

const BangDiemController = {
    async getBangDiemPage(req, res) {
        try {
            const academicYears = await BangDiemModel.getAcademicYears();
            const requestedYearId = req.query.nien_khoa;
            const selectedYearId = requestedYearId || academicYears[0]?.id_cau_hinh_nam_hoc;
            const selectedYear = academicYears.find(
                year => String(year.id_cau_hinh_nam_hoc) === String(selectedYearId)
            );
            const summary = selectedYearId
                ? await BangDiemModel.getSummaryByYear(selectedYearId)
                : [];
            const studentCount = selectedYearId
                ? await BangDiemModel.getStudentCountByYear(selectedYearId)
                : 0;

            return res.render('bdh/bang-diem', {
                ...getBdhBaseData(req, 'Bảng điểm tổng kết'),
                academicYears,
                selectedYearId,
                selectedYear,
                summary,
                studentCount
            });
        } catch (error) {
            console.error('❌ Lỗi tải bảng điểm tổng kết:', error);
            return res.status(500).send('Đã xảy ra lỗi khi tải bảng điểm tổng kết.');
        }
    },

    async tongKetDiem(req, res) {
        const yearId = Number(req.body.nien_khoa);
        if (!Number.isInteger(yearId)) {
            // Ghi audit thất bại do dữ liệu không hợp lệ
            await logAction(req, `Tổng kết điểm năm học (ID: ${req.body.nien_khoa}) thất bại: Niên khóa không hợp lệ`, 'Thất bại');
            return res.status(400).send('Niên khóa không hợp lệ.');
        }

        const client = await pool.connect();
        let transactionStarted = false;
        try {
            const yearResult = await client.query(
                'SELECT nien_khoa FROM CAU_HINH_NAM_HOC WHERE id_cau_hinh_nam_hoc = $1',
                [yearId]
            );
            if (yearResult.rows.length === 0) {
                await logAction(req, `Tổng kết điểm năm học (ID: ${yearId}) thất bại: Không tìm thấy niên khóa`, 'Thất bại');
                return res.status(404).send('Không tìm thấy niên khóa.');
            }

            const classes = await BangDiemModel.getClassesByYear(yearId);
            if (classes.length === 0) {
                await logAction(req, `Tổng kết điểm năm học ${yearResult.rows[0].nien_khoa} thất bại: Niên khóa chưa có lớp`, 'Thất bại');
                return res.status(400).send('Niên khóa chưa có lớp để tổng kết.');
            }

            await client.query('BEGIN');
            transactionStarted = true;
            for (const classItem of classes) {
                await client.query('CALL sp_tinh_tong_ket_nam_hoc($1, $2)', [yearId, classItem.id_lop]);
            }
            await client.query('COMMIT');

            // Ghi audit thành công
            await logAction(req, `Tổng kết điểm thành công cho năm học: ${yearResult.rows[0].nien_khoa}`, 'Thành công');

            return res.redirect(`/bdh/bang-diem?nien_khoa=${yearId}`);
        } catch (error) {
            if (transactionStarted) {
                await client.query('ROLLBACK');
            }
            console.error('❌ Lỗi tổng kết điểm:', error);
            
            // Ghi audit thất bại khi xảy ra lỗi hệ thống / database
            await logAction(req, `Tổng kết điểm năm học (ID: ${yearId}) thất bại do lỗi hệ thống`, 'Thất bại');

            return res.status(500).send('Đã xảy ra lỗi khi tổng kết điểm.');
        } finally {
            client.release();
        }
    }
};

module.exports = BangDiemController;