const pool = require('../../../config/database');

const BangDiemModel = {
    async getRealtimeScores(idGlv, yearId) {
        const { rows } = await pool.query(`
            SELECT
                realtime.id_tn,
                realtime.mstn,
                realtime.ten_thanh,
                realtime.ho_va_ten_lot,
                realtime.ten,
                realtime.diem_hoc_tap,
                realtime.diem_chuyen_can,
                realtime.diem_ky_luat,
                realtime.diem_tong,
                CASE
                    WHEN pl.trang_thai <> 'Đang học' THEN realtime.tinh_trang
                                        WHEN NOT EXISTS (
                                                SELECT 1 FROM DIEM_HOC_TAP dht
                                                WHERE dht.id_tn = realtime.id_tn
                                                    AND dht.id_cau_hinh_nam_hoc = realtime.id_cau_hinh_nam_hoc
                                        ) AND NOT EXISTS (
                                                SELECT 1 FROM DIEM_CHUYEN_CAN dhc
                                                WHERE dhc.id_tn = realtime.id_tn
                                                    AND dhc.id_cau_hinh_nam_hoc = realtime.id_cau_hinh_nam_hoc
                                        ) AND NOT EXISTS (
                                                SELECT 1 FROM DIEM_KY_LUAT dkl
                                                WHERE dkl.id_tn = realtime.id_tn
                                                    AND dkl.id_cau_hinh_nam_hoc = realtime.id_cau_hinh_nam_hoc
                                        ) THEN realtime.tinh_trang
                    WHEN realtime.diem_tong >= 5
                        AND realtime.diem_hoc_tap >= 5
                        AND realtime.diem_chuyen_can >= 5
                        AND realtime.diem_ky_luat >= 5
                        THEN 'Lên lớp'
                    ELSE 'Ở lại lớp'
                END AS tinh_trang,
                pl.trang_thai AS trang_thai_phan_lop,
                realtime.id_lop,
                tk.id_tong_ket_nam_hoc,
                (tk.tinh_trang IS NOT NULL) AS has_summary,
                lop.ten_lop,
                khoi.ten_khoi,
                khoi.stt
            FROM vw_bang_diem_realtime realtime
            JOIN LOP_HOC lop ON lop.id_lop = realtime.id_lop
            JOIN KHOI khoi ON khoi.id_khoi = lop.id_khoi
            JOIN PHAN_CONG_GLV pc
                ON pc.id_lop = realtime.id_lop
                AND pc.id_cau_hinh_nam_hoc = realtime.id_cau_hinh_nam_hoc
            JOIN PHAN_LOP pl
                ON pl.id_tn = realtime.id_tn
                AND pl.id_lop = realtime.id_lop
                AND pl.id_cau_hinh_nam_hoc = realtime.id_cau_hinh_nam_hoc
            LEFT JOIN TONG_KET_NAM_HOC tk
                ON tk.id_tn = realtime.id_tn
                AND tk.id_lop = realtime.id_lop
                AND tk.id_cau_hinh_nam_hoc = realtime.id_cau_hinh_nam_hoc
            WHERE realtime.id_cau_hinh_nam_hoc = $1
              AND pc.id_glv = $2
            ORDER BY khoi.stt, lop.ten_lop, realtime.ten,
                     realtime.ho_va_ten_lot, realtime.ten_thanh
        `, [yearId, idGlv]);
        return rows;
    },

    async getStudentPrintHistories(idGlv, yearId, students) {
        const studentIds = students.map(student => student.id_tn);
        const classIds = students.map(student => student.id_lop);
        const { rows } = await pool.query(`
            WITH requested_students AS (
                SELECT requested.id_tn, requested.id_lop
                FROM UNNEST($3::int[], $4::int[]) AS requested(id_tn, id_lop)
            ), assigned_students AS (
                SELECT DISTINCT tn.id_tn, pl.id_lop, tn.ten_thanh, tn.ho_va_ten_lot, tn.ten, tn.mstn,
                       lop.ten_lop, khoi.ten_khoi
                FROM requested_students requested
                JOIN PHAN_CONG_GLV pc
                    ON pc.id_glv = $1
                    AND pc.id_cau_hinh_nam_hoc = $2
                    AND pc.id_lop = requested.id_lop
                JOIN PHAN_LOP pl
                    ON pl.id_tn = requested.id_tn
                    AND pl.id_lop = requested.id_lop
                    AND pl.id_cau_hinh_nam_hoc = pc.id_cau_hinh_nam_hoc
                JOIN THIEU_NHI tn ON tn.id_tn = pl.id_tn
                JOIN LOP_HOC lop ON lop.id_lop = pl.id_lop
                JOIN KHOI khoi ON khoi.id_khoi = lop.id_khoi
            )
            SELECT student.id_tn, student.id_lop, student.mstn,
                   student.ten_thanh, student.ho_va_ten_lot, student.ten,
                   student.ten_lop, student.ten_khoi,
                   realtime.diem_hoc_tap, realtime.diem_ky_luat,
                   realtime.diem_chuyen_can, realtime.diem_tong,
                   COALESCE((
                       SELECT JSON_AGG(
                           JSON_BUILD_OBJECT(
                               'exam', dht.stt_bai_ktra,
                               'date', dht.ngay_kiem_tra,
                               'score', dht.diem_so
                           ) ORDER BY dht.stt_bai_ktra
                       )
                       FROM DIEM_HOC_TAP dht
                       WHERE dht.id_tn = student.id_tn
                         AND dht.id_cau_hinh_nam_hoc = $2
                   ), '[]'::json) AS learning_history,
                   attendance.early_count,
                   attendance.present_count,
                   attendance.unexcused_count,
                   attendance.excused_count,
                   COALESCE((
                       SELECT JSON_AGG(
                           JSON_BUILD_OBJECT('month', dkl.thang, 'score', dkl.diem)
                           ORDER BY CASE WHEN dkl.thang >= 9 THEN dkl.thang - 9 ELSE dkl.thang + 3 END
                       )
                       FROM DIEM_KY_LUAT dkl
                       WHERE dkl.id_tn = student.id_tn
                         AND dkl.id_cau_hinh_nam_hoc = $2
                   ), '[]'::json) AS discipline_history
            FROM assigned_students student
            LEFT JOIN LATERAL (
                SELECT
                    COUNT(*) FILTER (WHERE dd.trang_thai = 'Đi sớm')::int AS early_count,
                    COUNT(*) FILTER (WHERE dd.trang_thai = 'Có mặt')::int AS present_count,
                    COUNT(*) FILTER (WHERE dd.trang_thai = 'Vắng không phép')::int AS unexcused_count,
                    COUNT(*) FILTER (WHERE dd.trang_thai = 'Vắng phép')::int AS excused_count
                FROM DIEM_DANH dd
                WHERE dd.id_tn = student.id_tn
                  AND dd.id_lop = student.id_lop
            ) attendance ON TRUE
            LEFT JOIN vw_bang_diem_realtime realtime
                ON realtime.id_tn = student.id_tn
                AND realtime.id_lop = student.id_lop
                AND realtime.id_cau_hinh_nam_hoc = $2
            ORDER BY student.ten, student.ho_va_ten_lot, student.ten_thanh
        `, [idGlv, yearId, studentIds, classIds]);
        return rows;
    },

    async updateResult(idGlv, idTn, yearId, result) {
        const allowedResults = ['Lên lớp', 'Ở lại lớp'];
        if (!allowedResults.includes(result)) throw new Error('Kết quả tổng kết không hợp lệ.');

        const access = await pool.query(`
            SELECT tk.id_tong_ket_nam_hoc
            FROM TONG_KET_NAM_HOC tk
            JOIN PHAN_CONG_GLV pc
                ON pc.id_lop = tk.id_lop
                AND pc.id_cau_hinh_nam_hoc = tk.id_cau_hinh_nam_hoc
            WHERE tk.id_tn = $1
              AND tk.id_cau_hinh_nam_hoc = $2
                            AND tk.tinh_trang IS NOT NULL
              AND EXISTS (
                SELECT 1 FROM PHAN_LOP pl
                WHERE pl.id_tn = tk.id_tn
                  AND pl.id_lop = tk.id_lop
                  AND pl.id_cau_hinh_nam_hoc = tk.id_cau_hinh_nam_hoc
                  AND pl.trang_thai = 'Đang học'
              )
              AND pc.id_glv = $3
            LIMIT 1
        `, [idTn, yearId, idGlv]);
        if (!access.rows.length) {
            const error = new Error('Chỉ được sửa kết quả của thiếu nhi thuộc lớp bạn phụ trách.');
            error.code = 'FORBIDDEN';
            throw error;
        }

        await pool.query('CALL sp_cap_nhat_ket_qua_he($1, $2)', [
            access.rows[0].id_tong_ket_nam_hoc,
            result
        ]);
        return { message: 'Đã cập nhật kết quả tổng kết.' };
    }
};

module.exports = BangDiemModel;
