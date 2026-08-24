const pool = require('../../../config/database');

const KyLuatModel = {
    async getDisciplineStudents(idGlv, yearId, classId, month) {
        const { rows } = await pool.query(`
            SELECT tn.id_tn, tn.mstn, tn.ten_thanh, tn.ho_va_ten_lot, tn.ten,
                   pl.trang_thai, dkl.diem,
                   (dkl.id_ky_luat IS NOT NULL) AS da_luu
            FROM PHAN_CONG_GLV pc
            JOIN PHAN_LOP pl
                ON pl.id_lop = pc.id_lop
                AND pl.id_cau_hinh_nam_hoc = pc.id_cau_hinh_nam_hoc
            JOIN THIEU_NHI tn ON tn.id_tn = pl.id_tn
            LEFT JOIN DIEM_KY_LUAT dkl
                ON dkl.id_tn = pl.id_tn
                AND dkl.id_cau_hinh_nam_hoc = pl.id_cau_hinh_nam_hoc
                AND dkl.thang = $4
            WHERE pc.id_glv = $1
              AND pc.id_cau_hinh_nam_hoc = $2
              AND pc.id_lop = $3
            ORDER BY tn.ten, tn.ho_va_ten_lot, tn.ten_thanh
        `, [idGlv, yearId, classId, month]);
        return rows;
    },

    async saveDisciplineScores(idGlv, yearId, classId, month, scores) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const assigned = await client.query(`
                SELECT 1 FROM PHAN_CONG_GLV
                WHERE id_glv = $1 AND id_lop = $2 AND id_cau_hinh_nam_hoc = $3
            `, [idGlv, classId, yearId]);
            if (!assigned.rows.length) throw new Error('Bạn không có quyền nhập điểm cho lớp này.');

            const studentResult = await client.query(`
                SELECT id_tn FROM PHAN_LOP
                WHERE id_lop = $1 AND id_cau_hinh_nam_hoc = $2
            `, [classId, yearId]);
            const allowedIds = new Set(studentResult.rows.map(row => String(row.id_tn)));

            for (const item of scores) {
                if (!allowedIds.has(String(item.id_tn))) continue;
                const rawScore = String(item.diem ?? '').trim();
                const score = rawScore === '' ? 0 : Number(rawScore);
                if (!Number.isFinite(score) || score < 0 || score > 10) {
                    throw new Error('Điểm kỷ luật phải nằm trong khoảng từ 0 đến 10.');
                }
                await client.query(`
                    INSERT INTO DIEM_KY_LUAT (thang, diem, id_tn, id_cau_hinh_nam_hoc)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (id_tn, id_cau_hinh_nam_hoc, thang)
                    DO UPDATE SET diem = EXCLUDED.diem
                `, [month, score, item.id_tn, yearId]);
            }
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
};

module.exports = KyLuatModel;
