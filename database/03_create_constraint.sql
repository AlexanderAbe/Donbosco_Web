ALTER TABLE CAU_HINH_NAM_HOC DROP CONSTRAINT IF EXISTS check_nk_cau_hinh;
ALTER TABLE CAU_HINH_NAM_HOC ADD CONSTRAINT check_nk_cau_hinh CHECK (nien_khoa ~ '^\d{4}-\d{4}$');

ALTER TABLE CAU_HINH_NAM_HOC DROP CONSTRAINT IF EXISTS unique_nien_khoa;
ALTER TABLE CAU_HINH_NAM_HOC ADD CONSTRAINT unique_nien_khoa UNIQUE (nien_khoa);

-- 2. Bảng LOP_HOC
ALTER TABLE LOP_HOC DROP CONSTRAINT IF EXISTS unique_ten_lop_trong_nam;
ALTER TABLE LOP_HOC ADD CONSTRAINT unique_ten_lop_trong_nam UNIQUE (ten_lop, id_cau_hinh_nam_hoc);

-- 3. Bảng PHAN_LOP
ALTER TABLE PHAN_LOP DROP CONSTRAINT IF EXISTS uk_thieu_nhi_nam_hoc;
ALTER TABLE PHAN_LOP ADD CONSTRAINT uk_thieu_nhi_nam_hoc UNIQUE (id_tn, id_cau_hinh_nam_hoc);
ALTER TABLE PHAN_LOP ALTER COLUMN id_lop DROP NOT NULL;

DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_ket_qua') THEN
		CREATE TYPE enum_ket_qua AS ENUM ('Lên lớp', 'Ở lại lớp');
	END IF;
END
$$;

UPDATE TONG_KET_NAM_HOC
SET tinh_trang = 'Lên lớp'
WHERE tinh_trang = 'Đạt';

UPDATE TONG_KET_NAM_HOC
SET tinh_trang = 'Ở lại lớp'
WHERE tinh_trang = 'Chưa đạt';

ALTER TABLE TONG_KET_NAM_HOC
ALTER COLUMN tinh_trang TYPE enum_ket_qua
USING NULLIF(tinh_trang, '')::text::enum_ket_qua;

-- Trạng thái học tập của thiếu nhi theo niên khóa
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_trang_thai_tn') THEN
		CREATE TYPE enum_trang_thai_tn AS ENUM ('Đang học', 'Chuyển xứ', 'Nghỉ học');
	END IF;
END
$$;

ALTER TABLE DIEM_DANH
ADD CONSTRAINT uq_diem_danh_ngay_buoi UNIQUE (ngay_diem_danh, loai_buoi, id_tn);

ALTER TABLE PHAN_LOP
ADD COLUMN IF NOT EXISTS trang_thai enum_trang_thai_tn;

UPDATE PHAN_LOP
SET trang_thai = 'Đang học'
WHERE trang_thai IS NULL;

ALTER TABLE PHAN_LOP
ALTER COLUMN trang_thai SET DEFAULT 'Đang học',
ALTER COLUMN trang_thai SET NOT NULL;

-- 4. Bảng KHUNG_XEP_LOAI
ALTER TABLE KHUNG_XEP_LOAI DROP CONSTRAINT IF EXISTS uk_khung_xep_loai_nam;
ALTER TABLE KHUNG_XEP_LOAI ADD CONSTRAINT uk_khung_xep_loai_nam UNIQUE (id_cau_hinh_nam_hoc, ten_xep_loai);

-- 5. Bảng DIEM_HOC_TAP
ALTER TABLE DIEM_HOC_TAP DROP CONSTRAINT IF EXISTS check_diem_hoc_tap_range;
ALTER TABLE DIEM_HOC_TAP ADD CONSTRAINT check_diem_hoc_tap_range CHECK (diem_so BETWEEN 0 AND 10);

ALTER TABLE DIEM_HOC_TAP DROP CONSTRAINT IF EXISTS uk_diem_hoc_tap_bai;
ALTER TABLE DIEM_HOC_TAP ADD CONSTRAINT uk_diem_hoc_tap_bai UNIQUE (id_tn, id_cau_hinh_nam_hoc, stt_bai_ktra);

