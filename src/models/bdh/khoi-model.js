// khoi-model.js
const pool = require('../../../config/database');

const Khoi = {
    // 1. Lấy danh sách khối theo trạng thái is_active (true hoặc false)
    async getByStatus(isActive) {
        const query = `
            SELECT id_khoi, stt, ten_khoi, is_active 
            FROM KHOI 
            WHERE is_active = $1 
            ORDER BY stt ASC
        `;
        const { rows } = await pool.query(query, [isActive]);
        return rows;
    },

    // 2. Thêm mới khối
    async create(stt, tenKhoi) {
        const query = `
            INSERT INTO KHOI (stt, ten_khoi)
            VALUES ($1, $2)
            RETURNING *
        `;
        const { rows } = await pool.query(query, [stt, tenKhoi]);
        return rows[0];
    },

    // 3. Cập nhật tên khối
    async update(id, tenKhoi) {
        const query = `
            UPDATE KHOI 
            SET ten_khoi = $1 
            WHERE id_khoi = $2 
            RETURNING *
        `;
        const { rows } = await pool.query(query, [tenKhoi, id]);
        return rows[0];
    },

    // 4. Bật/Tắt trạng thái (Chuyển qua lại giữa hoạt động và không hoạt động)
    async toggleActive(id, isActive) {
        const query = `
            UPDATE KHOI 
            SET is_active = $1 
            WHERE id_khoi = $2 
            RETURNING *
        `;
        const { rows } = await pool.query(query, [isActive, id]);
        return rows[0];
    },

    // 5. Tìm theo ID
    async getById(id) {
        const query = 'SELECT * FROM KHOI WHERE id_khoi = $1';
        const { rows } = await pool.query(query, [id]);
        return rows[0];
    }
};

module.exports = Khoi;