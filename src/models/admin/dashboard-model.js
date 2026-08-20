const pool = require('../../../config/database');

const DashboardModel = {
    async getDashboardStats() {
        try {
            const [userCount, thieuNhiCount, lopCount] = await Promise.all([
                pool.query('SELECT COUNT(*) FROM TAI_KHOAN'),
                pool.query('SELECT COUNT(*) FROM THIEU_NHI'),
                pool.query('SELECT COUNT(*) FROM LOP_HOC')
            ]);

            return {
                totalUsers: parseInt(userCount.rows[0].count) || 0,
                totalThieuNhi: parseInt(thieuNhiCount.rows[0].count) || 0,
                totalLop: parseInt(lopCount.rows[0].count) || 0
            };
        } catch (error) {
            console.error('❌ Lỗi lấy thống kê dashboard:', error);
            return { totalUsers: 0, totalThieuNhi: 0, totalLop: 0 };
        }
    }
};

module.exports = DashboardModel;