const pool = require('../../../config/database');

const DashboardModel = {
    async getDashboardData(idGlv, yearId) {
        const [classesResult, attendanceResult, attendanceAlertsResult, scoreAlertsResult] = await Promise.all([
            pool.query(`
                SELECT l.id_lop, l.ten_lop, k.ten_khoi, k.stt,
                       COUNT(DISTINCT pl.id_tn)::int AS student_count,
                       COUNT(DISTINCT pl.id_tn) FILTER (WHERE tn.gioi_tinh = 'Nam')::int AS male_count,
                       COUNT(DISTINCT pl.id_tn) FILTER (WHERE tn.gioi_tinh = 'Nữ')::int AS female_count,
                       COALESCE(ROUND(100.0 * COUNT(dd.id_diem_danh) FILTER (WHERE dd.trang_thai IN ('Có mặt', 'Đi sớm')) / NULLIF(COUNT(dd.id_diem_danh), 0), 1), 0) AS attendance_rate
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
                GROUP BY l.id_lop, l.ten_lop, k.ten_khoi, k.stt
                ORDER BY k.stt, l.ten_lop
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
                WITH assigned_students AS (
                    SELECT DISTINCT pl.id_tn, pl.id_lop
                    FROM PHAN_CONG_GLV pc
                    JOIN PHAN_LOP pl ON pl.id_lop = pc.id_lop
                        AND pl.id_cau_hinh_nam_hoc = pc.id_cau_hinh_nam_hoc
                        AND pl.trang_thai = 'Đang học'
                    WHERE pc.id_glv = $1 AND pc.id_cau_hinh_nam_hoc = $2
                ), latest_sessions AS (
                    SELECT DISTINCT dd.ngay_diem_danh, dd.loai_buoi
                    FROM DIEM_DANH dd
                    JOIN assigned_students s ON s.id_tn = dd.id_tn AND s.id_lop = dd.id_lop
                    WHERE dd.loai_buoi = 'Học Giáo Lý'
                    ORDER BY dd.ngay_diem_danh DESC, dd.loai_buoi DESC
                    LIMIT 5
                ), numbered_sessions AS (
                    SELECT ngay_diem_danh, loai_buoi,
                           ROW_NUMBER() OVER (ORDER BY ngay_diem_danh, loai_buoi) AS session_number
                    FROM latest_sessions
                ), student_sessions AS (
                    SELECT s.id_tn, ns.session_number,
                           (dd.trang_thai IN ('Vắng phép', 'Vắng không phép')) AS is_absent
                    FROM assigned_students s
                    CROSS JOIN numbered_sessions ns
                    LEFT JOIN DIEM_DANH dd
                        ON dd.id_tn = s.id_tn
                        AND dd.id_lop = s.id_lop
                        AND dd.ngay_diem_danh = ns.ngay_diem_danh
                        AND dd.loai_buoi = ns.loai_buoi
                ), absent_runs AS (
                    SELECT id_tn, COUNT(*)::int AS run_length
                    FROM (
                        SELECT id_tn, session_number,
                               session_number - ROW_NUMBER() OVER (PARTITION BY id_tn ORDER BY session_number) AS run_group
                        FROM student_sessions
                        WHERE is_absent
                    ) absent_rows
                    GROUP BY id_tn, run_group
                ), alert_summary AS (
                    SELECT ss.id_tn,
                           COUNT(*) FILTER (WHERE ss.is_absent)::int AS absent_count,
                           COALESCE(MAX(ar.run_length), 0)::int AS max_consecutive_absences
                    FROM student_sessions ss
                    LEFT JOIN absent_runs ar ON ar.id_tn = ss.id_tn
                    GROUP BY ss.id_tn
                )
                SELECT tn.id_tn, tn.mstn,
                       CONCAT_WS(' ', tn.ten_thanh, tn.ho_va_ten_lot, tn.ten) AS ho_ten,
                       alert_summary.absent_count,
                       alert_summary.max_consecutive_absences
                FROM alert_summary
                JOIN THIEU_NHI tn ON tn.id_tn = alert_summary.id_tn
                WHERE alert_summary.absent_count >= 2
                ORDER BY (alert_summary.max_consecutive_absences >= 2) DESC,
                         alert_summary.max_consecutive_absences DESC,
                         alert_summary.absent_count DESC,
                         ho_ten
                LIMIT 10
            `, [idGlv, yearId]),
            pool.query(`
                SELECT tn.id_tn, tn.mstn, CONCAT_WS(' ', tn.ten_thanh, tn.ho_va_ten_lot, tn.ten) AS ho_ten,
                       ROUND(AVG(dht.diem_so), 2) AS average_score
                FROM PHAN_CONG_GLV pc
                JOIN PHAN_LOP pl ON pl.id_lop = pc.id_lop AND pl.id_cau_hinh_nam_hoc = pc.id_cau_hinh_nam_hoc AND pl.trang_thai = 'Đang học'
                JOIN THIEU_NHI tn ON tn.id_tn = pl.id_tn
                JOIN DIEM_HOC_TAP dht ON dht.id_tn = pl.id_tn AND dht.id_cau_hinh_nam_hoc = pl.id_cau_hinh_nam_hoc
                WHERE pc.id_glv = $1 AND pc.id_cau_hinh_nam_hoc = $2
                GROUP BY tn.id_tn, tn.mstn, tn.ten_thanh, tn.ho_va_ten_lot, tn.ten
                HAVING AVG(dht.diem_so) <= 5
                ORDER BY average_score, ho_ten
                LIMIT 10
            `, [idGlv, yearId])
        ]);

        return {
            classes: classesResult.rows,
            attendance: attendanceResult.rows[0] || null,
            attendanceAlerts: attendanceAlertsResult.rows,
            scoreAlerts: scoreAlertsResult.rows
        };
    }
};

module.exports = DashboardModel;
