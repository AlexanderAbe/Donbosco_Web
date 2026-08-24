const pool = require('../../../config/database');

const PhanCongGlvModel = {
    async getPageData(idGlv, yearId) {
        const { rows: classes } = await pool.query(`
            SELECT l.id_lop, l.ten_lop, k.ten_khoi
            FROM PHAN_CONG_TRUONG_KHOI tk
            JOIN LOP_HOC l ON l.id_khoi = tk.id_khoi
                AND l.id_cau_hinh_nam_hoc = tk.id_cau_hinh_nam_hoc
            JOIN KHOI k ON k.id_khoi = l.id_khoi
            WHERE tk.id_glv = $1 AND tk.id_cau_hinh_nam_hoc = $2
            ORDER BY l.ten_lop
        `, [idGlv, yearId]);

        const { rows: glvList } = await pool.query(`
            SELECT g.id_glv, g.ten_thanh, g.ho_va_ten_lot, g.ten, g.ngay_sinh,
                   g.gioi_tinh, g.sdt, g.trang_thai,
                   pc.id_lop AS assigned_class_id
            FROM GLV g
            LEFT JOIN PHAN_CONG_GLV pc ON pc.id_glv = g.id_glv
                AND pc.id_cau_hinh_nam_hoc = $1
            WHERE g.trang_thai = 'Đang hoạt động'
            ORDER BY g.ten, g.ho_va_ten_lot, g.ten_thanh
        `, [yearId]);

        for (const classItem of classes) {
            classItem.glvList = glvList.filter(glv => glv.assigned_class_id === classItem.id_lop);
        }
        return { classes, glvList };
    },

    async getDetail(idGlv, yearId, teacherId) {
        const { rows } = await pool.query(`
            SELECT g.id_glv, g.ten_thanh, g.ho_va_ten_lot, g.ten, g.ngay_sinh,
                   g.gioi_tinh, g.sdt, g.trang_thai, l.ten_lop, k.ten_khoi
            FROM GLV g
            LEFT JOIN PHAN_CONG_GLV pc ON pc.id_glv = g.id_glv
                AND pc.id_cau_hinh_nam_hoc = $2
            LEFT JOIN LOP_HOC l ON l.id_lop = pc.id_lop
            LEFT JOIN KHOI k ON k.id_khoi = l.id_khoi
            WHERE g.id_glv = $1
              AND EXISTS (
                  SELECT 1 FROM PHAN_CONG_TRUONG_KHOI tk
                  WHERE tk.id_glv = $3
                    AND tk.id_cau_hinh_nam_hoc = $2
              )
            LIMIT 1
        `, [idGlv, yearId, teacherId]);
        return rows[0] || null;
    },

    async assign(idGlv, teacherId, yearId, classId) {
        const { rows } = await pool.query(`
            INSERT INTO PHAN_CONG_GLV (id_glv, id_lop, id_cau_hinh_nam_hoc)
            SELECT $1, l.id_lop, $3
            FROM LOP_HOC l
            JOIN PHAN_CONG_TRUONG_KHOI tk ON tk.id_khoi = l.id_khoi
                AND tk.id_cau_hinh_nam_hoc = l.id_cau_hinh_nam_hoc
            WHERE l.id_lop = $4
              AND tk.id_glv = $2
              AND NOT EXISTS (
                  SELECT 1 FROM PHAN_CONG_GLV existing
                  WHERE existing.id_glv = $1
                    AND existing.id_cau_hinh_nam_hoc = $3
              )
            RETURNING id_phan_cong_glv
        `, [idGlv, teacherId, yearId, classId]);
        if (!rows.length) throw new Error('GLV đã được phân công hoặc lớp không thuộc khối bạn phụ trách.');
        return rows[0];
    }
};

module.exports = PhanCongGlvModel;
