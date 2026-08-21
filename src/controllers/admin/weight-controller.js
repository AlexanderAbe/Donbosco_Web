const WeightModel = require('../../models/admin/weight-model');
const { getBaseData } = require('../../utils/admin-helper');
const { logAction } = require('../../utils/logger'); // Import helper ghi log

// Hiển thị trang cấu hình hệ điểm & danh sách lịch sử
exports.getWeightPage = async (req, res) => {
    try {
        const configs = await WeightModel.getAllConfigs();
        res.render('admin/weight', {
            ...getBaseData(req, 'Hệ điểm & Bài kiểm tra'),
            configs
        });
    } catch (error) {
        console.error('❌ Lỗi tải trang cấu hình:', error);
        res.status(500).send('Lỗi máy chủ');
    }
};

// Xử lý lưu cấu hình mới khi submit form
exports.saveWeightConfig = async (req, res) => {
    const { nien_khoa, trong_so_hoc_tap, trong_so_ky_luat, trong_so_diem_chuyen_can, so_luong_bai_ktra } = req.body;

    try {
        await WeightModel.createConfig(
            nien_khoa,
            parseFloat(trong_so_hoc_tap),
            parseFloat(trong_so_ky_luat),
            parseFloat(trong_so_diem_chuyen_can),
            parseInt(so_luong_bai_ktra)
        );

        // --- GHI AUDIT LOG: Thành công ---
        await logAction(req, `Thêm mới cấu hình hệ điểm cho niên khóa "${nien_khoa}"`, 'Thành công');

        // Lấy lại danh sách cấu hình để render trang kèm thông báo thành công
        const configs = await WeightModel.getAllConfigs();
        return res.render('admin/weight', {
            ...getBaseData(req, 'Hệ điểm & Bài kiểm tra'),
            configs,
            success: `Đã lưu thành công niên khóa ${nien_khoa}!`
        });

    } catch (error) {
        console.error('❌ Lỗi lưu cấu hình:', error);

        // --- GHI AUDIT LOG: Thất bại ---
        await logAction(req, `Thêm mới cấu hình hệ điểm cho niên khóa "${nien_khoa || 'Không rõ'}" thất bại`, 'Thất bại');
        
        // Lấy lại danh sách cấu hình để khi render lại trang vẫn hiển thị đúng bảng lịch sử
        const configs = await WeightModel.getAllConfigs();
        let errorMsg = "Đã xảy ra lỗi khi lưu dữ liệu!";

        // Kiểm tra lỗi trùng niên khóa từ Trigger hoặc mã lỗi Unique constraint của PostgreSQL (23505)
        if (error.message.includes("Không được lưu trùng niên khóa") || error.code === '23505') {
            errorMsg = "Không được lưu trùng niên khóa!";
        }

        // Render lại trang kèm thông báo lỗi (Toast đỏ)
        return res.render('admin/weight', {
            ...getBaseData(req, 'Hệ điểm & Bài kiểm tra'),
            configs,
            error: errorMsg
        });
    }
};