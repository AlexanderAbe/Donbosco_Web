const pool = require('../../../config/database');

const LopModel = {
    async getAcademicYears() {
        const query = `
            SELECT id_cau_hinh_nam_hoc, nien_khoa
            FROM CAU_HINH_NAM_HOC
            ORDER BY nien_khoa DESC
        `;
        const { rows } = await pool.query(query);
        return rows;
    },

    async getActiveKhoi() {
        const query = `
            SELECT id_khoi, stt, ten_khoi
            FROM KHOI
            WHERE is_active = TRUE
            ORDER BY stt ASC, ten_khoi ASC
        `;
        const { rows } = await pool.query(query);
        return rows;
    },

    async getByAcademicYear(idCauHinhNamHoc) {
        const query = `
            SELECT
                l.id_lop,
                l.ten_lop,
                l.id_khoi,
                l.id_cau_hinh_nam_hoc,
                k.ten_khoi,
                k.stt,
                c.nien_khoa,
                COUNT(DISTINCT pl.id_tn)::int AS student_count
            FROM LOP_HOC l
            LEFT JOIN KHOI k ON k.id_khoi = l.id_khoi
            JOIN CAU_HINH_NAM_HOC c ON c.id_cau_hinh_nam_hoc = l.id_cau_hinh_nam_hoc
            LEFT JOIN PHAN_LOP pl
                ON pl.id_lop = l.id_lop
                AND pl.id_cau_hinh_nam_hoc = l.id_cau_hinh_nam_hoc
            WHERE l.id_cau_hinh_nam_hoc = $1
            GROUP BY l.id_lop, l.ten_lop, l.id_khoi, l.id_cau_hinh_nam_hoc,
                     k.ten_khoi, k.stt, c.nien_khoa
            ORDER BY k.stt ASC NULLS LAST, l.ten_lop ASC
        `;
        const { rows } = await pool.query(query, [idCauHinhNamHoc]);
        return rows;
    },

    async create(tenLop, idKhoi, idCauHinhNamHoc) {
        const query = `
            INSERT INTO LOP_HOC (ten_lop, id_khoi, id_cau_hinh_nam_hoc)
            VALUES ($1, $2, $3)
            RETURNING *
        `;
        const { rows } = await pool.query(query, [tenLop, idKhoi, idCauHinhNamHoc]);
        return rows[0];
    },

    async update(idLop, tenLop, idKhoi, idCauHinhNamHoc) {
        const query = `
            UPDATE LOP_HOC
            SET ten_lop = $1,
                id_khoi = $2,
                id_cau_hinh_nam_hoc = $3
            WHERE id_lop = $4
            RETURNING *
        `;
        const { rows } = await pool.query(query, [tenLop, idKhoi, idCauHinhNamHoc, idLop]);
        return rows[0];
    }
};

module.exports = LopModel;
