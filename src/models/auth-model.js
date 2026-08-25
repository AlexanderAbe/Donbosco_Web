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
        // Chỉ cho phép dùng role Trưởng khối nếu được phân công trong niên khóa hiện tại.
        // Không kiểm tra toàn bộ lịch sử phân công để tránh quyền cũ vẫn còn hiệu lực.
        const result = await pool.query(`
            SELECT 1
            FROM PHAN_CONG_TRUONG_KHOI pk
            JOIN CAU_HINH_NAM_HOC nam_hoc
                ON nam_hoc.id_cau_hinh_nam_hoc = pk.id_cau_hinh_nam_hoc
            WHERE pk.id_glv = $1
              AND pk.id_cau_hinh_nam_hoc = (
                  SELECT id_cau_hinh_nam_hoc
                  FROM CAU_HINH_NAM_HOC
                  ORDER BY nien_khoa DESC, id_cau_hinh_nam_hoc DESC
                  LIMIT 1
              )
            LIMIT 1
        `, [id_glv]);
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