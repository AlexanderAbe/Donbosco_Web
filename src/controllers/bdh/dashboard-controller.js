const DashboardModel = require('../../models/bdh/dashboard-model');
const { getBdhBaseData } = require('../../utils/base-data-helper');
const { setCurrentYearId } = require('../../utils/current-year-state');

const DashboardController = {
    async getDashboard(req, res) {
        try {
            const nienKhoaList = await DashboardModel.getDanhSachNienKhoa();
            const requestedYearId = Number.parseInt(req.query.nien_khoa, 10);
            const sessionYearId = Number.parseInt(req.session.current_year_id, 10);
            const selectedYearId = nienKhoaList.some(year => year.id_cau_hinh_nam_hoc === requestedYearId)
                ? requestedYearId
                : nienKhoaList.some(year => year.id_cau_hinh_nam_hoc === sessionYearId)
                    ? sessionYearId
                    : nienKhoaList[0]?.id_cau_hinh_nam_hoc;

            req.session.current_year_id = selectedYearId || null;
            setCurrentYearId(selectedYearId);
            const stats = await DashboardModel.getDashboardStats(selectedYearId);

            // === ĐOẠN XỬ LÝ GỢI Ý: Gộp nhóm Trưởng Khối theo tên khối ===
            if (stats && stats.truongKhoiList) {
                const groupedTruongKhoi = {};
                
                stats.truongKhoiList.forEach(tk => {
                    if (!groupedTruongKhoi[tk.ten_khoi]) {
                        groupedTruongKhoi[tk.ten_khoi] = {
                            ten_khoi: tk.ten_khoi,
                            danh_sach_ns: []
                        };
                    }
                    // Nếu khối có người làm trưởng khối (có tên)
                    if (tk.ten) {
                        groupedTruongKhoi[tk.ten_khoi].danh_sach_ns.push({
                            ho_ten: `${tk.ten_thanh || ''} ${tk.ho_va_ten_lot || ''} ${tk.ten}`.trim(),
                            sdt: tk.sdt || '-'
                        });
                    }
                });

                // Ghi đè lại truongKhoiList thành danh sách đã gom nhóm
                stats.truongKhoiList = Object.values(groupedTruongKhoi);
            }
            // ==========================================================

            res.render('bdh/dashboard', {
                ...getBdhBaseData(req, 'Dashboard Ban Điều Hành'),
                nienKhoaList,
                stats,
                recentLogs: []
            });
        } catch (error) {
            console.error('❌ Lỗi Controller Dashboard BDH:', error);
            res.status(500).send('Đã xảy ra lỗi khi tải trang Dashboard.');
        }
    }
};

module.exports = DashboardController;