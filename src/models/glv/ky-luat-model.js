const pool = require('../../../config/database');
const { sortStudentsByName } = require('../../utils/student-sorter');

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
        return sortStudentsByName(rows);
    },

    async getDisciplineScoresForPrint(idGlv, yearId, classId) {
        const assigned = await pool.query(`
            SELECT lop.ten_lop
            FROM PHAN_CONG_GLV pc
            JOIN LOP_HOC lop ON lop.id_lop = pc.id_lop
            WHERE pc.id_glv = $1
              AND pc.id_cau_hinh_nam_hoc = $2
              AND pc.id_lop = $3
            LIMIT 1
        `, [idGlv, yearId, classId]);
        if (!assigned.rows.length) {
            const error = new Error('Bạn không có quyền xem điểm kỷ luật của lớp này.');
            error.code = 'FORBIDDEN';
            throw error;
        }

        const { rows } = await pool.query(`
            SELECT tn.id_tn, tn.mstn, tn.ten_thanh, tn.ho_va_ten_lot, tn.ten,
                   pl.trang_thai, dkl.thang, dkl.diem,
                   (dkl.id_ky_luat IS NOT NULL) AS da_luu
            FROM PHAN_LOP pl
            JOIN THIEU_NHI tn ON tn.id_tn = pl.id_tn
            LEFT JOIN DIEM_KY_LUAT dkl
                ON dkl.id_tn = pl.id_tn
                AND dkl.id_cau_hinh_nam_hoc = pl.id_cau_hinh_nam_hoc
            WHERE pl.id_lop = $1
              AND pl.id_cau_hinh_nam_hoc = $2
            ORDER BY tn.ten, tn.ho_va_ten_lot, tn.ten_thanh, dkl.thang
        `, [classId, yearId]);

        const studentsById = new Map();
        for (const row of rows) {
            if (!studentsById.has(row.id_tn)) {
                studentsById.set(row.id_tn, {
                    id_tn: row.id_tn,
                    mstn: row.mstn,
                    ten_thanh: row.ten_thanh,
                    ho_va_ten_lot: row.ho_va_ten_lot,
                    ten: row.ten,
                    trang_thai: row.trang_thai,
                    scores: {}
                });
            }
            if (row.da_luu) {
                studentsById.get(row.id_tn).scores[row.thang] = row.diem;
            }
        }

        return {
            className: assigned.rows[0].ten_lop,
            students: sortStudentsByName([...studentsById.values()])
        };
    },

    async saveDisciplineScores(idGlv, yearId, classId, month, scores, fillMissing = true) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const assigned = await client.query(`
                SELECT 1 FROM PHAN_CONG_GLV
                WHERE id_glv = $1 AND id_lop = $2 AND id_cau_hinh_nam_hoc = $3
            `, [idGlv, classId, yearId]);
            if (!assigned.rows.length) {
                const error = new Error('Bạn không có quyền nhập điểm cho lớp này.');
                error.code = 'FORBIDDEN';
                throw error;
            }

            const studentResult = await client.query(`
                SELECT id_tn FROM PHAN_LOP
                WHERE id_lop = $1 AND id_cau_hinh_nam_hoc = $2
            `, [classId, yearId]);
            const allowedIds = new Set(studentResult.rows.map(row => String(row.id_tn)));

            const validScores = [];
            const studentsToClear = [];
            for (const item of (fillMissing ? [] : scores)) {
                if (!allowedIds.has(String(item.id_tn))) continue;
                const rawScore = String(item.diem ?? '').trim();
                if (rawScore === '') {
                    studentsToClear.push(Number(item.id_tn));
                    continue;
                }
                const score = Number(rawScore);
                if (!Number.isFinite(score) || score < 0 || score > 10) {
                    throw new Error('Điểm kỷ luật phải nằm trong khoảng từ 0 đến 10.');
                }
                validScores.push({ id_tn: Number(item.id_tn), diem: score });
            }
            if (validScores.length) {
                await client.query(`
                    INSERT INTO DIEM_KY_LUAT (thang, diem, id_tn, id_cau_hinh_nam_hoc)
                    SELECT $1, item.diem, item.id_tn, $2
                    FROM jsonb_to_recordset($3::jsonb) AS item(id_tn integer, diem numeric)
                    ON CONFLICT (id_tn, id_cau_hinh_nam_hoc, thang)
                    DO UPDATE SET diem = EXCLUDED.diem
                `, [month, yearId, JSON.stringify(validScores)]);
            }
            const clearedScores = studentsToClear.length
                ? await client.query(`
                    DELETE FROM DIEM_KY_LUAT
                    WHERE id_tn = ANY($1::int[])
                      AND id_cau_hinh_nam_hoc = $2
                      AND thang = $3
                `, [studentsToClear, yearId, month])
                : { rowCount: 0 };
            if (fillMissing) {
                await client.query(`
                    INSERT INTO DIEM_KY_LUAT (thang, diem, id_tn, id_cau_hinh_nam_hoc)
                    SELECT $1, 0, pl.id_tn, $2
                    FROM PHAN_LOP pl
                    WHERE pl.id_lop = $3
                      AND pl.id_cau_hinh_nam_hoc = $2
                      AND NOT EXISTS (
                          SELECT 1
                          FROM DIEM_KY_LUAT dkl
                          WHERE dkl.id_tn = pl.id_tn
                            AND dkl.id_cau_hinh_nam_hoc = pl.id_cau_hinh_nam_hoc
                            AND dkl.thang = $1
                      )
                    ON CONFLICT (id_tn, id_cau_hinh_nam_hoc, thang) DO NOTHING
                `, [month, yearId, classId]);
            }
            if (validScores.length || clearedScores.rowCount || fillMissing) {
                await client.query(`
                    UPDATE TONG_KET_NAM_HOC
                    SET tinh_trang = NULL
                    WHERE id_lop = $1 AND id_cau_hinh_nam_hoc = $2
                `, [classId, yearId]);
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
