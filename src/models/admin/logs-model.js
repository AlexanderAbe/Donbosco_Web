const pool = require('../../../config/database');

const LogModel = {
    // Lấy danh sách logs gần đây cho Dashboard (giữ nguyên để không ảnh hưởng trang chủ)
    async getRecentLogs(limit = 5) {
        const query = `
            SELECT l.id_log, l.action, l.status,
                   (l.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh') AS created_at,
                   v.ho_ten, v.username
            FROM audit_logs l
            LEFT JOIN vw_tai_khoan_glv v ON l.id_tk = v.id_tk
            ORDER BY l.created_at DESC, l.id_log DESC
            LIMIT $1;
        `;
        const { rows } = await pool.query(query, [limit]);
        return rows;
    },

    // Phân trang và lọc theo ngày/người thực hiện.
    async getLogsWithPagination(page = 1, limit = 20, fromDate = null, toDate = null, search = null) {
        const baseFrom = `
            FROM audit_logs l
            LEFT JOIN vw_tai_khoan_glv v ON l.id_tk = v.id_tk WHERE 1=1`;
        const filters = [];
        const params = [];
        let paramIndex = 1;

        if (fromDate) {
            filters.push(` AND (l.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')::date >= $${paramIndex}`);
            params.push(fromDate);
            paramIndex += 1;
        }

        if (toDate) {
            filters.push(` AND (l.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')::date <= $${paramIndex}`);
            params.push(toDate);
            paramIndex += 1;
        }

        if (search) {
            filters.push(` AND (v.ho_ten ILIKE $${paramIndex} OR v.sdt ILIKE $${paramIndex})`);
            params.push(`%${search}%`);
            paramIndex += 1;
        }

        const whereClause = filters.join('');
        const countResult = await pool.query(
            `SELECT COUNT(*) ${baseFrom}${whereClause}`,
            params
        );
        const totalRecords = Number.parseInt(countResult.rows[0].count, 10);
        const totalPages = Math.ceil(totalRecords / limit) || 1;
        const currentPage = Math.min(page, totalPages);
        const offset = (currentPage - 1) * limit;
        const query = `
            SELECT l.id_log, l.action, l.status,
                   (l.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh') AS created_at,
                   v.ho_ten, v.username
            ${baseFrom}${whereClause}
            ORDER BY l.created_at DESC, l.id_log DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        const logsResult = await pool.query(query, [...params, limit, offset]);

        return { logs: logsResult.rows, totalRecords, totalPages, currentPage };
    },

    // Ghi log hành động mới vào hệ thống
    async createLog(id_tk, action, status = 'Thành công') {
        await LogModel.insertLog(pool, id_tk, action, status);
    },

    async insertLog(client, id_tk, action, status = 'Thành công') {
        await client.query(
            'INSERT INTO audit_logs (id_tk, action, status, created_at) VALUES ($1, $2, $3, clock_timestamp())',
            [id_tk, action, status]
        );
    },

    // Xóa toàn bộ nhật ký hoạt động và đặt lại bộ đếm ID.
    async clearAllLogs(id_tk) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('TRUNCATE TABLE audit_logs RESTART IDENTITY');
            await LogModel.insertLog(client, id_tk, 'Xóa toàn bộ nhật ký hoạt động', 'Thành công');
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
};

module.exports = LogModel;