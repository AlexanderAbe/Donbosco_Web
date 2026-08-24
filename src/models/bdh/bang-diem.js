const pool = require('../../../config/database');

const BangDiemModel = {
	async getClassesByYear(yearId) {
		const { rows } = await pool.query(`
			SELECT l.id_lop, l.ten_lop, k.ten_khoi
			FROM LOP_HOC l
			JOIN KHOI k ON k.id_khoi = l.id_khoi
			WHERE l.id_cau_hinh_nam_hoc = $1
			ORDER BY k.stt ASC NULLS LAST, l.ten_lop ASC
		`, [yearId]);
		return rows;
	},

	async hasSummaryByYear(yearId) {
		const { rows } = await pool.query(`
			SELECT EXISTS (
				SELECT 1 FROM TONG_KET_NAM_HOC
				WHERE id_cau_hinh_nam_hoc = $1
			) AS has_summary
		`, [yearId]);
		return rows[0].has_summary;
	},

	async getAcademicYears() {
		const { rows } = await pool.query(`
			SELECT id_cau_hinh_nam_hoc, nien_khoa
			FROM CAU_HINH_NAM_HOC
			ORDER BY nien_khoa DESC
		`);
		return rows;
	},

	async getSummaryByYear(yearId) {
		const { rows } = await pool.query(`
			SELECT
				vw.id_tong_ket_nam_hoc, vw.id_cau_hinh_nam_hoc, vw.nien_khoa,
				vw.mstn, vw.ten_thanh, vw.ho_va_ten_lot, vw.ten,
				vw.id_lop, vw.ten_lop, l.id_khoi, vw.ten_khoi,
				vw.diem_hoc_tap, vw.diem_chuyen_can, vw.diem_ky_luat, vw.diem_tong,
				vw.ten_xep_loai, vw.tinh_trang, vw.trang_thai_tn
			FROM vw_tong_ket_chi_tiet vw
			JOIN LOP_HOC l ON l.id_lop = vw.id_lop
			JOIN KHOI k ON k.id_khoi = l.id_khoi
			WHERE vw.id_cau_hinh_nam_hoc = $1
			ORDER BY k.stt ASC NULLS LAST, vw.ten_lop ASC,
				vw.ten ASC, vw.ho_va_ten_lot ASC, vw.ten_thanh ASC
		`, [yearId]);
		return rows;
	}
};

module.exports = BangDiemModel;
