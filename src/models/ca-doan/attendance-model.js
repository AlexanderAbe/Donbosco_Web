const pool = require('../../../config/database');
const LogModel = require('../admin/logs-model');

const sessionTypesByWeekday = new Map([
    [0, ['Lễ Chúa Nhật']],
    [2, ['Lễ Thứ 3']],
    [4, ['Lễ Thứ 5']]
]);
const attendanceStatuses = ['Có mặt', 'Đi sớm'];

const isAttendanceSession = (attendanceDate, sessionType) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(attendanceDate || '')) return false;
    const [year, month, day] = attendanceDate.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
        return false;
    }
    return (sessionTypesByWeekday.get(date.getUTCDay()) || []).includes(sessionType);
};

const AttendanceModel = {
    async getAcademicYears() {
        const { rows } = await pool.query(`
            SELECT id_cau_hinh_nam_hoc, nien_khoa
            FROM CAU_HINH_NAM_HOC
            ORDER BY nien_khoa DESC, id_cau_hinh_nam_hoc DESC
        `);
        return rows;
    },

    async getChoirStudents(yearId, attendanceDate, sessionType) {
        const { rows } = await pool.query(`
            SELECT
                tn.id_tn,
                tn.mstn,
                CONCAT_WS(' ', tn.ten_thanh, tn.ho_va_ten_lot, tn.ten) AS ho_ten,
                pl.id_lop,
                l.ten_lop,
                dd.trang_thai AS trang_thai_diem_danh,
                (dd.id_diem_danh IS NOT NULL) AS da_diem_danh
            FROM THIEU_NHI tn
            JOIN PHAN_LOP pl
                ON pl.id_tn = tn.id_tn
                AND pl.id_cau_hinh_nam_hoc = $1
                AND pl.trang_thai = 'Đang học'
                AND pl.id_lop IS NOT NULL
            JOIN LOP_HOC l ON l.id_lop = pl.id_lop
            LEFT JOIN DIEM_DANH dd
                ON dd.id_tn = tn.id_tn
                AND dd.ngay_diem_danh = $2::date
                AND dd.loai_buoi = $3::enum_loai_buoi
            WHERE tn.is_ca_doan = TRUE
            ORDER BY tn.ten, tn.ho_va_ten_lot, tn.ten_thanh
        `, [yearId, attendanceDate, sessionType]);
        return rows;
    },

    async markPresent({ yearId, studentId, mstn, attendanceDate, sessionType, status, idTk }) {
        if (!Number.isInteger(yearId) || !isAttendanceSession(attendanceDate, sessionType)
            || !attendanceStatuses.includes(status)
            || (!Number.isInteger(studentId) && !mstn)) {
            throw new Error('Thông tin điểm danh ca đoàn không hợp lệ.');
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const studentResult = await client.query(`
                SELECT
                    tn.id_tn,
                    tn.mstn,
                    CONCAT_WS(' ', tn.ten_thanh, tn.ho_va_ten_lot, tn.ten) AS ho_ten,
                    pl.id_lop
                FROM THIEU_NHI tn
                JOIN PHAN_LOP pl
                    ON pl.id_tn = tn.id_tn
                    AND pl.id_cau_hinh_nam_hoc = $1
                    AND pl.trang_thai = 'Đang học'
                    AND pl.id_lop IS NOT NULL
                WHERE tn.is_ca_doan = TRUE
                  AND (($2::int IS NOT NULL AND tn.id_tn = $2)
                    OR ($3::text IS NOT NULL AND tn.mstn = $3))
                LIMIT 1
            `, [yearId, studentId, mstn]);

            if (!studentResult.rows.length) {
                const error = new Error('Không tìm thấy mã ca viên đang học thuộc ca đoàn trong niên khóa này.');
                error.code = 'NOT_FOUND';
                throw error;
            }

            const student = studentResult.rows[0];
            await client.query(`
                INSERT INTO DIEM_DANH
                    (ngay_diem_danh, loai_buoi, trang_thai, id_lop, id_tn)
                VALUES ($1, $2::enum_loai_buoi, $3::enum_diem_danh, $4, $5)
                ON CONFLICT (ngay_diem_danh, loai_buoi, id_tn)
                DO UPDATE SET trang_thai = EXCLUDED.trang_thai, id_lop = EXCLUDED.id_lop
            `, [attendanceDate, sessionType, status, student.id_lop, student.id_tn]);

            await client.query('CALL sp_tinh_chuyen_can_thang($1, $2, $3)', [
                student.id_tn,
                Number(attendanceDate.slice(5, 7)),
                yearId
            ]);
            await client.query(`
                UPDATE TONG_KET_NAM_HOC
                SET tinh_trang = NULL
                WHERE id_tn = $1 AND id_lop = $2 AND id_cau_hinh_nam_hoc = $3
            `, [student.id_tn, student.id_lop, yearId]);
            await LogModel.insertLog(
                client,
                idTk,
                `Điểm danh ca đoàn (${student.ho_ten}, ${sessionType}, ${attendanceDate}, ${status})`,
                'Thành công',
            );
            await client.query('COMMIT');
            return { ...student, trang_thai_diem_danh: status, da_diem_danh: true };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
};

module.exports = { AttendanceModel, sessionTypesByWeekday, isAttendanceSession };
