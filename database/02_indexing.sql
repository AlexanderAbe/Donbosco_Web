-- ==========================================================
-- 0. KÍCH HOẠT EXTENSION TRIGRAM (Phục vụ tìm kiếm chuỗi con ILIKE)
-- ==========================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ==========================================================
-- 1. INDEX CHO CÁC KHÓA NGOẠI (FOREIGN KEYS - B-tree)
-- ==========================================================
CREATE INDEX IF NOT EXISTS idx_khung_xep_loai_cau_hinh ON KHUNG_XEP_LOAI(id_cau_hinh_nam_hoc);

-- Lớp học & Khối
CREATE INDEX IF NOT EXISTS idx_lop_hoc_khoi ON LOP_HOC(id_khoi);
CREATE INDEX IF NOT EXISTS idx_lop_hoc_cau_hinh ON LOP_HOC(id_cau_hinh_nam_hoc);

-- Phụ huynh & Bí tích
CREATE INDEX IF NOT EXISTS idx_phu_huynh_tn ON PHU_HUYNH(id_tn);
CREATE INDEX IF NOT EXISTS idx_bi_tich_tn ON BI_TICH(id_tn);

-- Điểm kỷ luật
CREATE INDEX IF NOT EXISTS idx_diem_ky_luat_tn ON DIEM_KY_LUAT(id_tn);
CREATE INDEX IF NOT EXISTS idx_diem_ky_luat_cau_hinh ON DIEM_KY_LUAT(id_cau_hinh_nam_hoc);

-- Điểm học tập
CREATE INDEX IF NOT EXISTS idx_diem_hoc_tap_tn ON DIEM_HOC_TAP(id_tn);
CREATE INDEX IF NOT EXISTS idx_diem_hoc_tap_cau_hinh ON DIEM_HOC_TAP(id_cau_hinh_nam_hoc);

-- Điểm chuyên cần
CREATE INDEX IF NOT EXISTS idx_diem_chuyen_can_tn ON DIEM_CHUYEN_CAN(id_tn);
CREATE INDEX IF NOT EXISTS idx_diem_chuyen_can_cau_hinh ON DIEM_CHUYEN_CAN(id_cau_hinh_nam_hoc);

-- Điểm danh
CREATE INDEX IF NOT EXISTS idx_diem_danh_tn ON DIEM_DANH(id_tn);
CREATE INDEX IF NOT EXISTS idx_diem_danh_lop ON DIEM_DANH(id_lop);

-- Tổng kết năm học
CREATE INDEX IF NOT EXISTS idx_tong_ket_tn ON TONG_KET_NAM_HOC(id_tn);
CREATE INDEX IF NOT EXISTS idx_tong_ket_lop ON TONG_KET_NAM_HOC(id_lop);
CREATE INDEX IF NOT EXISTS idx_tong_ket_khung ON TONG_KET_NAM_HOC(id_khung_xep_loai);
CREATE INDEX IF NOT EXISTS idx_tong_ket_cau_hinh ON TONG_KET_NAM_HOC(id_cau_hinh_nam_hoc);

-- Phân lớp
CREATE INDEX IF NOT EXISTS idx_phan_lop_tn ON PHAN_LOP(id_tn);
CREATE INDEX IF NOT EXISTS idx_phan_lop_lop ON PHAN_LOP(id_lop);
CREATE INDEX IF NOT EXISTS idx_phan_lop_cau_hinh ON PHAN_LOP(id_cau_hinh_nam_hoc);

-- Tài khoản & Phân công
CREATE INDEX IF NOT EXISTS idx_tai_khoan_glv ON TAI_KHOAN(id_glv);
CREATE INDEX IF NOT EXISTS idx_tai_khoan_trang_thai ON TAI_KHOAN(trang_thai);
CREATE INDEX IF NOT EXISTS idx_tai_khoan_is_admin ON TAI_KHOAN(is_admin);

CREATE INDEX IF NOT EXISTS idx_pc_glv_glv ON PHAN_CONG_GLV(id_glv);
CREATE INDEX IF NOT EXISTS idx_pc_glv_lop ON PHAN_CONG_GLV(id_lop);

CREATE INDEX IF NOT EXISTS idx_pc_bdh_glv ON PHAN_CONG_BDH(id_glv);
CREATE INDEX IF NOT EXISTS idx_pc_bdh_cau_hinh ON PHAN_CONG_BDH(id_cau_hinh_nam_hoc);

CREATE INDEX IF NOT EXISTS idx_pc_truong_glv ON PHAN_CONG_TRUONG_KHOI(id_glv);
CREATE INDEX IF NOT EXISTS idx_pc_truong_khoi ON PHAN_CONG_TRUONG_KHOI(id_khoi);
CREATE INDEX IF NOT EXISTS idx_pc_truong_cau_hinh ON PHAN_CONG_TRUONG_KHOI(id_cau_hinh_nam_hoc);


-- ==========================================================
-- 2. INDEX TÌM KIẾM & LỌC DỮ LIỆU (Sử dụng GIN Trigram cho ILIKE)
-- ==========================================================

-- Tạo Trigram Index giúp tìm kiếm chuỗi con cực nhanh và không bị phân biệt hoa thường
CREATE INDEX idx_thieu_nhi_ten_trgm ON THIEU_NHI USING gin (ten gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_thieu_nhi_ho_lot_trgm ON THIEU_NHI USING gin (ho_va_ten_lot gin_trgm_ops);
CREATE INDEX idx_phu_huynh_sdt_trgm ON PHU_HUYNH USING gin (sdt gin_trgm_ops);
CREATE INDEX idx_glv_sdt_trgm ON GLV USING gin (sdt gin_trgm_ops);
CREATE INDEX idx_glv_ten_trgm ON GLV USING gin (ten gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_glv_ho_lot_trgm ON GLV USING gin (ho_va_ten_lot gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_glv_ten_thanh_trgm ON GLV USING gin (ten_thanh gin_trgm_ops);


-- ==========================================================
-- 3. BỔ SUNG INDEX CHO BẢNG AUDIT_LOGS (Lịch sử hoạt động)
-- ==========================================================
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_id_tk ON audit_logs(id_tk);