const LopModel = require('../../models/bdh/lop-model');
const { getBdhBaseData } = require('../../utils/base-data-helper');
const { logAction } = require('../../utils/logger');

const getSelectedYearId = (value, years) => {
    const requestedId = Number.parseInt(value, 10);
    if (years.some(year => year.id_cau_hinh_nam_hoc === requestedId)) {
        return requestedId;
    }
    return years[0]?.id_cau_hinh_nam_hoc || null;
};

const redirectWithMessage = (res, message, yearId) => {
    const params = new URLSearchParams();
    if (yearId) params.set('nien_khoa', yearId);
    if (message) params.set('error', message);
    res.redirect(`/bdh/lop?${params.toString()}`);
};

const validateInput = (body) => {
    const tenLop = String(body.ten_lop || '').trim();
    const idKhoi = Number.parseInt(body.id_khoi, 10);
    const idCauHinhNamHoc = Number.parseInt(body.id_cau_hinh_nam_hoc, 10);

    if (!tenLop || tenLop.length > 50 || !Number.isInteger(idKhoi) || !Number.isInteger(idCauHinhNamHoc)) {
        return null;
    }

    return { tenLop, idKhoi, idCauHinhNamHoc };
};

const LopController = {
    async getTrangQuanLy(req, res) {
        try {
            const years = await LopModel.getAcademicYears();
            const selectedYearId = getSelectedYearId(req.query.nien_khoa, years);
            const [lopList, khoiList] = selectedYearId
                ? await Promise.all([
                    LopModel.getByAcademicYear(selectedYearId),
                    LopModel.getActiveKhoi()
                ])
                : [[], await LopModel.getActiveKhoi()];

            res.render('bdh/lop', {
                ...getBdhBaseData(req, 'Quản Lý Lớp Học'),
                years,
                selectedYearId,
                lopList,
                khoiList,
                error: req.query.error || null
            });
        } catch (error) {
            console.error('Lỗi tải trang quản lý lớp:', error);
            res.status(500).send('Lỗi server khi tải trang quản lý lớp.');
        }
    },

    async postCreate(req, res) {
        const input = validateInput(req.body);
        const targetYearId = req.body.id_cau_hinh_nam_hoc;

        if (!input) {
            await logAction(req, `Thêm lớp học mới thất bại: Thông tin lớp không hợp lệ`, 'Thất bại');
            return redirectWithMessage(res, 'Thông tin lớp không hợp lệ.', targetYearId);
        }

        try {
            await LopModel.create(input.tenLop, input.idKhoi, input.idCauHinhNamHoc);
            
            await logAction(req, `Thêm lớp học mới thành công (${input.tenLop})`, 'Thành công');
            res.redirect(`/bdh/lop?nien_khoa=${input.idCauHinhNamHoc}`);
        } catch (error) {
            console.error('Lỗi thêm lớp:', error);
            const message = error.code === '23505'
                ? 'Tên lớp đã tồn tại trong niên khóa này.'
                : 'Không thể thêm lớp. Vui lòng thử lại.';
            
            await logAction(req, `Thêm lớp học mới thất bại (${input.tenLop}): ${message}`, 'Thất bại');
            redirectWithMessage(res, message, input.idCauHinhNamHoc);
        }
    },

    async postUpdate(req, res) {
        const input = validateInput(req.body);
        const idLop = Number.parseInt(req.body.id_lop, 10);
        const targetYearId = req.body.id_cau_hinh_nam_hoc;

        if (!input || !Number.isInteger(idLop)) {
            await logAction(req, `Cập nhật thông tin lớp học (ID: ${req.body.id_lop}) thất bại: Thông tin không hợp lệ`, 'Thất bại');
            return redirectWithMessage(res, 'Thông tin lớp không hợp lệ.', targetYearId);
        }

        try {
            const updated = await LopModel.update(idLop, input.tenLop, input.idKhoi, input.idCauHinhNamHoc);
            if (!updated) {
                await logAction(req, `Cập nhật thông tin lớp học (ID: ${idLop}) thất bại: Không tìm thấy lớp`, 'Thất bại');
                return redirectWithMessage(res, 'Không tìm thấy lớp cần cập nhật.', input.idCauHinhNamHoc);
            }
            
            await logAction(req, `Cập nhật thông tin lớp học thành công (ID: ${idLop} -> ${input.tenLop})`, 'Thành công');
            res.redirect(`/bdh/lop?nien_khoa=${input.idCauHinhNamHoc}`);
        } catch (error) {
            console.error('Lỗi cập nhật lớp:', error);
            const message = error.code === '23505'
                ? 'Tên lớp đã tồn tại trong niên khóa này.'
                : 'Không thể cập nhật lớp. Vui lòng thử lại.';
            
            await logAction(req, `Cập nhật thông tin lớp học (ID: ${idLop}) thất bại: ${message}`, 'Thất bại');
            redirectWithMessage(res, message, input.idCauHinhNamHoc);
        }
    }
};

module.exports = LopController;