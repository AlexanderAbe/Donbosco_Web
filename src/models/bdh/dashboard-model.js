const pool = require('../../../config/database');
const PDFDocument = require('pdfkit');

const DashboardModel = {
    // 1. Lấy danh sách niên khóa cho bộ lọc
    async getDanhSachNienKhoa() {
        try {
            const query = `
                SELECT id_cau_hinh_nam_hoc, nien_khoa, ngay_tao 
                FROM CAU_HINH_NAM_HOC 
                ORDER BY nien_khoa DESC;
            `;
            const result = await pool.query(query);
            return result.rows;
        } catch (error) {
            console.error('❌ Lỗi lấy danh sách niên khóa:', error);
            return [];
        }
    },

    // 2. Lấy các chỉ số KPI và dữ liệu tổng quan theo năm học
    async getDashboardStats(idCauHinhNamHoc) {
        try {
            // Nếu chưa truyền idCauHinhNamHoc, lấy niên khóa mới nhất làm mặc định
            let currentId = idCauHinhNamHoc;
            if (!currentId) {
                const latestYear = await pool.query(`
                    SELECT id_cau_hinh_nam_hoc FROM CAU_HINH_NAM_HOC ORDER BY nien_khoa DESC LIMIT 1;
                `);
                currentId = latestYear.rows[0]?.id_cau_hinh_nam_hoc || 1;
            }

            const [glvCount, glvDangDayCount, thieuNhiCount, truongKhoiRes, glvChuaPhanCongRes, thongKeLopRes, tongKetRes] = await Promise.all([
                // Tổng số GLV
                pool.query('SELECT COUNT(*) FROM GLV'),
                
                // Số GLV đang đứng lớp trong năm học
                pool.query(`
                    SELECT COUNT(DISTINCT pc.id_glv) AS count
                    FROM PHAN_CONG_GLV pc
                    JOIN LOP_HOC l ON pc.id_lop = l.id_lop
                    WHERE l.id_cau_hinh_nam_hoc = $1;
                `, [currentId]),

                // Tổng số thiếu nhi phân bổ trong năm học
                pool.query(`
                    SELECT COUNT(DISTINCT id_tn) AS count 
                    FROM PHAN_LOP 
                    WHERE id_cau_hinh_nam_hoc = $1;
                `, [currentId]),

                // Danh sách Trưởng khối theo năm học
                pool.query(`
                    SELECT k.id_khoi, k.ten_khoi, 
                           g.ten_thanh, g.ho_va_ten_lot, g.ten, g.sdt
                    FROM KHOI k
                    LEFT JOIN PHAN_CONG_TRUONG_KHOI pk ON k.id_khoi = pk.id_khoi AND pk.id_cau_hinh_nam_hoc = $1
                    LEFT JOIN GLV g ON pk.id_glv = g.id_glv
                    ORDER BY k.stt ASC;
                `, [currentId]),

                // Danh sách GLV chưa phân công lớp
                pool.query(`
                    SELECT g.id_glv, g.ten_thanh, g.ho_va_ten_lot, g.ten, g.sdt
                    FROM GLV g
                    WHERE g.id_glv NOT IN (
                        SELECT pc.id_glv 
                        FROM PHAN_CONG_GLV pc
                        JOIN LOP_HOC l ON pc.id_lop = l.id_lop
                        WHERE l.id_cau_hinh_nam_hoc = $1
                    );
                `, [currentId]),

                // Thống kê số lượng GLV theo lớp (để cảnh báo lớp thiếu người)
                pool.query(`
                    SELECT l.ten_lop, k.ten_khoi, COUNT(pc.id_glv) AS so_luong_glv
                    FROM LOP_HOC l
                    JOIN KHOI k ON l.id_khoi = k.id_khoi
                    LEFT JOIN PHAN_CONG_GLV pc ON l.id_lop = pc.id_lop
                    WHERE l.id_cau_hinh_nam_hoc = $1
                    GROUP BY l.id_lop, l.ten_lop, k.ten_khoi, k.stt
                    ORDER BY k.stt ASC, l.ten_lop ASC;
                `, [currentId]),

                // Kiểm tra niên khóa đã được tổng kết hay chưa
                pool.query(`
                    SELECT EXISTS (
                        SELECT 1 FROM TONG_KET_NAM_HOC
                        WHERE id_cau_hinh_nam_hoc = $1
                    ) AS da_tong_ket;
                `, [currentId])
            ]);

            const totalGlv = parseInt(glvCount.rows[0].count) || 0;
            const glvDangDay = parseInt(glvDangDayCount.rows[0].count) || 0;

            return {
                currentId,
                totalGlv,
                glvDangDay,
                glvChuaPhanCong: totalGlv - glvDangDay,
                totalThieuNhi: parseInt(thieuNhiCount.rows[0].count) || 0,
                truongKhoiList: truongKhoiRes.rows,
                glvChuaPhanCongList: glvChuaPhanCongRes.rows,
                thongKeLopList: thongKeLopRes.rows
                ,daTongKet: tongKetRes.rows[0]?.da_tong_ket || false
            };

        } catch (error) {
            console.error('❌ Lỗi lấy thống kê Dashboard BDH:', error);
            return {
                currentId: null,
                totalGlv: 0,
                glvDangDay: 0,
                glvChuaPhanCong: 0,
                totalThieuNhi: 0,
                truongKhoiList: [],
                glvChuaPhanCongList: [],
                thongKeLopList: [],
                daTongKet: false
            };
        }
    },

};

module.exports = DashboardModel;