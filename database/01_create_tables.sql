-- ==========================================================
-- 1. BẢNG CAU_HINH_NAM_HOC
-- ==========================================================
CREATE TABLE CAU_HINH_NAM_HOC (
    id_cau_hinh_nam_hoc INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nien_khoa VARCHAR(20),
    trong_so_hoc_tap DECIMAL(3,2),
    trong_so_ky_luat DECIMAL(3,2),
    trong_so_diem_chuyen_can DECIMAL(3,2),
    so_luong_bai_ktra INT,
    ngay_tao DATE,
    stt_khoi_ket_thuc INT,
    is_locked BOOLEAN DEFAULT FALSE
);


-- ==========================================================
-- 2. BẢNG KHOI
-- ==========================================================
CREATE TABLE KHOI (
    id_khoi INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    stt INT,
    ten_khoi VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    is_bi_tich BOOLEAN DEFAULT FALSE
);


-- ==========================================================
-- 3. BẢNG THIEU_NHI
-- ==========================================================
CREATE TABLE THIEU_NHI (
    id_tn INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ten_thanh VARCHAR(50),
    ho_va_ten_lot VARCHAR(100),
    ten VARCHAR(50),
    gioi_tinh enum_gioi_tinh,
    ngay_sinh DATE,
    dia_chi VARCHAR(255),
    mstn VARCHAR(20) UNIQUE
);


-- ==========================================================
-- 4. BẢNG GLV
-- ==========================================================
CREATE TABLE GLV (
    id_glv INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ten_thanh VARCHAR(50),
    ho_va_ten_lot VARCHAR(100),
    ten VARCHAR(50),
    ngay_sinh DATE,
    gioi_tinh enum_gioi_tinh,
    sdt VARCHAR(15),
    trang_thai enum_trang_thai_glv DEFAULT 'Đang hoạt động'
);


-- ==========================================================
-- 5. BẢNG KHUNG_XEP_LOAI
-- ==========================================================
CREATE TABLE KHUNG_XEP_LOAI (
    id_khung_xep_loai INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ten_xep_loai enum_ten_xep_loai,
    min DECIMAL(4,2),
    max DECIMAL(4,2),
    id_cau_hinh_nam_hoc INT REFERENCES CAU_HINH_NAM_HOC(id_cau_hinh_nam_hoc)
);


-- ==========================================================
-- 6. BẢNG LOP_HOC
-- ==========================================================
CREATE TABLE LOP_HOC (
    id_lop INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ten_lop VARCHAR(50),
    id_khoi INT REFERENCES KHOI(id_khoi),
    id_cau_hinh_nam_hoc INT REFERENCES CAU_HINH_NAM_HOC(id_cau_hinh_nam_hoc)
);


-- ==========================================================
-- 7. BẢNG PHU_HUYNH
-- ==========================================================
CREATE TABLE PHU_HUYNH (
    id_phu_huynh INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sdt VARCHAR(15),
    id_tn INT REFERENCES THIEU_NHI(id_tn),
    ten_ph VARCHAR(100),
    moi_quan_he enum_moi_quan_he
);


-- ==========================================================
-- 8. BẢNG BI_TICH
-- ==========================================================
CREATE TABLE BI_TICH (
    id_bi_tich INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    loai_bi_tich enum_bi_tich,
    ngay_lanh_nhan DATE,
    id_tn INT REFERENCES THIEU_NHI(id_tn)
);


-- ==========================================================
-- 9. BẢNG DIEM_KY_LUAT
-- ==========================================================
CREATE TABLE DIEM_KY_LUAT (
    id_ky_luat INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    thang INT,
    diem DECIMAL(4,2),
    id_tn INT REFERENCES THIEU_NHI(id_tn),
    id_cau_hinh_nam_hoc INT REFERENCES CAU_HINH_NAM_HOC(id_cau_hinh_nam_hoc)
);


-- ==========================================================
-- 10. BẢNG DIEM_HOC_TAP
-- ==========================================================
CREATE TABLE DIEM_HOC_TAP (
    id_hoc_tap INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    stt_bai_ktra INT,
    diem_so DECIMAL(4,2),
    id_tn INT REFERENCES THIEU_NHI(id_tn),
    id_cau_hinh_nam_hoc INT REFERENCES CAU_HINH_NAM_HOC(id_cau_hinh_nam_hoc)
);


