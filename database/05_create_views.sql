-- 1. View xem thông tin chi tiết thiếu nhi kèm theo lớp học và khối theo từng niên khóa
CREATE OR REPLACE VIEW vw_chi_tiet_thieu_nhi_lop AS
SELECT 
    tn.id_tn,
    tn.ten_thanh,
    tn.ho_va_ten_lot,
    tn.ten,
    tn.gioi_tinh,
    tn.ngay_sinh,
    tn.dia_chi,
    pl.nien_khoa,
    l.id_lop,
    l.ten_lop,
    k.id_khoi,
    k.ten_khoi
FROM THIEU_NHI tn
JOIN PHAN_LOP pl ON tn.id_tn = pl.id_tn
JOIN LOP_HOC l ON pl.id_lop = l.id_lop
JOIN KHOI k ON l.id_khoi = k.id_khoi;


-- 2. View tra cứu thông tin liên lạc giữa phụ huynh và thiếu nhi
CREATE OR REPLACE VIEW vw_chi_tiet_phu_huynh AS
SELECT 
    ph.id_phu_huynh,
    ph.ten_thanh_ph,
    ph.ten_ph,
    ph.moi_quan_he,
    ph.sdt,
    tn.id_tn,
    tn.ten_thanh AS ten_thanh_tn,
    tn.ho_va_ten_lot AS ho_ten_lot_tn,
    tn.ten AS ten_tn
FROM PHU_HUYNH ph
JOIN THIEU_NHI tn ON ph.id_tn = tn.id_tn;


-- 3. View danh sách phân công giáo lý viên đứng lớp (kèm tên lớp và khối)
CREATE OR REPLACE VIEW vw_phan_cong_giang_day AS
SELECT 
    pc.id_phan_cong_glv,
    glv.id_glv,
    glv.ten_thanh AS ten_thanh_glv,
    glv.ho_va_ten_lot AS ho_ten_lot_glv,
    glv.ten AS ten_glv,
    glv.sdt AS sdt_glv,
    l.id_lop,
    l.ten_lop,
    l.nien_khoa,
    k.ten_khoi
FROM PHAN_CONG_GLV pc
JOIN GLV glv ON pc.id_glv = glv.id_glv
JOIN LOP_HOC l ON pc.id_lop = l.id_lop
JOIN KHOI k ON l.id_khoi = k.id_khoi;


-- 4. View bảng tổng kết năm học chi tiết (điểm số, tình trạng, tên thiếu nhi, lớp)
CREATE OR REPLACE VIEW vw_tong_ket_chi_tiet AS
SELECT 
    tk.id_tong_ket_nam_hoc,
    tk.nien_khoa,
    tn.id_tn,
    tn.ten_thanh,
    tn.ho_va_ten_lot,
    tn.ten,
    l.ten_lop,
    k.ten_khoi,
    tk.diem_hoc_tap,
    tk.diem_chuyen_can,
    tk.diem_ky_luat,
    tk.diem_tong,
    tk.tinh_trang
FROM TONG_KET_NAM_HOC tk
JOIN THIEU_NHI tn ON tk.id_tn = tn.id_tn
JOIN LOP_HOC l ON tk.id_lop = l.id_lop
JOIN KHOI k ON l.id_khoi = k.id_khoi;

CREATE OR REPLACE VIEW vw_tai_khoan_glv AS
SELECT 
    t.id_tk,
    t.username,
    t.password_hash,
    t.is_admin,
    t.id_glv,
    t.trang_thai,
    g.ten_thanh,
    g.ho_va_ten_lot,
    g.ten,
    g.sdt,
    -- Tiện ích: Ghép sẵn họ tên đầy đủ để dùng luôn ở mọi nơi
    TRIM(CONCAT(g.ten_thanh, ' ', g.ho_va_ten_lot, ' ', g.ten)) AS ho_ten
FROM TAI_KHOAN t
LEFT JOIN GLV g ON t.id_glv = g.id_glv;