const pool = require('../../../config/database');

const KiemTraModel = {
	async getPageData(idTruongKhoi, yearId) {
		const { rows } = await pool.query(`
			SELECT dht.id_hoc_tap, dht.stt_bai_ktra, dht.diem_so,
				   tn.mstn, tn.ten_thanh, tn.ho_va_ten_lot, tn.ten,
				   l.ten_lop, k.ten_khoi
			FROM DIEM_HOC_TAP dht
			JOIN THIEU_NHI tn ON tn.id_tn = dht.id_tn
			JOIN PHAN_LOP pl ON pl.id_tn = dht.id_tn
				AND pl.id_cau_hinh_nam_hoc = dht.id_cau_hinh_nam_hoc
			JOIN LOP_HOC l ON l.id_lop = pl.id_lop
			JOIN KHOI k ON k.id_khoi = l.id_khoi
			WHERE dht.id_cau_hinh_nam_hoc = $2
			  AND EXISTS (
				  SELECT 1 FROM PHAN_CONG_TRUONG_KHOI tk
				  WHERE tk.id_glv = $1 AND tk.id_khoi = l.id_khoi
					AND tk.id_cau_hinh_nam_hoc = $2
			  )
			ORDER BY k.stt, l.ten_lop, tn.ten, dht.stt_bai_ktra
		`, [idTruongKhoi, yearId]);
		return rows;
	}
};

module.exports = KiemTraModel;
