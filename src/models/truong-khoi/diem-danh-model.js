const pool = require('../../../config/database');

const DiemDanhModel = {
	async getPageData(idTruongKhoi, yearId) {
		const { rows } = await pool.query(`
			SELECT dd.id_diem_danh, dd.id_lop, dd.ngay_diem_danh, dd.loai_buoi,
				   dd.trang_thai, tn.mstn, tn.ten_thanh, tn.ho_va_ten_lot, tn.ten,
				   l.ten_lop, k.ten_khoi
			FROM DIEM_DANH dd
			JOIN THIEU_NHI tn ON tn.id_tn = dd.id_tn
			JOIN LOP_HOC l ON l.id_lop = dd.id_lop
			JOIN KHOI k ON k.id_khoi = l.id_khoi
			JOIN PHAN_LOP pl ON pl.id_tn = dd.id_tn
				AND pl.id_lop = dd.id_lop
				AND pl.id_cau_hinh_nam_hoc = $2
			WHERE dd.id_lop IN (
				SELECT l2.id_lop
				FROM PHAN_CONG_TRUONG_KHOI tk
				JOIN LOP_HOC l2 ON l2.id_khoi = tk.id_khoi
					AND l2.id_cau_hinh_nam_hoc = tk.id_cau_hinh_nam_hoc
				WHERE tk.id_glv = $1 AND tk.id_cau_hinh_nam_hoc = $2
			)
			ORDER BY dd.ngay_diem_danh DESC, dd.loai_buoi, k.stt, l.ten_lop, tn.ten
		`, [idTruongKhoi, yearId]);
		return rows;
	}
};

module.exports = DiemDanhModel;
