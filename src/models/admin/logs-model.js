const pool = require('../../../config/database');

const LogModel = {
    // Lấy danh sách logs gần đây cho Dashboard
    async getRecentLogs(limit = 5) {
        try {
            const query = `
                SELECT l.*, v.ho_ten, v.username 
                FROM audit_logs l
                LEFT JOIN vw_tai_khoan_glv v ON l.id_tk = v.id_tk
                ORDER BY l.created_at DESC
                LIMIT $1;
            `;
            const { rows } = await pool.query(query, [limit]);
            return rows;
        } catch (error) {
            console.error('❌ Lỗi lấy logs gần đây:', error);
            return [];
        }
    },

    // Lấy toàn bộ danh sách logs cho trang quản lý logs
    async getAllLogs(limit = 100) {
        try {
            const query = `
                SELECT l.*, v.ho_ten, v.username 
                FROM audit_logs l
                LEFT JOIN vw_tai_khoan_glv v ON l.id_tk = v.id_tk
                ORDER BY l.created_at DESC
                LIMIT $1;
            `;
            const { rows } = await pool.query(query, [limit]);
            return rows;
        } catch (error) {
            console.error('❌ Lỗi lấy tất cả logs:', error);
            return [];
        }
    }
};

module.exports = LogModel;