const pool = require('../../../config/database');

const KiemTraModel = {
    async getExamCount(yearId) {
        const { rows } = await pool.query(`
            SELECT COALESCE(so_luong_bai_ktra, 0)::int AS exam_count
            FROM CAU_HINH_NAM_HOC
            WHERE id_cau_hinh_nam_hoc = $1
        `, [yearId]);
        return rows[0]?.exam_count || 0;
    },

    async getExamStudents(idGlv, yearId, classId, examNumber) {
        const { rows } = await pool.query(`
            SELECT tn.id_tn, tn.mstn, tn.ten_thanh, tn.ho_va_ten_lot, tn.ten,
                   pl.trang_thai, dht.diem_so,
                   (dht.id_hoc_tap IS NOT NULL) AS da_luu
            FROM PHAN_CONG_GLV pc
            JOIN PHAN_LOP pl
                ON pl.id_lop = pc.id_lop
                AND pl.id_cau_hinh_nam_hoc = pc.id_cau_hinh_nam_hoc
            JOIN THIEU_NHI tn ON tn.id_tn = pl.id_tn
            LEFT JOIN DIEM_HOC_TAP dht
                ON dht.id_tn = pl.id_tn
                AND dht.id_cau_hinh_nam_hoc = pl.id_cau_hinh_nam_hoc
                AND dht.stt_bai_ktra = $4
            WHERE pc.id_glv = $1
              AND pc.id_cau_hinh_nam_hoc = $2
              AND pc.id_lop = $3
            ORDER BY tn.ten, tn.ho_va_ten_lot, tn.ten_thanh
        `, [idGlv, yearId, classId, examNumber]);
        return rows;
    },

    async saveExamScores(idGlv, yearId, classId, examNumber, scores) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const assigned = await client.query(`
                SELECT 1 FROM PHAN_CONG_GLV
                WHERE id_glv = $1 AND id_lop = $2 AND id_cau_hinh_nam_hoc = $3
            `, [idGlv, classId, yearId]);
            if (!assigned.rows.length) throw new Error('Bạn không có quyền nhập điểm cho lớp này.');

            const examCount = await this.getExamCount(yearId);
            if (examNumber > examCount) throw new Error('Bài kiểm tra không hợp lệ.');
            const studentIds = await client.query(`
                SELECT id_tn FROM PHAN_LOP
                WHERE id_lop = $1 AND id_cau_hinh_nam_hoc = $2
            `, [classId, yearId]);
            const allowedIds = new Set(studentIds.rows.map(row => String(row.id_tn)));

            const validScores = [];
            for (const item of scores) {
                if (!allowedIds.has(String(item.id_tn))) continue;
                const rawScore = String(item.diem_so ?? '').trim();
                const score = rawScore === '' ? 0 : Number(rawScore);
                if (!Number.isFinite(score) || score < 0 || score > 10) {
                    throw new Error('Điểm phải nằm trong khoảng từ 0 đến 10.');
                }
                validScores.push({ id_tn: Number(item.id_tn), diem_so: score });
            }
            if (validScores.length) {
                await client.query(`
                    INSERT INTO DIEM_HOC_TAP (stt_bai_ktra, diem_so, id_tn, id_cau_hinh_nam_hoc)
                    SELECT $1, item.diem_so, item.id_tn, $2
                    FROM jsonb_to_recordset($3::jsonb) AS item(id_tn integer, diem_so numeric)
                    ON CONFLICT (id_tn, id_cau_hinh_nam_hoc, stt_bai_ktra)
                    DO UPDATE SET diem_so = EXCLUDED.diem_so
                `, [examNumber, yearId, JSON.stringify(validScores)]);
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

module.exports = KiemTraModel;
