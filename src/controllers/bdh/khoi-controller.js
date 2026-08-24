const Khoi = require('../../models/bdh/khoi-model');
const { getBdhBaseData } = require('../../utils/base-data-helper');
const { logAction } = require('../../utils/logger');

const KhoiController = {
    // 1. Hiển thị trang quản lý khối với 2 bảng (Hoạt động & Tạm ngưng)
    async getTrangQuanLy(req, res) {
        try {
            const activeList = await Khoi.getByStatus(true);
            const inactiveList = await Khoi.getByStatus(false);
            
            // Kết hợp 2 danh sách lại để tính toán STT lớn nhất hiện có
            const allItems = [...activeList, ...inactiveList];
            let maxStt = 0;
            if (allItems && allItems.length > 0) {
                maxStt = Math.max(...allItems.map(item => Number(item.stt) || 0));
            }
            const nextStt = maxStt + 1; // STT tiếp theo tự động tăng

            // Sử dụng helper từ utils để truyền title và layout chuẩn của BDH
            const baseData = getBdhBaseData(req, 'Quản Lý Khối (Ngành)');

            res.render('bdh/khoi', { 
                ...baseData, 
                activeList, 
                inactiveList,
                nextStt // Truyền biến này ra giao diện EJS
            });
        } catch (error) {
            console.error(error);
            res.status(500).send("Lỗi server khi tải trang quản lý khối.");
        }
    },

    // 2. Xử lý Thêm mới
    async postCreate(req, res) {
        const { stt, ten_khoi } = req.body;
        try {
            await Khoi.create(stt, ten_khoi);
            
            await logAction(req, `Thêm khối mới thành công (${ten_khoi})`, 'Thành công');
            res.redirect('/bdh/khoi');
        } catch (error) {
            console.error(error);
            await logAction(req, `Thêm khối mới thất bại (${ten_khoi})`, 'Thất bại');
            res.status(500).send("Lỗi khi thêm khối.");
        }
    },

    // 3. Xử lý Cập nhật (Chỉ sửa tên khối, giữ nguyên STT)
    async postUpdate(req, res) {
        const { id, ten_khoi } = req.body;
        try {
            await Khoi.update(id, ten_khoi);
            
            await logAction(req, `Cập nhật tên khối thành công (ID: ${id} -> ${ten_khoi})`, 'Thành công');
            res.redirect('/bdh/khoi');
        } catch (error) {
            console.error(error);
            await logAction(req, `Cập nhật tên khối thất bại (ID: ${id})`, 'Thất bại');
            res.status(500).send("Lỗi khi cập nhật tên khối.");
        }
    },

    // 4. Xử lý Đổi trạng thái (Bật <-> Tắt)
    async postToggle(req, res) {
        const { id, is_active } = req.body;
        try {
            await Khoi.toggleActive(id, is_active);
            
            const statusText = String(is_active) === 'true' || is_active === true ? 'Kích hoạt' : 'Tạm ngưng';
            await logAction(req, `Thay đổi trạng thái khối thành công (ID: ${id} sang ${statusText})`, 'Thành công');
            res.redirect('/bdh/khoi');
        } catch (error) {
            console.error(error);
            await logAction(req, `Thay đổi trạng thái khối thất bại (ID: ${id})`, 'Thất bại');
            res.status(500).send("Lỗi khi thay đổi trạng thái khối.");
        }
    }
};

module.exports = KhoiController;