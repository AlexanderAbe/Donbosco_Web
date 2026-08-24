const BaseGlvModel = require('../../models/glv/base-glv-model');
const BangDiemModel = require('../../models/glv/bang-diem-model');
const { logAction } = require('../../utils/logger');
const { getCurrentYear } = require('../../utils/current-year-helper');

const getId = value => {
    const id = Number.parseInt(value, 10);
    return Number.isInteger(id) && id > 0 ? id : null;
};

const BangDiemController = {
    async getBangDiem(req, res) {
        try {
            const idGlv = req.session.user.id_glv;
            const years = await BaseGlvModel.getAcademicYears(idGlv);
            const { selectedYearId } = getCurrentYear(years, req.session);
            const scores = selectedYearId
                ? await BangDiemModel.getRealtimeScores(idGlv, selectedYearId)
                : [];

            return res.render('glv/bang-diem', {
                title: 'Bảng điểm thiếu nhi',
                selectedYearId,
                scores
            });
        } catch (error) {
            console.error('Lỗi tải bảng điểm GLV:', error);
            return res.status(500).send('Lỗi server khi tải bảng điểm.');
        }
    },

    async updateResult(req, res) {
        const idGlv = req.session.user?.id_glv;
        const idTn = getId(req.params.id);
        const yearId = getId(req.body.yearId);
        const result = req.body.ket_qua;

        if (!idTn || !yearId) {
            await logAction(req, `Cập nhật kết quả tổng kết thất bại: Thông tin học sinh hoặc niên khóa không hợp lệ (ID TN: ${req.params.id})`, 'Thất bại');
            return res.status(400).json({ error: 'Thông tin học sinh không hợp lệ.' });
        }

        try {
            const updated = await BangDiemModel.updateResult(
                idGlv,
                idTn,
                yearId,
                result
            );

            await logAction(req, `Cập nhật kết quả tổng kết thành công cho Thiếu nhi ID: ${idTn} (Niên khóa ID: ${yearId}, Kết quả: ${result})`, 'Thành công');
            return res.json({ success: true, ...updated });
        } catch (error) {
            console.error('Lỗi cập nhật kết quả tổng kết GLV:', error);
            const status = error.code === 'FORBIDDEN' ? 403 : 400;
            const errMessage = error.message || 'Không thể cập nhật kết quả.';

            await logAction(req, `Cập nhật kết quả tổng kết thất bại cho Thiếu nhi ID: ${idTn}: ${errMessage}`, 'Thất bại');
            return res.status(status).json({ error: errMessage });
        }
    }
};

module.exports = BangDiemController;