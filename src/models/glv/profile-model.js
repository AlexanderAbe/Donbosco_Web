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

    // 2. Cập nhật số điện thoại giáo lý viên
    async updateGlvPhone(id_glv, sdt) {
        try {
            const query = `
                UPDATE GLV 
                SET sdt = $1
                WHERE id_glv = $2
            `;
            const values = [sdt, id_glv];
            
            await pool.query(query, values);
            return true;
        } catch (error) {
            console.error('❌ Lỗi cập nhật thông tin GLV:', error);
            throw error;
        }
    }
};

module.exports = ProfileModel;