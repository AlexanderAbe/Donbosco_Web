const SettingModel = require('../../models/admin/settings-model');
const { getBaseData } = require('../../utils/admin-helper');
const { logAction } = require('../../utils/logger'); // Import helper ghi log

/**
 * Hàm phụ trợ gom nhóm danh sách xếp loại theo niên khóa
 */
const groupRankings = (rankings) => {
    const grouped = {};
    rankings.forEach(r => {
        const key = r.nien_khoa;
        if (!grouped[key]) {
            grouped[key] = {
                nien_khoa: r.nien_khoa,
                id_cau_hinh_nam_hoc: r.id_cau_hinh_nam_hoc, // Lưu lại ID niên khóa của nhóm này
                ngay_tao: r.ngay_tao,
                details: []
            };
        }
        grouped[key].details.push({
            id_khung_xep_loai: r.id_khung_xep_loai, // Tên chính xác theo DB của bạn
            ten_xep_loai: r.ten_xep_loai,
            min: r.min,
            max: r.max
        });
    });
    return Object.values(grouped);
};

// Hiển thị trang cài đặt khung xếp loại
exports.getSettingsPage = async (req, res) => {
    try {
        const rawRankings = await SettingModel.getAllRankings();
        const rankings = groupRankings(rawRankings); // Gom nhóm dữ liệu
        const academicYears = await SettingModel.getAvailableAcademicYears();

        res.render('admin/settings', {
            ...getBaseData(req, 'Khung xếp loại'),
            rankings,
            academicYears
        });
    } catch (error) {
        console.error('❌ Lỗi tải trang cài đặt:', error);
        res.status(500).send('Lỗi máy chủ');
    }
};

// Xử lý lưu khung xếp loại mới
exports.saveSettingsConfig = async (req, res) => {
    const { ten_xep_loai, min, max, id_cau_hinh_nam_hoc } = req.body;

    try {
        await SettingModel.createRanking({
            ten_xep_loai,
            min,
            max,
            id_cau_hinh_nam_hoc
        });

        // --- GHI AUDIT LOG: Thành công ---
        await logAction(req, `Thêm mới khung xếp loại "${ten_xep_loai}"`, 'Thành công');

        const rawRankings = await SettingModel.getAllRankings();
        const rankings = groupRankings(rawRankings); // Gom nhóm dữ liệu
        const academicYears = await SettingModel.getAvailableAcademicYears();

        return res.render('admin/settings', {
            ...getBaseData(req, 'Khung xếp loại'),
            rankings,
            academicYears,
            success: `Đã lưu thành công khung xếp loại "${ten_xep_loai}"!`
        });

    } catch (error) {
        console.error('❌ Lỗi lưu khung xếp loại:', error);

        // --- GHI AUDIT LOG: Thất bại ---
        await logAction(req, `Thêm mới khung xếp loại "${ten_xep_loai || 'Không rõ'}" thất bại`, 'Thất bại');
        
        const rawRankings = await SettingModel.getAllRankings();
        const rankings = groupRankings(rawRankings); // Gom nhóm cả ở nhánh bắt lỗi
        const academicYears = await SettingModel.getAvailableAcademicYears();
        let errorMsg = "Đã xảy ra lỗi khi lưu dữ liệu!";

        if (error.message.includes("trùng") || error.code === '23505') {
            errorMsg = "Khung xếp loại này đã tồn tại trong niên khóa!";
        } else if (error.message.includes("enum") || error.code === '22P02') {
            errorMsg = "Giá trị xếp loại không hợp lệ!";
        }

        return res.render('admin/settings', {
            ...getBaseData(req, 'Khung xếp loại'),
            rankings,
            academicYears,
            error: errorMsg
        });
    }
};

// Xử lý cập nhật khung xếp loại theo năm
exports.updateYearConfig = async (req, res) => {
    const { id_cau_hinh_nam_hoc, rankings } = req.body;

    try {
        // rankings sẽ có dạng: { '1': { id: '1', min: '8.0', max: '10.0' }, '2': { ... } }
        if (rankings) {
            // Duyệt qua từng mức xếp loại để cập nhật vào Database
            for (const key of Object.keys(rankings)) {
                const item = rankings[key];
                await SettingModel.updateRankingById(item.id, {
                    min: parseFloat(item.min),
                    max: parseFloat(item.max)
                });
            }
        }

        // --- GHI AUDIT LOG: Thành công ---
        await logAction(req, `Cập nhật chi tiết khung xếp loại (ID Cấu hình: ${id_cau_hinh_nam_hoc || 'N/A'})`, 'Thành công');

        // Tải lại dữ liệu sau khi cập nhật thành công
        const rawRankings = await SettingModel.getAllRankings();
        const updatedRankings = groupRankings(rawRankings);
        const academicYears = await SettingModel.getAvailableAcademicYears();

        return res.render('admin/settings', {
            ...getBaseData(req, 'Khung xếp loại'),
            rankings: updatedRankings,
            academicYears,
            success: "Cập nhật khung xếp loại thành công!"
        });

    } catch (error) {
        console.error('❌ Lỗi cập nhật khung xếp loại theo năm:', error);

        // --- GHI AUDIT LOG: Thất bại ---
        await logAction(req, `Cập nhật chi tiết khung xếp loại thất bại (ID Cấu hình: ${id_cau_hinh_nam_hoc || 'N/A'})`, 'Thất bại');

        const rawRankings = await SettingModel.getAllRankings();
        const rankings = groupRankings(rawRankings);
        const academicYears = await SettingModel.getAvailableAcademicYears();

        return res.render('admin/settings', {
            ...getBaseData(req, 'Khung xếp loại'),
            rankings,
            academicYears,
            error: "Đã xảy ra lỗi khi cập nhật khung xếp loại!"
        });
    }
};