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
                realtime.tinh_trang,
                pl.trang_thai AS trang_thai_phan_lop,
                realtime.id_lop,
                tk.id_tong_ket_nam_hoc,
                (tk.id_tong_ket_nam_hoc IS NOT NULL) AS has_summary,
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
            const error = new Error('Chỉ được sửa kết quả của học sinh thuộc lớp bạn phụ trách.');
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
