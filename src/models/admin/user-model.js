const pool = require('../../../config/database');
const bcrypt = require('bcrypt');

const UserModel = {
    // Lấy toàn bộ danh sách tài khoản kèm thông tin GLV từ View
    async getAllUsers() {
        try {
            const result = await pool.query('SELECT * FROM vw_tai_khoan_glv ORDER BY id_tk ASC');
            return result.rows;
        } catch (error) {
            console.error('❌ Lỗi lấy danh sách user:', error);
            return [];
        }
    },

    // Cập nhật trạng thái tài khoản (Khóa / Mở khóa) vào bảng gốc TAI_KHOAN
    async updateUserStatus(userId, newStatus) {
        try {
            const query = 'UPDATE TAI_KHOAN SET trang_thai = $1 WHERE id_tk = $2';
            await pool.query(query, [newStatus, userId]);
            return true;
        } catch (error) {
            console.error('❌ Lỗi cập nhật trạng thái user:', error);
            throw error;
        }
    },

    // Lấy thông tin user theo ID (Dành cho trang Đổi mật khẩu)
    async getUserById(userId) {
        try {
            const query = 'SELECT * FROM vw_tai_khoan_glv WHERE id_tk = $1';
            const { rows } = await pool.query(query, [userId]);
            return rows[0];
        } catch (error) {
            console.error('❌ Lỗi lấy user theo ID:', error);
            throw error;
        }
    },

    // Cập nhật mật khẩu mới vào bảng TAI_KHOAN
    async updatePassword(userId, newPassword) {
        try {
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
            const query = 'UPDATE TAI_KHOAN SET password_hash = $1 WHERE id_tk = $2';
            await pool.query(query, [hashedPassword, userId]);
            return true;
        } catch (error) {
            console.error('❌ Lỗi đổi mật khẩu:', error);
            throw error;
        }
    },

    // Tìm kiếm tài khoản theo username hoặc họ tên
    async searchUsers(keyword) {
        try {
            const query = `
                SELECT * FROM vw_tai_khoan_glv 
                WHERE username ILIKE $1 OR ho_ten ILIKE $1 
                ORDER BY id_tk ASC
            `;
            const searchPattern = `%${keyword}%`;
            const { rows } = await pool.query(query, [searchPattern]);
            return rows;
        } catch (error) {
            console.error('❌ Lỗi tìm kiếm user:', error);
            return [];
        }
    },

    // Cập nhật quyền cho Giáo lý viên
    async updateGlvRoles(id_glv, roles) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Cập nhật quyền Admin trong bảng tai_khoan
            await client.query(
                `UPDATE tai_khoan SET is_admin = $1 WHERE id_glv = $2`,
                [roles.isAdmin, id_glv]
            );

            // 2. Xử lý bảng Ban Điều Hành (PHAN_CONG_BDH)
            const checkBdh = await client.query(`SELECT * FROM PHAN_CONG_BDH WHERE id_glv = $1`, [id_glv]);
            if (roles.isBdh && checkBdh.rows.length === 0) {
                await client.query(`INSERT INTO PHAN_CONG_BDH (id_glv) VALUES ($1)`, [id_glv]);
            } else if (!roles.isBdh && checkBdh.rows.length > 0) {
                await client.query(`DELETE FROM PHAN_CONG_BDH WHERE id_glv = $1`, [id_glv]);
            }

            // 3. Xử lý bảng Trưởng Khối (PHAN_CONG_TRUONG_KHOI)
            const checkTk = await client.query(`SELECT * FROM PHAN_CONG_TRUONG_KHOI WHERE id_glv = $1`, [id_glv]);
            if (roles.isTruongKhoi && checkTk.rows.length === 0) {
                await client.query(`INSERT INTO PHAN_CONG_TRUONG_KHOI (id_glv) VALUES ($1)`, [id_glv]);
            } else if (!roles.isTruongKhoi && checkTk.rows.length > 0) {
                await client.query(`DELETE FROM PHAN_CONG_TRUONG_KHOI WHERE id_glv = $1`, [id_glv]);
            }

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
};

module.exports = UserModel;