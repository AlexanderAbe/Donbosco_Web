const pool = require('../../../config/database');

const KyLuatModel = {
	async getPageData(idTruongKhoi, yearId) {
		const { rows } = await pool.query(`
			SELECT dkl.id_ky_luat, dkl.thang, dkl.diem,
				   tn.mstn, tn.ten_thanh, tn.ho_va_ten_lot, tn.ten,
				   l.ten_lop, k.ten_khoi
			FROM DIEM_KY_LUAT dkl
			JOIN THIEU_NHI tn ON tn.id_tn = dkl.id_tn
			JOIN PHAN_LOP pl ON pl.id_tn = dkl.id_tn
				AND pl.id_cau_hinh_nam_hoc = dkl.id_cau_hinh_nam_hoc
			JOIN LOP_HOC l ON l.id_lop = pl.id_lop
			JOIN KHOI k ON k.id_khoi = l.id_khoi
			WHERE dkl.id_cau_hinh_nam_hoc = $2
			  AND EXISTS (
				  SELECT 1 FROM PHAN_CONG_TRUONG_KHOI tk
				  WHERE tk.id_glv = $1 AND tk.id_khoi = l.id_khoi
					AND tk.id_cau_hinh_nam_hoc = $2
			  )
			ORDER BY k.stt, l.ten_lop, tn.ten, dkl.thang
		`, [idTruongKhoi, yearId]);
		return rows;
	}
};

module.exports = KyLuatModel;
