const pool = require('../../../config/database');

const ChuyenLopModel = {
    async getAcademicYears() {
        const { rows } = await pool.query(`
            SELECT id_cau_hinh_nam_hoc, nien_khoa
            FROM CAU_HINH_NAM_HOC
            ORDER BY nien_khoa DESC
        `);
        return rows;
    },

    async getPageData(yearId, sourceClassId) {
        const [khoiResult, classResult, studentResult] = await Promise.all([
            pool.query(`
                SELECT id_khoi, stt, ten_khoi
                FROM KHOI
                WHERE is_active = TRUE
                ORDER BY stt ASC, ten_khoi ASC
            `),
            pool.query(`
                SELECT l.id_lop, l.ten_lop, l.id_khoi, k.ten_khoi, k.stt
                FROM LOP_HOC l
                JOIN KHOI k ON k.id_khoi = l.id_khoi
                WHERE l.id_cau_hinh_nam_hoc = $1
                ORDER BY k.stt ASC, l.ten_lop ASC
            `, [yearId]),
            sourceClassId
                ? pool.query(`
                    SELECT tn.id_tn, tn.mstn,
                           CONCAT_WS(' ', tn.ten_thanh, tn.ho_va_ten_lot, tn.ten) AS ho_ten,
                              TO_CHAR(tn.ngay_sinh, 'DD/MM/YYYY') AS ngay_sinh,
                              tn.gioi_tinh, pl.id_lop, l.ten_lop, k.ten_khoi
                    FROM PHAN_LOP pl
                    JOIN THIEU_NHI tn ON tn.id_tn = pl.id_tn
                    JOIN LOP_HOC l ON l.id_lop = pl.id_lop
                    JOIN KHOI k ON k.id_khoi = l.id_khoi
                    WHERE pl.id_cau_hinh_nam_hoc = $1
                      AND pl.id_lop = $2
                      AND pl.trang_thai = 'Đang học'
                    ORDER BY tn.ten ASC, tn.ho_va_ten_lot ASC, tn.ten_thanh ASC
                `, [yearId, sourceClassId])
                : { rows: [] }
        ]);

        return {
            khoiList: khoiResult.rows,
            classList: classResult.rows,
            students: studentResult.rows
        };
    },

    async moveStudents({ yearId, sourceClassId, targetClassId, studentIds }) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const classes = await client.query(`
                SELECT id_lop
                FROM LOP_HOC
                WHERE id_lop = ANY($1::int[])
                  AND id_cau_hinh_nam_hoc = $2
            `, [[sourceClassId, targetClassId], yearId]);
            if (classes.rows.length !== 2) {
                throw new Error('Lớp nguồn hoặc lớp đích không thuộc niên khóa đã chọn.');
            }

            const result = await client.query(`
                UPDATE PHAN_LOP
                SET id_lop = $1
                WHERE id_cau_hinh_nam_hoc = $2
                  AND id_lop = $3
                  AND id_tn = ANY($4::int[])
                  AND trang_thai = 'Đang học'
                RETURNING id_tn
            `, [targetClassId, yearId, sourceClassId, studentIds]);

            if (!result.rows.length) {
                throw new Error('Không tìm thấy thiếu nhi hợp lệ để chuyển lớp.');
            }

            await client.query('COMMIT');
            return result.rows.length;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
};

module.exports = ChuyenLopModel;