-- ==========================================================
-- 11. BẢNG DIEM_CHUYEN_CAN
-- ==========================================================
CREATE TABLE DIEM_CHUYEN_CAN (
    id_chuyen_can INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    thang INT,
    tong_so_buoi INT,
    co_mat INT,
    diem_chuyen_can DECIMAL(4,2),
    id_tn INT REFERENCES THIEU_NHI(id_tn),
    id_cau_hinh_nam_hoc INT REFERENCES CAU_HINH_NAM_HOC(id_cau_hinh_nam_hoc)
);


-- ==========================================================
-- 12. BẢNG DIEM_DANH (Đã chuẩn hóa phân loại buổi và dùng enum)
-- ==========================================================
CREATE TABLE DIEM_DANH (
    id_diem_danh INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ngay_diem_danh DATE NOT NULL,
    loai_buoi enum_loai_buoi NOT NULL,
    trang_thai enum_diem_danh NOT NULL,
    id_tn INT REFERENCES THIEU_NHI(id_tn) ON DELETE CASCADE,
    id_lop INT REFERENCES LOP_HOC(id_lop) ON DELETE CASCADE,
    CONSTRAINT uq_diem_danh_ngay_buoi UNIQUE (ngay_diem_danh, loai_buoi, id_tn)
);


-- ==========================================================
-- 13. BẢNG TONG_KET_NAM_HOC
-- ==========================================================
CREATE TABLE TONG_KET_NAM_HOC (
    id_tong_ket_nam_hoc INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    diem_hoc_tap DECIMAL(4,2),
    diem_chuyen_can DECIMAL(4,2),
    diem_ky_luat DECIMAL(4,2),
    diem_tong DECIMAL(4,2),
    tinh_trang enum_ket_qua,
    id_tn INT REFERENCES THIEU_NHI(id_tn),
    id_lop INT REFERENCES LOP_HOC(id_lop),
    id_khung_xep_loai INT REFERENCES KHUNG_XEP_LOAI(id_khung_xep_loai),
    id_cau_hinh_nam_hoc INT REFERENCES CAU_HINH_NAM_HOC(id_cau_hinh_nam_hoc)
);


-- ==========================================================
-- 14. BẢNG PHAN_LOP
-- ==========================================================
CREATE TABLE PHAN_LOP (
    id_phan_lop INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_tn INT REFERENCES THIEU_NHI(id_tn),
    id_lop INT REFERENCES LOP_HOC(id_lop),
    id_cau_hinh_nam_hoc INT REFERENCES CAU_HINH_NAM_HOC(id_cau_hinh_nam_hoc),
    trang_thai enum_trang_thai_tn NOT NULL DEFAULT 'Đang học'
);


-- ==========================================================
-- 15. BẢNG TAI_KHOAN
-- ==========================================================
CREATE TABLE TAI_KHOAN (
    id_tk INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username VARCHAR(50),
    password_hash VARCHAR(255),
    is_admin BOOLEAN,
    id_glv INT REFERENCES GLV(id_glv),
    trang_thai trang_thai_enum DEFAULT 'Đang hoạt động'
);


-- ==========================================================
-- 16. BẢNG PHAN_CONG_GLV
-- ==========================================================
CREATE TABLE PHAN_CONG_GLV (
    id_phan_cong_glv INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_glv INT REFERENCES GLV(id_glv),
    id_lop INT REFERENCES LOP_HOC(id_lop),
    id_cau_hinh_nam_hoc INT REFERENCES CAU_HINH_NAM_HOC(id_cau_hinh_nam_hoc)
);


-- ==========================================================
-- 17. BẢNG PHAN_CONG_BDH
-- ==========================================================
CREATE TABLE PHAN_CONG_BDH (
    id_phan_cong_bdh INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_glv INT REFERENCES GLV(id_glv),
    id_cau_hinh_nam_hoc INT REFERENCES CAU_HINH_NAM_HOC(id_cau_hinh_nam_hoc)
);


-- ==========================================================
-- 18. BẢNG PHAN_CONG_TRUONG_KHOI
-- ==========================================================
CREATE TABLE PHAN_CONG_TRUONG_KHOI (
    id_phan_cong_truong INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_glv INT REFERENCES GLV(id_glv),
    id_khoi INT REFERENCES KHOI(id_khoi),
    id_cau_hinh_nam_hoc INT REFERENCES CAU_HINH_NAM_HOC(id_cau_hinh_nam_hoc)
);


-- ==========================================================
-- 19. BẢNG AUDIT_LOGS
-- ==========================================================
CREATE TABLE audit_logs (
    id_log INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_tk INT REFERENCES TAI_KHOAN(id_tk) ON DELETE SET NULL,
    action TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'Thành công',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);