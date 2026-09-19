const pool = require('../../../config/database');

const DiemDanhModel = {
    async getAttendanceStudents(idGlv, yearId, classId, attendanceDate, sessionType) {
        const { rows } = await pool.query(`
                        SELECT tn.id_tn, tn.mstn, tn.ten_thanh, tn.ho_va_ten_lot, tn.ten,
                                     dd.trang_thai AS trang_thai_diem_danh,
                   (dd.id_diem_danh IS NOT NULL) AS da_luu
            FROM PHAN_CONG_GLV pc
            JOIN PHAN_LOP pl ON pl.id_lop = pc.id_lop
                AND pl.id_cau_hinh_nam_hoc = pc.id_cau_hinh_nam_hoc
                AND pl.trang_thai = 'Đang học'
            JOIN THIEU_NHI tn ON tn.id_tn = pl.id_tn
            LEFT JOIN DIEM_DANH dd ON dd.id_tn = pl.id_tn
                AND dd.id_lop = pl.id_lop
                AND dd.ngay_diem_danh = NULLIF($4, '')::DATE
                AND dd.loai_buoi = $5::enum_loai_buoi
            WHERE pc.id_glv = $1
              AND pc.id_cau_hinh_nam_hoc = $2
              AND pc.id_lop = $3
            ORDER BY tn.ten, tn.ho_va_ten_lot, tn.ten_thanh
        `, [idGlv, yearId, classId, attendanceDate || '', sessionType]);
        return rows;
    },

    async saveAttendance(idGlv, yearId, classId, attendanceDate, sessionType, attendance) {
        const sessionTypes = ['Lễ Thứ 3', 'Lễ Thứ 5', 'Lễ Chúa Nhật', 'Học Giáo Lý'];
        const statuses = ['Có mặt', 'Đi sớm', 'Vắng phép', 'Vắng không phép'];
        if (!Number.isInteger(yearId) || !Number.isInteger(classId) || !/^\d{4}-\d{2}-\d{2}$/.test(attendanceDate || '') || !sessionTypes.includes(sessionType)) {
            throw new Error('Thông tin điểm danh không hợp lệ.');
        }
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const assigned = await client.query(`
                SELECT 1 FROM PHAN_CONG_GLV
                WHERE id_glv = $1 AND id_lop = $2 AND id_cau_hinh_nam_hoc = $3
            `, [idGlv, classId, yearId]);
            if (!assigned.rows.length) throw new Error('Bạn không có quyền điểm danh lớp này.');
            const students = await client.query(`
                SELECT id_tn FROM PHAN_LOP
                WHERE id_lop = $1 AND id_cau_hinh_nam_hoc = $2 AND trang_thai = 'Đang học'
            `, [classId, yearId]);
            const allowedIds = new Set(students.rows.map(row => String(row.id_tn)));
            const validAttendance = attendance
                .filter(item => allowedIds.has(String(item.id_tn)) && statuses.includes(item.trang_thai))
                .map(item => ({
                    id_tn: Number(item.id_tn),
                    trang_thai: item.trang_thai
                }));
            const markedIds = validAttendance.map(item => item.id_tn);
            await client.query(`
                DELETE FROM DIEM_DANH
                WHERE ngay_diem_danh = $1
                  AND loai_buoi = $2::enum_loai_buoi
                  AND id_lop = $3
                  AND id_tn = ANY($4::integer[])
            `, [attendanceDate, sessionType, classId,
                students.rows
                    .map(row => row.id_tn)
                    .filter(idTn => !markedIds.includes(idTn))]);
            if (validAttendance.length) {
                await client.query(`
                    INSERT INTO DIEM_DANH (ngay_diem_danh, loai_buoi, trang_thai, id_lop, id_tn)
                    SELECT $1, $2::enum_loai_buoi, item.trang_thai::enum_diem_danh, $3, item.id_tn
                    FROM jsonb_to_recordset($4::jsonb) AS item(id_tn integer, trang_thai text)
                    ON CONFLICT (ngay_diem_danh, loai_buoi, id_tn)
                    DO UPDATE SET trang_thai = EXCLUDED.trang_thai, id_lop = EXCLUDED.id_lop
                `, [attendanceDate, sessionType, classId, JSON.stringify(validAttendance)]);
            }

            const month = Number(attendanceDate.slice(5, 7));
            for (const row of students.rows) {
                await client.query(
                    'CALL sp_tinh_chuyen_can_thang($1, $2, $3)',
                    [row.id_tn, month, yearId]
                );
            }
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async markAttendanceByQr(idGlv, yearId, classId, studentId, mstn, attendanceDate, sessionType, status = 'Có mặt') {
        const sessionTypes = ['Lễ Thứ 3', 'Lễ Thứ 5', 'Lễ Chúa Nhật', 'Học Giáo Lý'];
        const statuses = ['Có mặt', 'Đi sớm'];
        if (!Number.isInteger(yearId) || !Number.isInteger(classId)
            || !/^\d{4}-\d{2}-\d{2}$/.test(attendanceDate || '')
            || !sessionTypes.includes(sessionType) || !statuses.includes(status)) {
            throw new Error('Thông tin quét điểm danh không hợp lệ.');
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const studentResult = await client.query(`
                SELECT tn.id_tn, tn.mstn,
                       CONCAT_WS(' ', tn.ten_thanh, tn.ho_va_ten_lot, tn.ten) AS ho_ten
                FROM PHAN_CONG_GLV pc
                JOIN PHAN_LOP pl ON pl.id_lop = pc.id_lop
                    AND pl.id_cau_hinh_nam_hoc = pc.id_cau_hinh_nam_hoc
                    AND pl.trang_thai = 'Đang học'
                JOIN THIEU_NHI tn ON tn.id_tn = pl.id_tn
                WHERE pc.id_glv = $1
                  AND pc.id_lop = $2
                  AND pc.id_cau_hinh_nam_hoc = $3
                  AND (($4::int IS NOT NULL AND tn.id_tn = $4)
                    OR ($5::text IS NOT NULL AND tn.mstn = $5))
                LIMIT 1
            `, [idGlv, classId, yearId, studentId, mstn]);

            if (!studentResult.rows.length) {
                throw new Error('QR không thuộc thiếu nhi đang học trong lớp này.');
            }

            const student = studentResult.rows[0];
            await client.query(`
                INSERT INTO DIEM_DANH (ngay_diem_danh, loai_buoi, trang_thai, id_lop, id_tn)
                VALUES ($1, $2::enum_loai_buoi, $3::enum_diem_danh, $4, $5)
                ON CONFLICT (ngay_diem_danh, loai_buoi, id_tn)
                DO UPDATE SET trang_thai = EXCLUDED.trang_thai, id_lop = EXCLUDED.id_lop
            `, [attendanceDate, sessionType, status, classId, student.id_tn]);

            await client.query('CALL sp_tinh_chuyen_can_thang($1, $2, $3)', [
                student.id_tn,
                Number(attendanceDate.slice(5, 7)),
                yearId
            ]);

            await client.query('COMMIT');
            return student;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
};

module.exports = DiemDanhModel;
