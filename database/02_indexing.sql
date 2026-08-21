-- 1. INDEX CHO KHÓA NGOẠI (FOREIGN KEYS)
CREATE INDEX idx_bi_tich_tn ON BI_TICH(id_tn);
CREATE INDEX idx_diem_ky_luat_tn ON DIEM_KY_LUAT(id_tn);
CREATE INDEX idx_diem_hoc_tap_tn ON DIEM_HOC_TAP(id_tn);
CREATE INDEX idx_diem_chuyen_can_tn ON DIEM_CHUYEN_CAN(id_tn);
CREATE INDEX idx_diem_danh_tn ON DIEM_DANH(id_tn);
CREATE INDEX idx_tong_ket_tn ON TONG_KET_NAM_HOC(id_tn);
CREATE INDEX idx_phan_lop_tn ON PHAN_LOP(id_tn);

-- 2. INDEX CHO LỚP HỌC VÀ KHỐI
CREATE INDEX idx_diem_danh_lop ON DIEM_DANH(id_lop);
CREATE INDEX idx_tong_ket_lop ON TONG_KET_NAM_HOC(id_lop);
CREATE INDEX idx_phan_lop_lop ON PHAN_LOP(id_lop);
CREATE INDEX idx_lop_hoc_khoi ON LOP_HOC(id_khoi);
CREATE INDEX idx_pc_glv_lop ON PHAN_CONG_GLV(id_lop);

-- 3. INDEX CHO GIÁO LÝ VIÊN (GLV) VÀ CẤU HÌNH
CREATE INDEX idx_tai_khoan_glv ON TAI_KHOAN(id_glv);
CREATE INDEX idx_pc_glv_glv ON PHAN_CONG_GLV(id_glv);
CREATE INDEX idx_pc_bdh_glv ON PHAN_CONG_BDH(id_glv);
CREATE INDEX idx_pc_truong_glv ON PHAN_CONG_TRUONG_KHOI(id_glv);
CREATE INDEX idx_pc_truong_khoi ON PHAN_CONG_TRUONG_KHOI(id_khoi);
CREATE INDEX idx_khung_xep_loai_cau_hinh ON KHUNG_XEP_LOAI(id_cau_hinh_nam_hoc);
CREATE INDEX idx_tong_ket_khung ON TONG_KET_NAM_HOC(id_khung_xep_loai);

-- 4. INDEX TÌM KIẾM VÀ LỌC THEO NGHIỆP VỤ THỰC TẾ
CREATE INDEX idx_thieu_nhi_ten ON THIEU_NHI(ten);
CREATE INDEX idx_phu_huynh_sdt ON PHU_HUYNH(sdt);
CREATE INDEX idx_phan_lop_nien_khoa ON PHAN_LOP(nien_khoa);

DROP INDEX IF EXISTS idx_phan_lop_nien_khoa;

-- 2. BỔ SUNG INDEX CHO CÁC KHÓA NGOẠI ID_CAU_HINH_NAM_HOC MỚI
-- (Giúp tăng tốc cực nhanh khi lọc hoặc JOIN dữ liệu theo năm học)
CREATE INDEX IF NOT EXISTS idx_lop_hoc_cau_hinh ON LOP_HOC(id_cau_hinh_nam_hoc);
CREATE INDEX IF NOT EXISTS idx_phan_lop_cau_hinh ON PHAN_LOP(id_cau_hinh_nam_hoc);
CREATE INDEX IF NOT EXISTS idx_diem_hoc_tap_cau_hinh ON DIEM_HOC_TAP(id_cau_hinh_nam_hoc);
CREATE INDEX IF NOT EXISTS idx_diem_ky_luat_cau_hinh ON DIEM_KY_LUAT(id_cau_hinh_nam_hoc);
CREATE INDEX IF NOT EXISTS idx_diem_chuyen_can_cau_hinh ON DIEM_CHUYEN_CAN(id_cau_hinh_nam_hoc);
CREATE INDEX IF NOT EXISTS idx_tong_ket_nam_hoc_cau_hinh ON TONG_KET_NAM_HOC(id_cau_hinh_nam_hoc);
CREATE INDEX IF NOT EXISTS idx_pc_bdh_cau_hinh ON PHAN_CONG_BDH(id_cau_hinh_nam_hoc);
CREATE INDEX IF NOT EXISTS idx_pc_truong_khoi_cau_hinh ON PHAN_CONG_TRUONG_KHOI(id_cau_hinh_nam_hoc);