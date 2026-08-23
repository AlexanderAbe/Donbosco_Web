const pool = require('../../../config/database');

const LogModel = {
    // Lấy danh sách logs gần đây cho Dashboard (giữ nguyên để không ảnh hưởng trang chủ)
    async getRecentLogs(limit = 5) {
        try {
            const query = `
                SELECT l.id_log, l.action, l.status, 
                       (l.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh') AS created_at, 
                       v.ho_ten, v.username 
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

    // Phân trang và lọc theo ngày/người thực hiện, GIỚI HẠN TỐI ĐA 500 BẢN GHI MỚI NHẤT
    async getLogsWithPagination(page = 1, limit = 20, fromDate = null, toDate = null, search = null) {
        try {
            const offset = (page - 1) * limit;

            // Xây dựng phần FROM và JOIN chung (Không cắt cụt bằng LIMIT 500 nữa)
            let baseFrom = `
                FROM audit_logs l
                LEFT JOIN vw_tai_khoan_glv v ON l.id_tk = v.id_tk WHERE 1=1`;

            let query = `SELECT l.id_log, l.action, l.status, (l.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh') AS created_at, v.ho_ten, v.username ${baseFrom}`;
            let countQuery = `SELECT COUNT(*) ${baseFrom}`;
            let params = [];
            let paramIndex = 1;

            // Thêm điều kiện lọc theo ngày bắt đầu (From)
            if (fromDate) {
                query += ` AND (l.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')::date >= $${paramIndex}`;
                countQuery += ` AND (l.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')::date >= $${paramIndex}`;
                params.push(fromDate);
                paramIndex++;
            }

            // Thêm điều kiện lọc theo ngày kết thúc (To)
            if (toDate) {
                query += ` AND (l.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')::date <= $${paramIndex}`;
                countQuery += ` AND (l.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')::date <= $${paramIndex}`;
                params.push(toDate);
                paramIndex++;
            }

            // Tìm theo họ tên hoặc số điện thoại của người thực hiện
            if (search) {
                query += ` AND (v.ho_ten ILIKE $${paramIndex} OR v.sdt ILIKE $${paramIndex})`;
                countQuery += ` AND (v.ho_ten ILIKE $${paramIndex} OR v.sdt ILIKE $${paramIndex})`;
                params.push(`%${search}%`);
                paramIndex++;
            }

            // Sắp xếp mới nhất lên đầu, áp dụng LIMIT và OFFSET cho trang hiện tại
            query += ` ORDER BY l.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;

            // Thực thi song song truy vấn lấy dữ liệu và đếm tổng số bản ghi
            const [logsResult, countResult] = await Promise.all([
                pool.query(query, [...params, limit, offset]),
                pool.query(countQuery, params)
            ]);

            const totalRecords = parseInt(countResult.rows[0].count);

            return {
                logs: logsResult.rows,
                totalRecords,
                totalPages: Math.ceil(totalRecords / limit) || 1
            };
        } catch (error) {
            console.error('❌ Lỗi lấy logs phân trang & lọc:', error);
            return { logs: [], totalRecords: 0, totalPages: 1 };
        }
    },

    // Ghi log hành động mới vào hệ thống
    async createLog(id_tk, action, status = 'Thành công') {
        try {
            const query = `INSERT INTO audit_logs (id_tk, action, status, created_at) VALUES ($1, $2, $3, NOW())`;
            await pool.query(query, [id_tk, action, status]);
        } catch (error) {
            console.error('Lỗi ghi log:', error);
        }
    }
};

module.exports = LogModel;