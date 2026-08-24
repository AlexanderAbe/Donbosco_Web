const pool = require('../../../config/database');

const BaseGlvModel = {
    async getAcademicYears(idGlv) {
        const { rows } = await pool.query(`
            SELECT id_cau_hinh_nam_hoc, nien_khoa
            FROM CAU_HINH_NAM_HOC
            ORDER BY nien_khoa DESC
        `);
        return rows;
    },

    async getAssignedClasses(idGlv, yearId) {
        const { rows } = await pool.query(`
            SELECT l.id_lop, l.ten_lop, k.ten_khoi,
                   COUNT(pl.id_tn)::int AS student_count
            FROM PHAN_CONG_GLV pc
            JOIN LOP_HOC l ON l.id_lop = pc.id_lop
            JOIN KHOI k ON k.id_khoi = l.id_khoi
            LEFT JOIN PHAN_LOP pl
                ON pl.id_lop = l.id_lop
                AND pl.id_cau_hinh_nam_hoc = pc.id_cau_hinh_nam_hoc
                AND pl.trang_thai = 'Đang học'
            WHERE pc.id_glv = $1
              AND pc.id_cau_hinh_nam_hoc = $2
            GROUP BY l.id_lop, l.ten_lop, k.ten_khoi, k.stt
            ORDER BY k.stt, l.ten_lop
        `, [idGlv, yearId]);

        for (const classItem of rows) {
            const result = await pool.query(`
                SELECT tn.id_tn, tn.mstn, tn.ten_thanh, tn.ho_va_ten_lot, tn.ten,
                       tn.gioi_tinh, tn.ngay_sinh, tn.dia_chi, pl.trang_thai
                FROM PHAN_LOP pl
                JOIN THIEU_NHI tn ON tn.id_tn = pl.id_tn
                WHERE pl.id_lop = $1
                  AND pl.id_cau_hinh_nam_hoc = $2
                ORDER BY tn.ten, tn.ho_va_ten_lot, tn.ten_thanh
            `, [classItem.id_lop, yearId]);
            classItem.students = result.rows;
        }
        return rows;
    }
};

module.exports = BaseGlvModel;