-- 6. Bảng DIEM_KY_LUAT
ALTER TABLE DIEM_KY_LUAT DROP CONSTRAINT IF EXISTS check_diem_ky_luat_range;
ALTER TABLE DIEM_KY_LUAT ADD CONSTRAINT check_diem_ky_luat_range CHECK (diem BETWEEN 0 AND 10);

ALTER TABLE DIEM_KY_LUAT DROP CONSTRAINT IF EXISTS check_thang_ky_luat;
ALTER TABLE DIEM_KY_LUAT ADD CONSTRAINT check_thang_ky_luat CHECK (thang BETWEEN 1 AND 12);

ALTER TABLE DIEM_KY_LUAT DROP CONSTRAINT IF EXISTS uk_diem_ky_luat_thang;
ALTER TABLE DIEM_KY_LUAT ADD CONSTRAINT uk_diem_ky_luat_thang UNIQUE (id_tn, id_cau_hinh_nam_hoc, thang);

-- 7. Bảng DIEM_CHUYEN_CAN
ALTER TABLE DIEM_CHUYEN_CAN DROP CONSTRAINT IF EXISTS check_diem_chuyen_can_range;
ALTER TABLE DIEM_CHUYEN_CAN ADD CONSTRAINT check_diem_chuyen_can_range CHECK (diem_chuyen_can BETWEEN 0 AND 10);

ALTER TABLE DIEM_CHUYEN_CAN DROP CONSTRAINT IF EXISTS check_thang_chuyen_can;
ALTER TABLE DIEM_CHUYEN_CAN ADD CONSTRAINT check_thang_chuyen_can CHECK (thang BETWEEN 1 AND 12);

ALTER TABLE DIEM_CHUYEN_CAN DROP CONSTRAINT IF EXISTS check_logic_chuyen_can;
ALTER TABLE DIEM_CHUYEN_CAN ADD CONSTRAINT check_logic_chuyen_can CHECK (tong_so_buoi > 0 AND co_mat >= 0 AND co_mat <= tong_so_buoi);

ALTER TABLE DIEM_CHUYEN_CAN DROP CONSTRAINT IF EXISTS uk_diem_chuyen_can_thang;
ALTER TABLE DIEM_CHUYEN_CAN ADD CONSTRAINT uk_diem_chuyen_can_thang UNIQUE (id_tn, id_cau_hinh_nam_hoc, thang);

-- 8. Bảng TONG_KET_NAM_HOC
ALTER TABLE TONG_KET_NAM_HOC DROP CONSTRAINT IF EXISTS check_tk_diem_hoc_tap;
ALTER TABLE TONG_KET_NAM_HOC ADD CONSTRAINT check_tk_diem_hoc_tap CHECK (diem_hoc_tap BETWEEN 0 AND 10);

ALTER TABLE TONG_KET_NAM_HOC DROP CONSTRAINT IF EXISTS check_tk_diem_chuyen_can;
ALTER TABLE TONG_KET_NAM_HOC ADD CONSTRAINT check_tk_diem_chuyen_can CHECK (diem_chuyen_can BETWEEN 0 AND 10);

ALTER TABLE TONG_KET_NAM_HOC DROP CONSTRAINT IF EXISTS check_tk_diem_ky_luat;
ALTER TABLE TONG_KET_NAM_HOC ADD CONSTRAINT check_tk_diem_ky_luat CHECK (diem_ky_luat BETWEEN 0 AND 10);

ALTER TABLE TONG_KET_NAM_HOC DROP CONSTRAINT IF EXISTS check_tk_diem_tong;
ALTER TABLE TONG_KET_NAM_HOC ADD CONSTRAINT check_tk_diem_tong CHECK (diem_tong BETWEEN 0 AND 10);

ALTER TABLE TONG_KET_NAM_HOC DROP CONSTRAINT IF EXISTS uk_tong_ket_nam_hoc;
ALTER TABLE TONG_KET_NAM_HOC ADD CONSTRAINT uk_tong_ket_nam_hoc UNIQUE (id_tn, id_cau_hinh_nam_hoc);

-- 9. Bảng PHAN_CONG_BDH
ALTER TABLE PHAN_CONG_BDH DROP CONSTRAINT IF EXISTS uk_phan_cong_bdh_nam;
ALTER TABLE PHAN_CONG_BDH ADD CONSTRAINT uk_phan_cong_bdh_nam UNIQUE (id_glv, id_cau_hinh_nam_hoc);

