const pool = require('../../../config/database');

const SettingModel = {
    // 1. Lấy danh sách khung xếp loại (JOIN với bảng cấu hình năm học để lấy tên niên khóa)
    async getAllRankings() {
        try {
            const query = `
                SELECT k.*, c.nien_khoa, c.ngay_tao
                FROM KHUNG_XEP_LOAI k
                JOIN CAU_HINH_NAM_HOC c ON k.id_cau_hinh_nam_hoc = c.id_cau_hinh_nam_hoc
                ORDER BY c.nien_khoa DESC, k.min DESC
            `;
            const { rows } = await pool.query(query);
            return rows;
        } catch (error) {
            console.error('❌ Lỗi lấy danh sách khung xếp loại:', error);
            return [];
        }
    },

    // 2. Lấy danh sách niên khóa để đổ vào thẻ <select> (lấy cả ID và tên niên khóa)
    async getAvailableAcademicYears() {
        try {
            const { rows } = await pool.query(
                'SELECT id_cau_hinh_nam_hoc, nien_khoa FROM CAU_HINH_NAM_HOC ORDER BY nien_khoa DESC'
            );
            return rows;
        } catch (error) {
            console.error('❌ Lỗi lấy danh sách niên khóa:', error);
            return [];
        }
    },

    // 3. Thêm mới khung xếp loại (lưu id_cau_hinh_nam_hoc, min, max dưới dạng số thực)
    async createRanking(data) {
        try {
            const { ten_xep_loai, min, max, id_cau_hinh_nam_hoc } = data;
            const query = `
                INSERT INTO KHUNG_XEP_LOAI (ten_xep_loai, min, max, id_cau_hinh_nam_hoc) 
                VALUES ($1, $2, $3, $4)
                RETURNING *;
            `;
            const values = [
                ten_xep_loai, 
                parseFloat(min), 
                parseFloat(max), 
                parseInt(id_cau_hinh_nam_hoc)
            ];
            const { rows } = await pool.query(query, values);
            return rows[0];
        } catch (error) {
            console.error('❌ Lỗi thêm khung xếp loại:', error);
            throw error;
        }
    },

    async updateRankingById(id_khung_xep_loai, data) {
    try {
        const { min, max } = data;
        const query = `
            UPDATE KHUNG_XEP_LOAI 
            SET min = $1, max = $2 
            WHERE id_khung_xep_loai = $3
            RETURNING *;
        `;
        const { rows } = await pool.query(query, [min, max, id_khung_xep_loai]);
        return rows[0];
    } catch (error) {
        console.error('❌ Lỗi cập nhật khung xếp loại:', error);
        throw error;
    }
}
};

module.exports = SettingModel;