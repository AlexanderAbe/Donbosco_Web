const ThiDuaModel = require('../../models/bdh/thi-dua-model');
const { getBdhBaseData } = require('../../utils/base-data-helper');

const ThiDuaController = {
    async getThiDuaPage(req, res) {
        try {
            const academicYears = await ThiDuaModel.getAcademicYears();
            const requestedYearId = req.query.nien_khoa;
            const selectedYearId = requestedYearId || academicYears[0]?.id_cau_hinh_nam_hoc;
            
            const currentMonth = new Date().getMonth() + 1;
            const selectedMonth = parseInt(req.query.thang) || currentMonth;

            let danhSachThiDua = [];
            
            if (selectedYearId) {
                const rawData = await ThiDuaModel.getThiDuaTheoThang(selectedYearId, selectedMonth);
                
                danhSachThiDua = rawData.map(lop => {
                    const slg = parseInt(lop.so_luong_tn) || 0;
                    
                    // Tính Tỉ lệ %
                    // Điểm tối đa KL, CC = sĩ số * 10
                    // Điểm tối đa A (Sớm Chúa Nhật) = sĩ số * 4 (Giả định 4 Chúa Nhật/tháng)
                    let ti_le_kl = 0;
                    let ti_le_cc = 0;
                    let ti_le_a = 0;

                    if (slg > 0) {
                        ti_le_kl = (parseFloat(lop.diem_kl) / (slg * 10)) * 100;
                        ti_le_cc = (parseFloat(lop.diem_cc) / (slg * 10)) * 100;
                        ti_le_a = (parseInt(lop.diem_a) / (slg * 4)) * 100;
                        
                        // Chặn trường hợp > 100% (nếu tháng đó có 5 Chúa Nhật)
                        if (ti_le_kl > 100) ti_le_kl = 100;
                        if (ti_le_cc > 100) ti_le_cc = 100;
                        if (ti_le_a > 100) ti_le_a = 100;
                    }
                    
                    // Tổng tỉ lệ = (KL*2 + CC*3 + A*3) / 8
                    const tongTiLe = ((ti_le_kl * 2) + (ti_le_cc * 3) + (ti_le_a * 3)) / 8;
                    
                    return {
                        ten_lop: lop.ten_lop,
                        so_luong_tn: slg,
                        diem_kl: parseFloat(lop.diem_kl).toFixed(1),
                        ti_le_kl: ti_le_kl.toFixed(2),
                        diem_cc: parseFloat(lop.diem_cc).toFixed(1),
                        ti_le_cc: ti_le_cc.toFixed(2),
                        diem_a: lop.diem_a,
                        ti_le_a: ti_le_a.toFixed(2),
                        tong_ti_le: tongTiLe.toFixed(2)
                    };
                });
            }

            return res.render('bdh/thi-dua', {
                ...getBdhBaseData(req, `Thi Đua Kỷ Luật - Chuyên Cần Tháng ${selectedMonth}`),
                academicYears,
                selectedYearId,
                selectedMonth,
                danhSachThiDua
            });
        } catch (error) {
            console.error('❌ Lỗi tải trang thi đua:', error);
            return res.status(500).send('Đã xảy ra lỗi khi tải trang thi đua.');
        }
    }
};

module.exports = ThiDuaController;