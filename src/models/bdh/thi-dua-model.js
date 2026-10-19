const pool = require('../../../config/database');

const ThiDuaModel = {
    async getAcademicYears() {
        const { rows } = await pool.query(`
            SELECT id_cau_hinh_nam_hoc, nien_khoa
            FROM CAU_HINH_NAM_HOC
            ORDER BY nien_khoa DESC
        `);
        return rows;
    },

    async getThiDuaTheoThang(yearId, thang) {
        const query = `
            WITH LopSiSo AS (
                SELECT pl.id_lop, COUNT(pl.id_tn) AS so_luong_tn
                FROM PHAN_LOP pl
                WHERE pl.id_cau_hinh_nam_hoc = $1 AND pl.trang_thai = 'Đang học'
                GROUP BY pl.id_lop
            ),
            DiemKL AS (
                SELECT pl.id_lop, SUM(dk.diem) AS diem_kl
                FROM DIEM_KY_LUAT dk
                JOIN PHAN_LOP pl ON dk.id_tn = pl.id_tn AND pl.id_cau_hinh_nam_hoc = $1
                WHERE dk.thang = $2 AND dk.id_cau_hinh_nam_hoc = $1
                GROUP BY pl.id_lop
            ),
            DiemCC AS (
                SELECT pl.id_lop, SUM(dc.diem_chuyen_can) AS diem_cc
                FROM DIEM_CHUYEN_CAN dc
                JOIN PHAN_LOP pl ON dc.id_tn = pl.id_tn AND pl.id_cau_hinh_nam_hoc = $1
                WHERE dc.thang = $2 AND dc.id_cau_hinh_nam_hoc = $1
                GROUP BY pl.id_lop
            ),
            DiemA AS (
                -- Tính điểm A bằng cách đếm số lượt 'Đi sớm' vào 'Lễ Chúa Nhật'
                SELECT dd.id_lop, COUNT(dd.id_diem_danh) AS diem_a
                FROM DIEM_DANH dd
                JOIN LOP_HOC l ON l.id_lop = dd.id_lop
                WHERE EXTRACT(MONTH FROM dd.ngay_diem_danh) = $2
                  AND l.id_cau_hinh_nam_hoc = $1
                  AND dd.loai_buoi = 'Lễ Chúa Nhật'
                  AND dd.trang_thai = 'Đi sớm'
                GROUP BY dd.id_lop
            )
            SELECT 
                l.id_lop, 
                l.ten_lop, 
                k.ten_khoi,
                COALESCE(s.so_luong_tn, 0)::int AS so_luong_tn,
                COALESCE(kl.diem_kl, 0)::numeric(10,2) AS diem_kl,
                COALESCE(cc.diem_cc, 0)::numeric(10,2) AS diem_cc,
                COALESCE(a.diem_a, 0)::int AS diem_a
            FROM LOP_HOC l
            JOIN KHOI k ON k.id_khoi = l.id_khoi
            LEFT JOIN LopSiSo s ON s.id_lop = l.id_lop
            LEFT JOIN DiemKL kl ON kl.id_lop = l.id_lop
            LEFT JOIN DiemCC cc ON cc.id_lop = l.id_lop
            LEFT JOIN DiemA a ON a.id_lop = l.id_lop
            WHERE l.id_cau_hinh_nam_hoc = $1
            ORDER BY k.stt ASC, l.ten_lop ASC;
        `;
        
        try {
            const { rows } = await pool.query(query, [yearId, thang]);
            return rows;
        } catch (error) {
            console.error('❌ Lỗi truy vấn điểm thi đua:', error);
            return [];
        }
    }
};

module.exports = ThiDuaModel;