const pool = require('../../../config/database');

const DashboardModel = {
    async getDashboardData(idGlv, yearId) {
        const [classesResult, attendanceResult, attendanceAlertsResult, scoreAlertsResult, disciplineAlertsResult] = await Promise.all([
            pool.query(`
                WITH student_attendance AS (
                    SELECT l.id_lop, l.ten_lop, k.ten_khoi, k.stt,
                           pl.id_tn, tn.gioi_tinh,
                           COUNT(dd.id_diem_danh)::int AS total_sessions,
                           (
                               COUNT(*) FILTER (WHERE dd.trang_thai IN ('Có mặt', 'Đi sớm'))
                               + COUNT(*) FILTER (WHERE dd.trang_thai = 'Đi trễ')
                               - FLOOR(COUNT(*) FILTER (WHERE dd.trang_thai = 'Đi trễ') / 2.0)
                           )::int AS attended_sessions
                    FROM PHAN_CONG_GLV pc
                    JOIN LOP_HOC l ON l.id_lop = pc.id_lop
                    JOIN KHOI k ON k.id_khoi = l.id_khoi
                    LEFT JOIN PHAN_LOP pl ON pl.id_lop = l.id_lop
                        AND pl.id_cau_hinh_nam_hoc = $2
                        AND pl.trang_thai = 'Đang học'
                    LEFT JOIN THIEU_NHI tn ON tn.id_tn = pl.id_tn
                    LEFT JOIN DIEM_DANH dd ON dd.id_tn = pl.id_tn
                        AND dd.id_lop = pl.id_lop
                        AND dd.ngay_diem_danh >= DATE_TRUNC('month', CURRENT_DATE)::date
                        AND dd.ngay_diem_danh < (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::date
                    WHERE pc.id_glv = $1
                      AND pc.id_cau_hinh_nam_hoc = $2
                    GROUP BY l.id_lop, l.ten_lop, k.ten_khoi, k.stt, pl.id_tn, tn.gioi_tinh
                )
                SELECT id_lop, ten_lop, ten_khoi, stt,
                       COUNT(DISTINCT id_tn)::int AS student_count,
                       COUNT(DISTINCT id_tn) FILTER (WHERE gioi_tinh = 'Nam')::int AS male_count,
                       COUNT(DISTINCT id_tn) FILTER (WHERE gioi_tinh = 'Nữ')::int AS female_count,
                       COALESCE(ROUND(100.0 * SUM(attended_sessions) / NULLIF(SUM(total_sessions), 0), 1), 0) AS attendance_rate
                FROM student_attendance
                GROUP BY id_lop, ten_lop, ten_khoi, stt
                ORDER BY stt, ten_lop
            `, [idGlv, yearId]),
            pool.query(`
                WITH assigned_students AS (
                    SELECT DISTINCT pl.id_tn
                    FROM PHAN_CONG_GLV pc
                    JOIN PHAN_LOP pl ON pl.id_lop = pc.id_lop
                        AND pl.id_cau_hinh_nam_hoc = pc.id_cau_hinh_nam_hoc
                        AND pl.trang_thai = 'Đang học'
                    WHERE pc.id_glv = $1 AND pc.id_cau_hinh_nam_hoc = $2
                ), latest AS (
                    SELECT dd.ngay_diem_danh, dd.loai_buoi
                    FROM DIEM_DANH dd
                    JOIN assigned_students s ON s.id_tn = dd.id_tn
                    GROUP BY dd.ngay_diem_danh, dd.loai_buoi
                    ORDER BY dd.ngay_diem_danh DESC
                    LIMIT 1
                )
                SELECT latest.ngay_diem_danh, latest.loai_buoi,
                       COUNT(*) FILTER (WHERE dd.trang_thai IN ('Có mặt', 'Đi sớm'))::int AS present_count,
                       COUNT(*) FILTER (WHERE dd.trang_thai = 'Đi trễ')::int AS late_count,
                       COUNT(*) FILTER (WHERE dd.trang_thai IN ('Vắng phép', 'Vắng không phép'))::int AS absent_count,
                       COUNT(dd.id_tn)::int AS marked_count,
                       (SELECT COUNT(*) FROM assigned_students)::int AS total_count,
                       ROUND(100.0 * COUNT(*) FILTER (WHERE dd.trang_thai IN ('Có mặt', 'Đi sớm')) / NULLIF(COUNT(dd.id_tn), 0), 1) AS attendance_rate
                FROM latest
                JOIN DIEM_DANH dd ON dd.ngay_diem_danh = latest.ngay_diem_danh AND dd.loai_buoi = latest.loai_buoi
                JOIN assigned_students s ON s.id_tn = dd.id_tn
                GROUP BY latest.ngay_diem_danh, latest.loai_buoi
            `, [idGlv, yearId]),
            pool.query(`
                SELECT DISTINCT score.id_tn, score.mstn,
                       CONCAT_WS(' ', score.ten_thanh, score.ho_va_ten_lot, score.ten) AS ho_ten,
                       score.diem_chuyen_can
                FROM PHAN_CONG_GLV pc
                JOIN PHAN_LOP pl
                    ON pl.id_lop = pc.id_lop
                    AND pl.id_cau_hinh_nam_hoc = pc.id_cau_hinh_nam_hoc
                    AND pl.trang_thai = 'Đang học'
                JOIN vw_bang_diem_realtime score
                    ON score.id_tn = pl.id_tn
                    AND score.id_lop = pl.id_lop
                    AND score.id_cau_hinh_nam_hoc = pl.id_cau_hinh_nam_hoc
                WHERE pc.id_glv = $1
                  AND pc.id_cau_hinh_nam_hoc = $2
                  AND score.diem_chuyen_can < 5
                ORDER BY score.diem_chuyen_can, ho_ten
            `, [idGlv, yearId]),
            pool.query(`
                SELECT DISTINCT score.id_tn, score.mstn,
                       CONCAT_WS(' ', score.ten_thanh, score.ho_va_ten_lot, score.ten) AS ho_ten,
                       score.diem_hoc_tap
                FROM PHAN_CONG_GLV pc
                JOIN PHAN_LOP pl
                    ON pl.id_lop = pc.id_lop
                    AND pl.id_cau_hinh_nam_hoc = pc.id_cau_hinh_nam_hoc
                    AND pl.trang_thai = 'Đang học'
                JOIN vw_bang_diem_realtime score
                    ON score.id_tn = pl.id_tn
                    AND score.id_lop = pl.id_lop
                    AND score.id_cau_hinh_nam_hoc = pl.id_cau_hinh_nam_hoc
                WHERE pc.id_glv = $1
                  AND pc.id_cau_hinh_nam_hoc = $2
                  AND score.diem_hoc_tap < 5
                ORDER BY score.diem_hoc_tap, ho_ten
            `, [idGlv, yearId]),
            pool.query(`
                SELECT DISTINCT score.id_tn, score.mstn,
                       CONCAT_WS(' ', score.ten_thanh, score.ho_va_ten_lot, score.ten) AS ho_ten,
                       score.diem_ky_luat
                FROM PHAN_CONG_GLV pc
                JOIN PHAN_LOP pl
                    ON pl.id_lop = pc.id_lop
                    AND pl.id_cau_hinh_nam_hoc = pc.id_cau_hinh_nam_hoc
                    AND pl.trang_thai = 'Đang học'
                JOIN vw_bang_diem_realtime score
                    ON score.id_tn = pl.id_tn
                    AND score.id_lop = pl.id_lop
                    AND score.id_cau_hinh_nam_hoc = pl.id_cau_hinh_nam_hoc
                WHERE pc.id_glv = $1
                  AND pc.id_cau_hinh_nam_hoc = $2
                  AND score.diem_ky_luat < 7
                ORDER BY score.diem_ky_luat, ho_ten
            `, [idGlv, yearId])
        ]);

        return {
            classes: classesResult.rows,
            attendance: attendanceResult.rows[0] || null,
            attendanceAlerts: attendanceAlertsResult.rows,
            scoreAlerts: scoreAlertsResult.rows,
            disciplineAlerts: disciplineAlertsResult.rows
        };
    }
};

module.exports = DashboardModel;
