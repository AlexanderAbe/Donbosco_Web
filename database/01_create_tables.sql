-- 1. THIEU_NHI
CREATE TABLE THIEU_NHI (
    id_tn INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ten_thanh VARCHAR(50),
    ho_va_ten_lot VARCHAR(100),
    ten VARCHAR(50),
    gioi_tinh VARCHAR(10),
    ngay_sinh DATE,
    dia_chi VARCHAR(255),
    mstn VARCHAR(20) UNIQUE
);

-- 2. KHOI
CREATE TABLE KHOI (
    id_khoi INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    stt INT,
    ten_khoi VARCHAR(50)
);

-- 3. GLV
CREATE TABLE GLV (
    id_glv INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ten_thanh VARCHAR(50),
    ho_va_ten_lot VARCHAR(100),
    ten VARCHAR(50),
    ngay_sinh DATE,
    gioi_tinh VARCHAR(10),
    sdt VARCHAR(15)
);

-- 4. CAU_HINH_NAM_HOC
CREATE TABLE CAU_HINH_NAM_HOC (
    id_cau_hinh_nam_hoc INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nien_khoa VARCHAR(20),
    trong_so_hoc_tap DECIMAL(3,2),
    trong_so_ky_luat DECIMAL(3,2),
    trong_so_diem_chuyen_can DECIMAL(3,2),
    so_luong_bai_ktra INT,
    ngay_tao DATE
);

-- 5. KHUNG_XEP_LOAI
CREATE TABLE KHUNG_XEP_LOAI (
    id_khung_xep_loai INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nien_khoa VARCHAR(20),
    ten_xep_loai VARCHAR(50),
    min DECIMAL(4,2),
    max DECIMAL(4,2),
    id_cau_hinh_nam_hoc INT REFERENCES CAU_HINH_NAM_HOC(id_cau_hinh_nam_hoc)
);

-- 6. LOP_HOC
CREATE TABLE LOP_HOC (
    id_lop INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ten_lop VARCHAR(50),
    nien_khoa VARCHAR(20),
    id_khoi INT REFERENCES KHOI(id_khoi)
);

-- 7. PHU_HUYNH
CREATE TABLE PHU_HUYNH (
    id_phu_huynh INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sdt VARCHAR(15),
    id_tn INT REFERENCES THIEU_NHI(id_tn),
    ten_thanh_ph VARCHAR(50),
    ten_ph VARCHAR(100),
    moi_quan_he VARCHAR(50)
);

-- 8. BI_TICH
CREATE TABLE BI_TICH (
    id_bi_tich INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    loai_bi_tich VARCHAR(50),
    ngay_lanh_nhan DATE,
    id_tn INT REFERENCES THIEU_NHI(id_tn)
);

-- 9. DIEM_KY_LUAT
CREATE TABLE DIEM_KY_LUAT (
    id_ky_luat INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    thang INT,
    diem DECIMAL(4,2),
    nien_khoa VARCHAR(20),
    id_tn INT REFERENCES THIEU_NHI(id_tn)
);

-- 10. DIEM_HOC_TAP
CREATE TABLE DIEM_HOC_TAP (
    id_hoc_tap INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    stt_bai_ktra INT,
    diem_so DECIMAL(4,2),
    nien_khoa VARCHAR(20),
    id_tn INT REFERENCES THIEU_NHI(id_tn)
);

-- 11. DIEM_CHUYEN_CAN
CREATE TABLE DIEM_CHUYEN_CAN (
    id_chuyen_can INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    thang INT,
    tong_so_buoi INT,
    co_mat INT,
    diem_chuyen_can DECIMAL(4,2),
    nien_khoa VARCHAR(20),
    id_tn INT REFERENCES THIEU_NHI(id_tn)
);

-- 12. DIEM_DANH
CREATE TABLE DIEM_DANH (
    id_diem_danh INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ngay_diem_danh DATE,
    trang_thai VARCHAR(20),
    id_tn INT REFERENCES THIEU_NHI(id_tn),
    id_lop INT REFERENCES LOP_HOC(id_lop)
);

-- 13. TONG_KET_NAM_HOC
CREATE TABLE TONG_KET_NAM_HOC (
    id_tong_ket_nam_hoc INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nien_khoa VARCHAR(20),
    diem_hoc_tap DECIMAL(4,2),
    diem_chuyen_can DECIMAL(4,2),
    diem_ky_luat DECIMAL(4,2),
    diem_tong DECIMAL(4,2),
    tinh_trang VARCHAR(50),
    id_tn INT REFERENCES THIEU_NHI(id_tn),
    id_lop INT REFERENCES LOP_HOC(id_lop),
    id_khung_xep_loai INT REFERENCES KHUNG_XEP_LOAI(id_khung_xep_loai)
);

-- 14. PHAN_LOP
CREATE TABLE PHAN_LOP (
    id_phan_lop INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nien_khoa VARCHAR(20),
    id_tn INT REFERENCES THIEU_NHI(id_tn),
    id_lop INT REFERENCES LOP_HOC(id_lop)
);

-- 15. TAI_KHOAN
CREATE TABLE TAI_KHOAN (
    id_tk INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username VARCHAR(50),
    password_hash VARCHAR(255),
    is_admin BOOLEAN,
    id_glv INT REFERENCES GLV(id_glv)
);

-- 16. PHAN_CONG_GLV
CREATE TABLE PHAN_CONG_GLV (
    id_phan_cong_glv INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_glv INT REFERENCES GLV(id_glv),
    id_lop INT REFERENCES LOP_HOC(id_lop)
);

-- 17. PHAN_CONG_BDH
CREATE TABLE PHAN_CONG_BDH (
    id_phan_cong_bdh INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nien_khoa VARCHAR(20),
    id_glv INT REFERENCES GLV(id_glv)
);

-- 18. PHAN_CONG_TRUONG_KHOI
CREATE TABLE PHAN_CONG_TRUONG_KHOI (
    id_phan_cong_truong INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nien_khoa VARCHAR(20),
    id_glv INT REFERENCES GLV(id_glv),
    id_khoi INT REFERENCES KHOI(id_khoi)
);