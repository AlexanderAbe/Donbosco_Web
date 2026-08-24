const BaseGlvModel = require('../../models/glv/base-glv-model');
const DanhSachLopModel = require('../../models/glv/danh-sach-lop-model');
const { logAction } = require('../../utils/logger');
const { getCurrentYear } = require('../../utils/current-year-helper');

const getId = value => {
    const id = Number.parseInt(value, 10);
    return Number.isInteger(id) && id > 0 ? id : null;
};

const DanhSachLopController = {
    async getDanhSachLop(req, res) {
        try {
            const years = await BaseGlvModel.getAcademicYears(req.session.user.id_glv);
            const { selectedYearId: yearId } = getCurrentYear(years, req.session);
            const classes = yearId
                ? await BaseGlvModel.getAssignedClasses(req.session.user.id_glv, yearId)
                : [];

            return res.render('glv/danh-sach-lop', {
                title: 'Danh sách thiếu nhi',
                selectedYearId: yearId,
                classes,
                error: req.query.error || null
            });
        } catch (error) {
            console.error('Lỗi tải danh sách lớp GLV:', error);
            return res.status(500).send('Lỗi server khi tải danh sách lớp.');
        }
    },

    async getStudentDetail(req, res) {
        try {
            const idTn = getId(req.params.id);
            const yearId = getId(req.query.nien_khoa);
            if (!idTn || !yearId) return res.status(400).json({ error: 'Thông tin học sinh không hợp lệ.' });

            const detail = await DanhSachLopModel.getStudentDetail(req.session.user.id_glv, idTn, yearId);
            if (!detail) return res.status(404).json({ error: 'Không tìm thấy học sinh trong lớp được phân công.' });
            return res.json(detail);
        } catch (error) {
            console.error('Lỗi lấy chi tiết học sinh GLV:', error);
            return res.status(500).json({ error: 'Không thể tải thông tin học sinh.' });
        }
    },

    async updateStudent(req, res) {
        const idTn = getId(req.params.id);
        const yearId = getId(req.body.yearId);

        if (!idTn || !yearId) {
            await logAction(req, `Cập nhật thông tin học sinh thất bại: Thông tin học sinh hoặc niên khóa không hợp lệ (ID TN: ${req.params.id})`, 'Thất bại');
            return res.status(400).json({ error: 'Thông tin học sinh không hợp lệ.' });
        }

        try {
            const updated = await DanhSachLopModel.updateStudent(
                req.session.user.id_glv,
                idTn,
                yearId,
                req.body
            );

            await logAction(req, `Cập nhật thông tin học sinh thành công cho Thiếu nhi ID: ${idTn} (Niên khóa ID: ${yearId})`, 'Thành công');
            return res.json({ success: true, ...updated });
        } catch (error) {
            console.error('Lỗi cập nhật học sinh GLV:', error);
            const status = error.code === 'FORBIDDEN' ? 403 : 400;
            const errMessage = error.message || 'Không thể cập nhật thông tin.';

            await logAction(req, `Cập nhật thông tin học sinh thất bại cho Thiếu nhi ID: ${idTn}: ${errMessage}`, 'Thất bại');
            return res.status(status).json({ error: errMessage });
        }
    },

    async updateStudentStatus(req, res) {
        const idTn = getId(req.params.id);
        const yearId = getId(req.body.yearId);
        const trangThai = req.body.trang_thai;

        if (!idTn || !yearId) {
            await logAction(req, `Cập nhật trạng thái học sinh thất bại: Thông tin học sinh hoặc niên khóa không hợp lệ (ID TN: ${req.params.id})`, 'Thất bại');
            return res.status(400).json({ error: 'Thông tin học sinh không hợp lệ.' });
        }

        try {
            const result = await DanhSachLopModel.updateStudentStatus(
                req.session.user.id_glv,
                idTn,
                yearId,
                trangThai
            );

            await logAction(req, `Cập nhật trạng thái học sinh thành công cho Thiếu nhi ID: ${idTn} (Niên khóa ID: ${yearId}, Trạng thái mới: ${trangThai})`, 'Thành công');
            return res.json({ success: true, ...result });
        } catch (error) {
            console.error('Lỗi cập nhật trạng thái học sinh GLV:', error);
            const status = error.code === 'FORBIDDEN' ? 403 : 400;
            const errMessage = error.message || 'Không thể cập nhật trạng thái.';

            await logAction(req, `Cập nhật trạng thái học sinh thất bại cho Thiếu nhi ID: ${idTn}: ${errMessage}`, 'Thất bại');
            return res.status(status).json({ error: errMessage });
        }
    }
};

module.exports = DanhSachLopController;