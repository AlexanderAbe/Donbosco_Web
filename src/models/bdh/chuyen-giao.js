const pool = require('../../../config/database');
const NamHocMoiModel = {
    async getAcademicYears() {
        const result = await pool.query(`
            SELECT id_cau_hinh_nam_hoc, nien_khoa, stt_khoi_ket_thuc, is_locked
            FROM CAU_HINH_NAM_HOC
            ORDER BY nien_khoa DESC
        `);
        return result.rows;
    },

    async hasSummary(id_cau_hinh) {
        const result = await pool.query(`
            SELECT EXISTS (
                SELECT 1 FROM TONG_KET_NAM_HOC
                WHERE id_cau_hinh_nam_hoc = $1
            ) AS has_summary
        `, [id_cau_hinh]);
        return result.rows[0].has_summary;
    },

    async getAwardStudents(id_cau_hinh) {
        const result = await pool.query(`
            SELECT ten_thanh, ho_va_ten_lot, ten, ten_khoi,
                   nien_khoa, ten_xep_loai
            FROM vw_tong_ket_chi_tiet
            WHERE id_cau_hinh_nam_hoc = $1
              AND tinh_trang = 'Đạt'
              AND ten_xep_loai IS NOT NULL
            ORDER BY ten_khoi, ho_va_ten_lot, ten, ten_thanh
        `, [id_cau_hinh]);
        return result.rows;
    },
// 3. Lấy thông tin niên khóa theo ID cấu hình
    async getNienKhoaById(id_cau_hinh) {
        try {
            const query = 'SELECT nien_khoa FROM CAU_HINH_NAM_HOC WHERE id_cau_hinh_nam_hoc = $1';
            const result = await pool.query(query, [id_cau_hinh]);
            return result.rows[0];
        } catch (error) {
            console.error('❌ Lỗi lấy niên khóa theo ID:', error);
            return null;
        }
    },

    // 4. Lấy danh sách các lớp có dữ liệu tổng kết trong niên khóa (để chia trang PDF)
    async getDanhSachLopTongKet(id_cau_hinh) {
        try {
            const query = `
                SELECT DISTINCT l.id_lop, l.ten_lop, k.ten_khoi 
                FROM TONG_KET_NAM_HOC tk 
                JOIN LOP_HOC l ON tk.id_lop = l.id_lop 
                JOIN KHOI k ON l.id_khoi = k.id_khoi 
                WHERE tk.id_cau_hinh_nam_hoc = $1 
                ORDER BY k.ten_khoi, l.ten_lop;
            `;
            const result = await pool.query(query, [id_cau_hinh]);
            return result.rows;
        } catch (error) {
            console.error('❌ Lỗi lấy danh sách lớp tổng kết:', error);
            return [];
        }
    },

    // 5. Lấy danh sách học sinh chi tiết của từng lớp từ View đã cấu hình
    async getHocSinhTheoLop(id_lop, id_cau_hinh) {
        try {
            const query = `
                SELECT mstn, ten_thanh, ho_va_ten_lot, ten, diem_hoc_tap, diem_chuyen_can, diem_ky_luat, diem_tong, ten_xep_loai, tinh_trang 
                FROM vw_tong_ket_chi_tiet 
                WHERE id_lop = $1 AND id_cau_hinh_nam_hoc = $2 
                ORDER BY ho_va_ten_lot, ten;
            `;
            const result = await pool.query(query, [id_lop, id_cau_hinh]);
            return result.rows;
        } catch (error) {
            console.error('❌ Lỗi lấy danh sách học sinh theo lớp:', error);
            return [];
        }
    },

    // Khóa niên khóa độc lập với thao tác chuyển giao
    async lockNienKhoa(id_cau_hinh, client = pool) {
        const query = `
            UPDATE CAU_HINH_NAM_HOC 
            SET is_locked = TRUE 
            WHERE id_cau_hinh_nam_hoc = $1
        `;
        await client.query(query, [id_cau_hinh]);
    }
};

module.exports = NamHocMoiModel;