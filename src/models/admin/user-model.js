const pool = require('../../../config/database');
const bcrypt = require('bcrypt');
const AuthModel = require('../auth-model');

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

    // Lấy toàn bộ GLV để trang phân quyền khớp với danh sách nhân sự ở BDH
    async getAllGlvForRoles() {
        const result = await pool.query(`
            SELECT
                g.id_glv,
                g.ten_thanh,
                g.ho_va_ten_lot,
                g.ten,
                CONCAT_WS(' ', g.ten_thanh, g.ho_va_ten_lot, g.ten) AS ho_ten,
                g.trang_thai,
                tk.id_tk,
                tk.username,
                tk.is_admin
            FROM GLV g
            LEFT JOIN TAI_KHOAN tk ON tk.id_glv = g.id_glv
            ORDER BY g.ten ASC, g.ho_va_ten_lot ASC, g.ten_thanh ASC
        `);
        return result.rows;
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

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    // --- BỔ SUNG: Lấy danh sách, gộp quyền và phân nhóm theo Role ---
    async getGroupedUsersWithRoles() {
        try {
            let allUsers = await this.getAllGlvForRoles();

            const usersWithRoles = await Promise.all(allUsers.map(async (user) => {
                let isBdh = false;

                if (user.id_glv) {
                    isBdh = await AuthModel.checkBdh(user.id_glv);
                }

                return {
                    ...user,
                    is_admin: user.is_admin || false,
                    is_bdh: isBdh,
                    is_truong_khoi: false
                };
            }));

            // Phân loại nhóm
            const admins = usersWithRoles.filter(u => u.is_admin);
            const bdhs = usersWithRoles.filter(u => u.is_bdh && !u.is_admin);
            const members = usersWithRoles.filter(u => !u.is_admin && !u.is_bdh);

            return { admins, bdhs, members };
        } catch (error) {
            console.error('❌ Lỗi gom nhóm user theo quyền:', error);
            throw error;
        }
    },
    
    // Lấy danh sách, gộp quyền và sắp xếp các role giống nhau đứng gần nhau
    async getUsersWithRolesSorted() {
        try {
            let allUsers = await this.getAllGlvForRoles();

            const usersWithRoles = await Promise.all(allUsers.map(async (user) => {
                let isBdh = false;

                if (user.id_glv) {
                    isBdh = await AuthModel.checkBdh(user.id_glv);
                }

                return {
                    ...user,
                    is_admin: user.is_admin || false,
                    is_bdh: isBdh,
                    is_truong_khoi: false
                };
            }));

            // Sắp xếp theo trọng số vai trò (Ai có quyền cao hơn sẽ được đẩy lên trên)
            usersWithRoles.sort((a, b) => {
                const getWeight = (u) => {
                    if (u.is_admin) return 1;          // Admin đứng đầu tiên
                    if (u.is_bdh) return 2;            // Tiếp theo là Ban Điều Hành
                    return 3;                          // Cuối cùng là giáo lý viên thường
                };

                return getWeight(a) - getWeight(b);
            });

            return usersWithRoles;
        } catch (error) {
            console.error('❌ Lỗi sắp xếp user theo quyền:', error);
            throw error;
        }
    }
};

module.exports = UserModel;