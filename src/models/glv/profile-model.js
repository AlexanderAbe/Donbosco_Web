const pool = require('../../../config/database'); // Điều chỉnh đường dẫn tới file kết nối pool PostgreSQL của bạn

const ProfileModel = {
    // 1. Lấy thông tin chi tiết giáo lý viên theo id_glv
    async getGlvById(id_glv) {
        try {
            const query = `
                SELECT id_glv, ten_thanh, ho_va_ten_lot, ten, ngay_sinh, gioi_tinh, sdt, trang_thai 
                FROM GLV 
                WHERE id_glv = $1
            `;
            const { rows } = await pool.query(query, [id_glv]);
            return rows[0] || null;
        } catch (error) {
            console.error('❌ Lỗi truy vấn thông tin GLV:', error);
            throw error;
        }
    },

    // 2. Cập nhật thông tin cá nhân giáo lý viên
    async updateGlvProfile(id_glv, data) {
        try {
            const query = `
                UPDATE GLV 
                SET ten_thanh = $1, 
                    ho_va_ten_lot = $2, 
                    ten = $3, 
                    ngay_sinh = $4, 
                    gioi_tinh = $5, 
                    sdt = $6
                WHERE id_glv = $7
            `;
            const values = [
                data.ten_thanh,
                data.ho_va_ten_lot,
                data.ten,
                data.ngay_sinh,
                data.gioi_tinh,
                data.sdt,
                id_glv
            ];
            
            await pool.query(query, values);
            return true;
        } catch (error) {
            console.error('❌ Lỗi cập nhật thông tin GLV:', error);
            throw error;
        }
    }
};

module.exports = ProfileModel;