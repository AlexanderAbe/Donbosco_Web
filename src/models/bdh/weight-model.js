const pool = require('../../../config/database');

const WeightModel = {
    // Lấy lịch sử các cấu hình niên khóa trước
    async getAllConfigs() {
        try {
            const { rows } = await pool.query(
                'SELECT * FROM CAU_HINH_NAM_HOC ORDER BY nien_khoa DESC'
            );
            return rows;
        } catch (error) {
            console.error('❌ Lỗi lấy lịch sử cấu hình niên khóa:', error);
            return [];
        }
    },

    // Thêm cấu hình niên khóa mới vào DB
    async createConfig(nienKhoa, trongSoHocTap, trongSoKyLuat, trongSoChuyenCan, soLuongBaiKtra, sttKhoiKetThuc) {
        try {
            const query = `
                INSERT INTO CAU_HINH_NAM_HOC 
                (nien_khoa, trong_so_hoc_tap, trong_so_ky_luat, trong_so_diem_chuyen_can, so_luong_bai_ktra, stt_khoi_ket_thuc, ngay_tao)
                VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE)
                RETURNING *;
            `;
            const values = [nienKhoa, trongSoHocTap, trongSoKyLuat, trongSoChuyenCan, soLuongBaiKtra, sttKhoiKetThuc || 11];
            const { rows } = await pool.query(query, values);
            return rows[0];
        } catch (error) {
            console.error('❌ Lỗi lưu cấu hình vào DB:', error);
            throw error;
        }
    }
};

module.exports = WeightModel;