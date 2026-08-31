const pool = require('../../../config/database');

const PhanCongModel = {
    async getAcademicYears() {
        const { rows } = await pool.query(`
            SELECT id_cau_hinh_nam_hoc, nien_khoa
            FROM CAU_HINH_NAM_HOC
            ORDER BY nien_khoa DESC
        `);
        return rows;
    },

    async getPageData(idCauHinhNamHoc) {
        const [classes, glvList, classAssignments, truongKhoiList] = await Promise.all([
            pool.query(`
                SELECT l.id_lop, l.ten_lop, l.id_khoi, k.stt, k.ten_khoi
                FROM LOP_HOC l
                LEFT JOIN KHOI k ON k.id_khoi = l.id_khoi
                WHERE l.id_cau_hinh_nam_hoc = $1
                ORDER BY k.stt ASC NULLS LAST, l.ten_lop ASC
            `, [idCauHinhNamHoc]),
            pool.query(`
                SELECT id_glv, CONCAT_WS(' ', ten_thanh, ho_va_ten_lot, ten) AS ho_ten
                FROM GLV
                ORDER BY ten ASC, ho_va_ten_lot ASC, ten_thanh ASC
            `),
            pool.query(`
                SELECT pc.id_phan_cong_glv, pc.id_glv, pc.id_lop,
                       CONCAT_WS(' ', g.ten_thanh, g.ho_va_ten_lot, g.ten) AS ho_ten
                FROM PHAN_CONG_GLV pc
                JOIN GLV g ON g.id_glv = pc.id_glv
                JOIN LOP_HOC l ON l.id_lop = pc.id_lop
                WHERE pc.id_cau_hinh_nam_hoc = $1
                  AND l.id_cau_hinh_nam_hoc = $1
                ORDER BY pc.id_phan_cong_glv ASC
            `, [idCauHinhNamHoc]),
            pool.query(`
                SELECT k.id_khoi, k.stt, k.ten_khoi,
                       pk.id_phan_cong_truong, pk.id_glv,
                       CONCAT_WS(' ', g.ten_thanh, g.ho_va_ten_lot, g.ten) AS ho_ten
                FROM KHOI k
                LEFT JOIN PHAN_CONG_TRUONG_KHOI pk
                    ON pk.id_khoi = k.id_khoi
                   AND pk.id_cau_hinh_nam_hoc = $1
                LEFT JOIN GLV g ON g.id_glv = pk.id_glv
                WHERE k.is_active = TRUE
                ORDER BY k.stt ASC, k.ten_khoi ASC
            `, [idCauHinhNamHoc])
        ]);

        // Lấy thêm thông tin các GLV đang dạy lớp nào thuộc khối nào để lọc dropdown Trưởng khối
        const khoiGlvMappingRes = await pool.query(`
            SELECT DISTINCT l.id_khoi, pc.id_glv
            FROM PHAN_CONG_GLV pc
            JOIN LOP_HOC l ON l.id_lop = pc.id_lop
            WHERE pc.id_cau_hinh_nam_hoc = $1 AND l.id_cau_hinh_nam_hoc = $1
        `, [idCauHinhNamHoc]);

        return {
            classes: classes.rows,
            glvList: glvList.rows,
            classAssignments: classAssignments.rows,
            truongKhoiList: truongKhoiList.rows,
            khoiGlvMapping: khoiGlvMappingRes.rows // Truyền thêm mảng ánh xạ này ra
        };
    },

    async assignGlv(idGlv, idLop, idCauHinhNamHoc) {
        const query = `
            INSERT INTO PHAN_CONG_GLV (id_glv, id_lop, id_cau_hinh_nam_hoc)
            SELECT $1, id_lop, $3
            FROM LOP_HOC
            WHERE id_lop = $2 AND id_cau_hinh_nam_hoc = $3
            RETURNING id_phan_cong_glv
        `;
        const { rows } = await pool.query(query, [idGlv, idLop, idCauHinhNamHoc]);
        if (!rows.length) throw new Error('Lớp không thuộc niên khóa đã chọn.');
        return rows[0];
    },

    async assignGlvBulk(idGlvList, idLop, idCauHinhNamHoc) {
        const query = `
            INSERT INTO PHAN_CONG_GLV (id_glv, id_lop, id_cau_hinh_nam_hoc)
            SELECT g.id_glv, l.id_lop, $3
            FROM GLV g
            CROSS JOIN LOP_HOC l
            WHERE g.id_glv = ANY($1::int[])
              AND l.id_lop = $2
              AND l.id_cau_hinh_nam_hoc = $3
            ON CONFLICT DO NOTHING
            RETURNING id_phan_cong_glv
        `;
        const { rows } = await pool.query(query, [idGlvList, idLop, idCauHinhNamHoc]);
        return rows.length;
    },

    async removeGlv(idPhanCong, idCauHinhNamHoc) {
        await pool.query(`
            DELETE FROM PHAN_CONG_GLV
            WHERE id_phan_cong_glv = $1 AND id_cau_hinh_nam_hoc = $2
        `, [idPhanCong, idCauHinhNamHoc]);
    },

    async assignTruongKhoi(idGlv, idKhoi, idCauHinhNamHoc) {
        // 1. Kiểm tra xem khối này đã có đủ 3 trưởng khối chưa
        const countRes = await pool.query(`
            SELECT COUNT(*) AS total 
            FROM PHAN_CONG_TRUONG_KHOI 
            WHERE id_khoi = $1 AND id_cau_hinh_nam_hoc = $2
        `, [idKhoi, idCauHinhNamHoc]);
        
        if (Number.parseInt(countRes.rows[0].total, 10) >= 3) {
            throw new Error('Mỗi khối chỉ được phép chọn tối đa 3 Trưởng khối.');
        }

        // 2. Thêm mới trưởng khối (bỏ ON CONFLICT cập nhật cũ, thay bằng thêm dòng mới)
        const query = `
            INSERT INTO PHAN_CONG_TRUONG_KHOI (id_glv, id_khoi, id_cau_hinh_nam_hoc)
            SELECT $1, id_khoi, $3
            FROM KHOI
            WHERE id_khoi = $2 AND is_active = TRUE
            RETURNING id_phan_cong_truong
        `;
        const { rows } = await pool.query(query, [idGlv, idKhoi, idCauHinhNamHoc]);
        if (!rows.length) throw new Error('Khối không hợp lệ hoặc đang tạm ngưng.');
        return rows[0];
    },

    async removeTruongKhoi(idPhanCong, idCauHinhNamHoc) {
        await pool.query(`
            DELETE FROM PHAN_CONG_TRUONG_KHOI
            WHERE id_phan_cong_truong = $1 AND id_cau_hinh_nam_hoc = $2
        `, [idPhanCong, idCauHinhNamHoc]);
    }
};

module.exports = PhanCongModel;
