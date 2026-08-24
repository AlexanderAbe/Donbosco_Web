const pool = require('../../../config/database');

const DashboardModel = {
    async getStats(idGlv, yearId) {
        const { rows } = await pool.query(`
            WITH assigned_block AS (
                SELECT id_khoi FROM PHAN_CONG_TRUONG_KHOI
                WHERE id_glv = $1 AND id_cau_hinh_nam_hoc = $2
            ), block_classes AS (
                SELECT l.id_lop FROM LOP_HOC l
                JOIN assigned_block b ON b.id_khoi = l.id_khoi
                WHERE l.id_cau_hinh_nam_hoc = $2
            ), block_children AS (
                SELECT DISTINCT tn.id_tn, tn.gioi_tinh
                FROM PHAN_LOP pl
                JOIN THIEU_NHI tn ON tn.id_tn = pl.id_tn
                JOIN block_classes bc ON bc.id_lop = pl.id_lop
                WHERE pl.id_cau_hinh_nam_hoc = $2
            )
            SELECT
                (SELECT COUNT(*) FROM block_children)::int AS total_thieu_nhi,
                (SELECT COUNT(*) FROM block_children WHERE gioi_tinh = 'Nam')::int AS total_nam,
                (SELECT COUNT(*) FROM block_children WHERE gioi_tinh = 'Nữ')::int AS total_nu,
                (SELECT COUNT(DISTINCT pc.id_glv)
                 FROM PHAN_CONG_GLV pc
                 JOIN block_classes bc ON bc.id_lop = pc.id_lop
                 JOIN GLV g ON g.id_glv = pc.id_glv
                 WHERE pc.id_cau_hinh_nam_hoc = $2
                   AND g.trang_thai = 'Đang hoạt động')::int AS total_glv
        `, [idGlv, yearId]);
        return rows[0] || { total_thieu_nhi: 0, total_nam: 0, total_nu: 0, total_glv: 0 };
    },

    async getDetails(idGlv, yearId) {
        const blockClasses = `
            SELECT l.id_lop, l.ten_lop, k.ten_khoi, k.stt
            FROM LOP_HOC l JOIN KHOI k ON k.id_khoi = l.id_khoi
            WHERE l.id_cau_hinh_nam_hoc = $2
              AND EXISTS (
                  SELECT 1 FROM PHAN_CONG_TRUONG_KHOI tk
                  WHERE tk.id_glv = $1 AND tk.id_khoi = l.id_khoi
                    AND tk.id_cau_hinh_nam_hoc = $2
              )`;
        const [classResult, statusResult, glvResult, examResult, disciplineResult, attendanceResult] = await Promise.all([
            pool.query(`SELECT classes.id_lop, classes.ten_lop, classes.ten_khoi, COUNT(pl.id_tn)::int AS student_count FROM (${blockClasses}) classes LEFT JOIN PHAN_LOP pl ON pl.id_lop = classes.id_lop AND pl.id_cau_hinh_nam_hoc = $2 GROUP BY classes.id_lop, classes.ten_lop, classes.ten_khoi, classes.stt ORDER BY classes.stt, classes.ten_lop`, [idGlv, yearId]),
            pool.query(`SELECT pl.trang_thai, COUNT(DISTINCT pl.id_tn)::int AS student_count FROM PHAN_LOP pl JOIN LOP_HOC l ON l.id_lop = pl.id_lop WHERE pl.id_cau_hinh_nam_hoc = $2 AND EXISTS (SELECT 1 FROM PHAN_CONG_TRUONG_KHOI tk WHERE tk.id_glv = $1 AND tk.id_khoi = l.id_khoi AND tk.id_cau_hinh_nam_hoc = $2) GROUP BY pl.trang_thai ORDER BY pl.trang_thai`, [idGlv, yearId]),
            pool.query(`SELECT classes.id_lop, classes.ten_lop, classes.ten_khoi, COUNT(DISTINCT pc.id_glv)::int AS glv_count FROM (${blockClasses}) classes LEFT JOIN PHAN_CONG_GLV pc ON pc.id_lop = classes.id_lop AND pc.id_cau_hinh_nam_hoc = $2 GROUP BY classes.id_lop, classes.ten_lop, classes.ten_khoi, classes.stt HAVING COUNT(DISTINCT pc.id_glv) = 0 ORDER BY classes.stt, classes.ten_lop`, [idGlv, yearId]),
            pool.query(`SELECT tn.id_tn, tn.mstn, CONCAT_WS(' ', tn.ten_thanh, tn.ho_va_ten_lot, tn.ten) AS ho_ten, l.ten_lop, dht.stt_bai_ktra, dht.diem_so FROM DIEM_HOC_TAP dht JOIN THIEU_NHI tn ON tn.id_tn = dht.id_tn JOIN PHAN_LOP pl ON pl.id_tn = dht.id_tn AND pl.id_cau_hinh_nam_hoc = dht.id_cau_hinh_nam_hoc JOIN LOP_HOC l ON l.id_lop = pl.id_lop WHERE dht.id_cau_hinh_nam_hoc = $2 AND dht.diem_so < 5 AND EXISTS (SELECT 1 FROM PHAN_CONG_TRUONG_KHOI tk WHERE tk.id_glv = $1 AND tk.id_khoi = l.id_khoi AND tk.id_cau_hinh_nam_hoc = $2) ORDER BY dht.diem_so ASC, tn.ten LIMIT 10`, [idGlv, yearId]),
            pool.query(`SELECT tn.id_tn, tn.mstn, CONCAT_WS(' ', tn.ten_thanh, tn.ho_va_ten_lot, tn.ten) AS ho_ten, l.ten_lop, dkl.thang, dkl.diem FROM DIEM_KY_LUAT dkl JOIN THIEU_NHI tn ON tn.id_tn = dkl.id_tn JOIN PHAN_LOP pl ON pl.id_tn = dkl.id_tn AND pl.id_cau_hinh_nam_hoc = dkl.id_cau_hinh_nam_hoc JOIN LOP_HOC l ON l.id_lop = pl.id_lop WHERE dkl.id_cau_hinh_nam_hoc = $2 AND dkl.diem < 5 AND EXISTS (SELECT 1 FROM PHAN_CONG_TRUONG_KHOI tk WHERE tk.id_glv = $1 AND tk.id_khoi = l.id_khoi AND tk.id_cau_hinh_nam_hoc = $2) ORDER BY dkl.diem ASC, tn.ten LIMIT 10`, [idGlv, yearId]),
            pool.query(`SELECT dd.ngay_diem_danh, dd.loai_buoi, l.ten_lop, COUNT(*)::int AS student_count, COUNT(*) FILTER (WHERE dd.trang_thai IN ('Có mặt', 'Đi sớm'))::int AS present_count FROM DIEM_DANH dd JOIN LOP_HOC l ON l.id_lop = dd.id_lop WHERE EXISTS (SELECT 1 FROM PHAN_CONG_TRUONG_KHOI tk WHERE tk.id_glv = $1 AND tk.id_khoi = l.id_khoi AND tk.id_cau_hinh_nam_hoc = $2) GROUP BY dd.ngay_diem_danh, dd.loai_buoi, l.ten_lop ORDER BY dd.ngay_diem_danh DESC LIMIT 8`, [idGlv, yearId])
        ]);
        return {
            classStats: classResult.rows,
            statusStats: statusResult.rows,
            classesWithoutGlv: glvResult.rows,
            lowExamScores: examResult.rows,
            lowDisciplineScores: disciplineResult.rows,
            recentAttendance: attendanceResult.rows
        };
    }
};

module.exports = DashboardModel;
