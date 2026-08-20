const pool = require('../../config/database');

const AuthModel = {
    // 1. Tìm tài khoản theo username từ View vw_tai_khoan_glv để lấy đủ thông tin trạng thái
    async findByUsername(phone) {
        const query = `SELECT * FROM vw_tai_khoan_glv WHERE username = $1`;
        const { rows } = await pool.query(query, [phone]);
        return rows[0];
    },

    // Kiểm tra quyền Ban Điều Hành
    async checkBdh(id_glv) {
        const result = await pool.query('SELECT * FROM PHAN_CONG_BDH WHERE id_glv = $1', [id_glv]);
        return result.rows.length > 0;
    },

    // Kiểm tra quyền Trưởng Khối
    async checkTruongKhoi(id_glv) {
        const result = await pool.query('SELECT * FROM PHAN_CONG_TRUONG_KHOI WHERE id_glv = $1', [id_glv]);
        return result.rows.length > 0;
    },

    // 2. Tìm tài khoản theo ID
    async findById(id_tk) {
        const result = await pool.query('SELECT * FROM vw_tai_khoan_glv WHERE id_tk = $1', [id_tk]);
        return result.rows[0];
    },

    // Cập nhật mật khẩu mới theo ID tài khoản
    async updatePassword(id_tk, newPasswordHash) {
        await pool.query('UPDATE TAI_KHOAN SET password_hash = $1 WHERE id_tk = $2', [newPasswordHash, id_tk]);
    },

    // Cập nhật mật khẩu mới theo username
    async updatePasswordByUsername(username, newPasswordHash) {
        await pool.query(
            'UPDATE TAI_KHOAN SET password_hash = $1, reset_otp = NULL, otp_expires = NULL WHERE username = $2',
            [newPasswordHash, username]
        );
    },

    // Lấy danh sách Admin để hiển thị trang quên mật khẩu
    async getAdminContacts() {
        try {
            const result = await pool.query(`
                SELECT ho_ten
                FROM vw_tai_khoan_glv 
                WHERE is_admin = true
            `);
            
            return result.rows.map(admin => ({
                ho_ten: admin.ho_ten || 'Quản Trị Viên',
                username: admin.sdt || admin.username
            }));
        } catch (error) {
            return [];
        }
    }
};

const Model = AuthModel;
module.exports = Model;