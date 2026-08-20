-- 1. RÀNG BUỘC ĐIỂM SỐ (Từ 0 đến 10)
ALTER TABLE DIEM_HOC_TAP ADD CONSTRAINT check_diem_hoc_tap_range CHECK (diem_so BETWEEN 0 AND 10);
ALTER TABLE DIEM_KY_LUAT ADD CONSTRAINT check_diem_ky_luat_range CHECK (diem BETWEEN 0 AND 10);
ALTER TABLE DIEM_CHUYEN_CAN ADD CONSTRAINT check_diem_chuyen_can_range CHECK (diem_chuyen_can BETWEEN 0 AND 10);

ALTER TABLE TONG_KET_NAM_HOC ADD CONSTRAINT check_tk_diem_hoc_tap CHECK (diem_hoc_tap BETWEEN 0 AND 10);
ALTER TABLE TONG_KET_NAM_HOC ADD CONSTRAINT check_tk_diem_chuyen_can CHECK (diem_chuyen_can BETWEEN 0 AND 10);
ALTER TABLE TONG_KET_NAM_HOC ADD CONSTRAINT check_tk_diem_ky_luat CHECK (diem_ky_luat BETWEEN 0 AND 10);
ALTER TABLE TONG_KET_NAM_HOC ADD CONSTRAINT check_tk_diem_tong CHECK (diem_tong BETWEEN 0 AND 10);


-- 2. RÀNG BUỘC THÁNG (Từ 1 đến 12)
ALTER TABLE DIEM_KY_LUAT ADD CONSTRAINT check_thang_ky_luat CHECK (thang BETWEEN 1 AND 12);
ALTER TABLE DIEM_CHUYEN_CAN ADD CONSTRAINT check_thang_chuyen_can CHECK (thang BETWEEN 1 AND 12);


-- 3. RÀNG BUỘC NIÊN KHÓA (Định dạng chuẩn YYYY-YYYY)
ALTER TABLE CAU_HINH_NAM_HOC ADD CONSTRAINT check_nk_cau_hinh CHECK (nien_khoa ~ '^\d{4}-\d{4}$');
ALTER TABLE KHUNG_XEP_LOAI ADD CONSTRAINT check_nk_khung_xep_loai CHECK (nien_khoa ~ '^\d{4}-\d{4}$');
ALTER TABLE LOP_HOC ADD CONSTRAINT check_nk_lop_hoc CHECK (nien_khoa ~ '^\d{4}-\d{4}$');
ALTER TABLE DIEM_KY_LUAT ADD CONSTRAINT check_nk_diem_ky_luat CHECK (nien_khoa ~ '^\d{4}-\d{4}$');
ALTER TABLE DIEM_HOC_TAP ADD CONSTRAINT check_nk_diem_hoc_tap CHECK (nien_khoa ~ '^\d{4}-\d{4}$');
ALTER TABLE DIEM_CHUYEN_CAN ADD CONSTRAINT check_nk_diem_chuyen_can CHECK (nien_khoa ~ '^\d{4}-\d{4}$');
ALTER TABLE TONG_KET_NAM_HOC ADD CONSTRAINT check_nk_tong_ket CHECK (nien_khoa ~ '^\d{4}-\d{4}$');
ALTER TABLE PHAN_LOP ADD CONSTRAINT check_nk_phan_lop CHECK (nien_khoa ~ '^\d{4}-\d{4}$');
ALTER TABLE PHAN_CONG_BDH ADD CONSTRAINT check_nk_pc_bdh CHECK (nien_khoa ~ '^\d{4}-\d{4}$');
ALTER TABLE PHAN_CONG_TRUONG_KHOI ADD CONSTRAINT check_nk_pc_truong_khoi CHECK (nien_khoa ~ '^\d{4}-\d{4}$');

-- 4. CÁC RÀNG BUỘC NGHIỆP VỤ & TOÀN VẸN DỮ LIỆU
ALTER TABLE THIEU_NHI ADD CONSTRAINT check_ngay_sinh_hop_le CHECK (ngay_sinh <= CURRENT_DATE);
ALTER TABLE BI_TICH ADD CONSTRAINT check_ngay_lanh_nhan_hop_le CHECK (ngay_lanh_nhan <= CURRENT_DATE);
ALTER TABLE PHU_HUYNH ADD CONSTRAINT check_sdt_phu_huynh CHECK (LENGTH(sdt) >= 9);
ALTER TABLE tai_khoan ADD CONSTRAINT unique_username UNIQUE (username);

-- Ràng buộc độc nhất (Unique Constraints)
ALTER TABLE PHAN_LOP ADD CONSTRAINT uk_thieu_nhi_nien_khoa UNIQUE (id_tn, nien_khoa);
ALTER TABLE BI_TICH ADD CONSTRAINT uk_thieu_nhi_loai_bi_tich UNIQUE (id_tn, loai_bi_tich);