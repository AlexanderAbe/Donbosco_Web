const PhanCongModel = require('../../models/bdh/phan-cong-model');
const { getBdhBaseData } = require('../../utils/base-data-helper');

const getYearId = (value, years) => {
    const id = Number.parseInt(value, 10);
    return years.some(year => year.id_cau_hinh_nam_hoc === id) ? id : years[0]?.id_cau_hinh_nam_hoc || null;
};

const parseId = value => Number.parseInt(value, 10);

const parseIdList = value => {
    const values = Array.isArray(value) ? value : [value];
    return values.map(parseId).filter(Number.isInteger);
};

const redirect = (res, yearId, message, isError = false) => {
    const params = new URLSearchParams();
    if (yearId) params.set('nien_khoa', yearId);
    if (message) params.set(isError ? 'error' : 'message', message);
    res.redirect(`/bdh/phan-cong?${params.toString()}`);
};

const PhanCongController = {
    async getTrangQuanLy(req, res) {
        try {
            const years = await PhanCongModel.getAcademicYears();
            const selectedYearId = getYearId(req.query.nien_khoa, years);
            const data = selectedYearId
                ? await PhanCongModel.getPageData(selectedYearId)
                : { classes: [], glvList: [], classAssignments: [], truongKhoiList: [] };

            res.render('bdh/phan-cong', {
                ...getBdhBaseData(req, 'Phân Công Nhân Sự'),
                years,
                selectedYearId,
                ...data,
                message: req.query.message || null,
                error: req.query.error || null
            });
        } catch (error) {
            console.error('Lỗi tải trang phân công:', error);
            res.status(500).send('Lỗi server khi tải trang phân công.');
        }
    },

    async postAssignGlv(req, res) {
        const yearId = parseId(req.body.id_cau_hinh_nam_hoc);
        try {
            await PhanCongModel.assignGlv(parseId(req.body.id_glv), parseId(req.body.id_lop), yearId);
            redirect(res, yearId, 'Đã phân công GLV vào lớp.');
        } catch (error) {
            console.error('Lỗi phân công GLV:', error);
            const message = error.code === '23505'
                ? 'GLV này đã được phân công vào lớp trong niên khóa này.'
                : error.message || 'Không thể phân công GLV.';
            redirect(res, yearId, message, true);
        }
    },

    async postAssignGlvBulk(req, res) {
        const yearId = parseId(req.body.id_cau_hinh_nam_hoc);
        const idLop = parseId(req.body.id_lop);
        const idGlvList = parseIdList(req.body.id_glv);
        if (!Number.isInteger(yearId) || !Number.isInteger(idLop) || !idGlvList.length) {
            return redirect(res, yearId, 'Vui lòng chọn lớp và ít nhất một GLV.', true);
        }

        try {
            const assignedCount = await PhanCongModel.assignGlvBulk(idGlvList, idLop, yearId);
            redirect(res, yearId, assignedCount
                ? `Đã phân công ${assignedCount} GLV vào lớp.`
                : 'Các GLV đã chọn đều đã được phân công vào lớp này.');
        } catch (error) {
            console.error('Lỗi phân công GLV hàng loạt:', error);
            redirect(res, yearId, 'Không thể phân công GLV hàng loạt.', true);
        }
    },

    async postRemoveGlv(req, res) {
        const yearId = parseId(req.body.id_cau_hinh_nam_hoc);
        try {
            await PhanCongModel.removeGlv(parseId(req.body.id_phan_cong_glv), yearId);
            redirect(res, yearId, 'Đã gỡ phân công GLV.');
        } catch (error) {
            console.error('Lỗi gỡ phân công GLV:', error);
            redirect(res, yearId, 'Không thể gỡ phân công GLV.', true);
        }
    },

    async postAssignTruongKhoi(req, res) {
        const yearId = parseId(req.body.id_cau_hinh_nam_hoc);
        try {
            await PhanCongModel.assignTruongKhoi(parseId(req.body.id_glv), parseId(req.body.id_khoi), yearId);
            redirect(res, yearId, 'Đã cập nhật Trưởng khối.');
        } catch (error) {
            console.error('Lỗi phân công Trưởng khối:', error);
            redirect(res, yearId, error.message || 'Không thể phân công Trưởng khối.', true);
        }
    },

    async postRemoveTruongKhoi(req, res) {
        const yearId = parseId(req.body.id_cau_hinh_nam_hoc);
        try {
            await PhanCongModel.removeTruongKhoi(parseId(req.body.id_phan_cong_truong), yearId);
            redirect(res, yearId, 'Đã gỡ Trưởng khối.');
        } catch (error) {
            console.error('Lỗi gỡ Trưởng khối:', error);
            redirect(res, yearId, 'Không thể gỡ Trưởng khối.', true);
        }
    }
};

module.exports = PhanCongController;