-- 10. Bảng PHAN_CONG_TRUONG_KHOI
-- 1. Xóa ràng buộc unique theo khối cũ để 1 khối được phép có nhiều trưởng khối
ALTER TABLE PHAN_CONG_TRUONG_KHOI DROP CONSTRAINT IF EXISTS uk_truong_khoi_nam;

-- 2. Đảm bảo ràng buộc mỗi GLV chỉ làm trưởng khối 1 khối trong 1 niên khóa vẫn được giữ nguyên
ALTER TABLE PHAN_CONG_TRUONG_KHOI DROP CONSTRAINT IF EXISTS uk_glv_mot_khoi_moi_nien_khoa;
ALTER TABLE PHAN_CONG_TRUONG_KHOI ADD CONSTRAINT uk_glv_mot_khoi_moi_nien_khoa UNIQUE (id_glv, id_cau_hinh_nam_hoc);
ALTER TABLE PHAN_CONG_TRUONG_KHOI ADD CONSTRAINT uk_truong_khoi_nam UNIQUE (id_khoi, id_cau_hinh_nam_hoc);
ALTER TABLE PHAN_CONG_TRUONG_KHOI DROP CONSTRAINT IF EXISTS uk_glv_mot_khoi_moi_nien_khoa;
ALTER TABLE PHAN_CONG_TRUONG_KHOI ADD CONSTRAINT uk_glv_mot_khoi_moi_nien_khoa UNIQUE (id_glv, id_cau_hinh_nam_hoc);

-- 11. Bảng PHAN_CONG_GLV
ALTER TABLE PHAN_CONG_GLV DROP CONSTRAINT IF EXISTS uk_glv_mot_lop_moi_nien_khoa;
ALTER TABLE PHAN_CONG_GLV ADD CONSTRAINT uk_glv_mot_lop_moi_nien_khoa UNIQUE (id_glv, id_cau_hinh_nam_hoc);
ALTER TABLE PHAN_CONG_GLV ADD CONSTRAINT uk_phan_cong_glv_nam UNIQUE (id_glv, id_lop, id_cau_hinh_nam_hoc);

-- 12. Trạng thái GLV
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_trang_thai_glv') THEN
		CREATE TYPE enum_trang_thai_glv AS ENUM ('Đang hoạt động', 'Tạm nghỉ', 'Đã ngưng');
	END IF;
END
$$;

ALTER TABLE GLV
ADD COLUMN IF NOT EXISTS trang_thai enum_trang_thai_glv DEFAULT 'Đang hoạt động';

UPDATE GLV
SET trang_thai = 'Đang hoạt động'
WHERE trang_thai IS NULL;

ALTER TABLE GLV
ALTER COLUMN trang_thai SET DEFAULT 'Đang hoạt động',
ALTER COLUMN trang_thai SET NOT NULL;

-- 13. Bảng BI_TICH & PHU_HUYNH & TAI_KHOAN & THIEU_NHI
ALTER TABLE BI_TICH DROP CONSTRAINT IF EXISTS uk_thieu_nhi_loai_bi_tich;
ALTER TABLE BI_TICH ADD CONSTRAINT uk_thieu_nhi_loai_bi_tich UNIQUE (id_tn, loai_bi_tich);

ALTER TABLE THIEU_NHI DROP CONSTRAINT IF EXISTS check_ngay_sinh_hop_le;
ALTER TABLE THIEU_NHI ADD CONSTRAINT check_ngay_sinh_hop_le CHECK (ngay_sinh <= CURRENT_DATE);

ALTER TABLE BI_TICH DROP CONSTRAINT IF EXISTS check_ngay_lanh_nhan_hop_le;
ALTER TABLE BI_TICH ADD CONSTRAINT check_ngay_lanh_nhan_hop_le CHECK (ngay_lanh_nhan <= CURRENT_DATE);

ALTER TABLE PHU_HUYNH DROP CONSTRAINT IF EXISTS check_sdt_phu_huynh;
ALTER TABLE PHU_HUYNH ADD CONSTRAINT check_sdt_phu_huynh CHECK (LENGTH(sdt) >= 9);

ALTER TABLE TAI_KHOAN DROP CONSTRAINT IF EXISTS unique_username;
ALTER TABLE TAI_KHOAN ADD CONSTRAINT unique_username UNIQUE (username);