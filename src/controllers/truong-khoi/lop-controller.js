const { getTruongKhoiBaseData } = require('../../utils/base-data-helper');
const LopModel = require('../../models/truong-khoi/lop-model');
const { logAction } = require('../../utils/logger');
const { getCurrentYear } = require('../../utils/current-year-helper');

const TruongKhoiLopController = {
    async getLop(req, res) {
        try {
            const years = await LopModel.getAcademicYears(req.session.user.id_glv);
            const { selectedYearId } = getCurrentYear(years, req.session);
            const classes = selectedYearId
                ? await LopModel.getClasses(req.session.user.id_glv, selectedYearId) : [];
            return res.render('truong-khoi/lop', {
                ...getTruongKhoiBaseData(req, 'Quản lý lớp học'),
                title: 'Quản lý lớp học', years, selectedYearId, classes,
                error: req.query.error || null
            });
        } catch (error) {
            console.error('Lỗi tải trang lớp:', error);
            return res.status(500).send('Lỗi server khi tải trang lớp.');
        }
    },

    async createStudent(req, res) {
        const yearId = Number.parseInt(req.body.yearId, 10);
        const parents = Array.isArray(req.body.parents) ? req.body.parents : [];
        const sacraments = Array.isArray(req.body.sacraments) ? req.body.sacraments : [];
        const validRelations = ['Cha', 'Mẹ', 'Ông', 'Bà', 'Cô', 'Chú', 'Bác', 'Người giám hộ'];
        const validSacraments = ['Rửa tội', 'Xưng tội & Rước lễ', 'Thêm sức'];
        const validParents = parents.filter(parent => parent && parent.ten_ph && parent.sdt);
        const validSacramentRows = sacraments.filter(item => item && item.loai_bi_tich && item.ngay_lanh_nhan);
        const hasIncompleteParent = parents.some(parent => {
            const hasValue = parent && (parent.ten_thanh_ph || parent.ten_ph || parent.sdt);
            return hasValue && (!parent.ten_ph || !parent.sdt);
        });
        const hasIncompleteSacrament = sacraments.some(item => item && Boolean(item.loai_bi_tich) !== Boolean(item.ngay_lanh_nhan));

        if (!yearId || !req.body.id_lop || !req.body.ten || !req.body.gioi_tinh || !req.body.ngay_sinh || !validParents.length || hasIncompleteParent || hasIncompleteSacrament) {
            await logAction(req, 'Thêm thiếu nhi thất bại: Thiếu thông tin bắt buộc', 'Thất bại');
            return res.status(400).json({ error: 'Vui lòng nhập đủ thông tin thiếu nhi và ít nhất một phụ huynh.' });
        }
        if (!['Nam', 'Nữ'].includes(req.body.gioi_tinh) || validParents.some(parent => !validRelations.includes(parent.moi_quan_he)) || validParents.some(parent => !/^\d{9,15}$/.test(parent.sdt))) {
            await logAction(req, 'Thêm thiếu nhi thất bại: Thông tin không hợp lệ', 'Thất bại');
            return res.status(400).json({ error: 'Thông tin giới tính, mối quan hệ hoặc số điện thoại không hợp lệ.' });
        }
        if (new Date(`${req.body.ngay_sinh}T00:00:00Z`) > new Date() || validSacramentRows.some(item => new Date(`${item.ngay_lanh_nhan}T00:00:00Z`) > new Date())) {
            await logAction(req, 'Thêm thiếu nhi thất bại: Ngày không hợp lệ', 'Thất bại');
            return res.status(400).json({ error: 'Ngày sinh hoặc ngày lãnh nhận bí tích không được ở tương lai.' });
        }
        if (validSacramentRows.some(item => !validSacraments.includes(item.loai_bi_tich))) {
            await logAction(req, 'Thêm thiếu nhi thất bại: Loại bí tích không hợp lệ', 'Thất bại');
            return res.status(400).json({ error: 'Loại bí tích không hợp lệ.' });
        }
        try {
            const created = await LopModel.createStudent(req.session.user.id_glv, yearId, {
                ...req.body, parents: validParents, sacraments: validSacramentRows
            });
            await logAction(req, `Thêm thiếu nhi thành công (ID: ${created.id_tn}, Lớp ID: ${req.body.id_lop}, Niên khóa ID: ${yearId})`, 'Thành công');
            return res.json({ success: true });
        } catch (error) {
            console.error('Lỗi thêm thiếu nhi Trưởng Khối:', error);
            await logAction(req, `Thêm thiếu nhi thất bại (Lớp ID: ${req.body.id_lop}, Niên khóa ID: ${yearId}): ${error.message}`, 'Thất bại');
            return res.status(400).json({ error: error.message || 'Không thể thêm thiếu nhi.' });
        }
    },

    async getStudentDetail(req, res) {
        try {
            const detail = await LopModel.getStudentDetail(req.session.user.id_glv, Number.parseInt(req.params.id, 10), Number.parseInt(req.query.nien_khoa, 10));
            if (!detail) return res.status(404).json({ error: 'Không tìm thấy thiếu nhi trong khối được phân công.' });
            return res.json(detail);
        } catch (error) {
            console.error('Lỗi lấy chi tiết thiếu nhi Trưởng Khối:', error);
            return res.status(500).json({ error: 'Không thể tải thông tin thiếu nhi.' });
        }
    },

    async updateStudentStatus(req, res) {
        try {
            const result = await LopModel.updateStatus(req.session.user.id_glv, Number.parseInt(req.params.id, 10), Number.parseInt(req.body.yearId, 10), req.body.trang_thai);
            await logAction(req, `Đổi trạng thái thiếu nhi thành công (Thiếu nhi ID: ${req.params.id}, Trạng thái: ${req.body.trang_thai}, Niên khóa ID: ${req.body.yearId})`, 'Thành công');
            return res.json({ success: true, ...result });
        } catch (error) {
            console.error('Lỗi cập nhật trạng thái thiếu nhi Trưởng Khối:', error);
            await logAction(req, `Đổi trạng thái thiếu nhi thất bại (Thiếu nhi ID: ${req.params.id}): ${error.message}`, 'Thất bại');
            return res.status(400).json({ error: error.message });
        }
    },

    async transferStudent(req, res) {
        try {
            const result = await LopModel.transferStudent(req.session.user.id_glv, Number.parseInt(req.params.id, 10), Number.parseInt(req.body.yearId, 10), Number.parseInt(req.body.targetClassId, 10));
            await logAction(req, `Chuyển lớp thiếu nhi thành công (Thiếu nhi ID: ${req.params.id}, Lớp mới ID: ${req.body.targetClassId}, Niên khóa ID: ${req.body.yearId})`, 'Thành công');
            return res.json({ success: true, ...result });
        } catch (error) {
            console.error('Lỗi chuyển lớp thiếu nhi Trưởng Khối:', error);
            await logAction(req, `Chuyển lớp thiếu nhi thất bại (Thiếu nhi ID: ${req.params.id}): ${error.message}`, 'Thất bại');
            return res.status(400).json({ error: error.message });
        }
    }
};

module.exports = TruongKhoiLopController;
