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
    c.nien_khoa,
    l.id_lop,
    l.ten_lop,
    k.id_khoi,
    k.ten_khoi
FROM THIEU_NHI tn
JOIN PHAN_LOP pl ON tn.id_tn = pl.id_tn
JOIN CAU_HINH_NAM_HOC c ON pl.id_cau_hinh_nam_hoc = c.id_cau_hinh_nam_hoc
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
    c.nien_khoa,
    k.ten_khoi
FROM PHAN_CONG_GLV pc
JOIN GLV glv ON pc.id_glv = glv.id_glv
JOIN LOP_HOC l ON pc.id_lop = l.id_lop
JOIN CAU_HINH_NAM_HOC c ON l.id_cau_hinh_nam_hoc = c.id_cau_hinh_nam_hoc
JOIN KHOI k ON l.id_khoi = k.id_khoi;


-- 4. View bảng tổng kết năm học chi tiết (điểm số, tình trạng, tên thiếu nhi, lớp)
CREATE OR REPLACE VIEW vw_tong_ket_chi_tiet AS
SELECT 
    tk.id_tong_ket_nam_hoc,
    tk.id_cau_hinh_nam_hoc,
    c.nien_khoa,
    tn.id_tn,
    tn.mstn,
    tn.ten_thanh,
    tn.ho_va_ten_lot,
    tn.ten,
    l.ten_lop,
    k.ten_khoi,
    tk.diem_hoc_tap,
    tk.diem_chuyen_can,
    tk.diem_ky_luat,
    tk.diem_tong,
    tk.tinh_trang,
    tk.id_khung_xep_loai,
    kxl.ten_xep_loai,
    l.id_lop
FROM TONG_KET_NAM_HOC tk
JOIN CAU_HINH_NAM_HOC c ON tk.id_cau_hinh_nam_hoc = c.id_cau_hinh_nam_hoc
JOIN THIEU_NHI tn ON tk.id_tn = tn.id_tn
JOIN LOP_HOC l ON tk.id_lop = l.id_lop
JOIN KHOI k ON l.id_khoi = k.id_khoi
LEFT JOIN KHUNG_XEP_LOAI kxl ON tk.id_khung_xep_loai = kxl.id_khung_xep_loai;


-- 5. View thông tin tài khoản giáo lý viên
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
    TRIM(CONCAT(g.ten_thanh, ' ', g.ho_va_ten_lot, ' ', g.ten)) AS ho_ten
FROM TAI_KHOAN t
LEFT JOIN GLV g ON t.id_glv = g.id_glv;

CREATE OR REPLACE VIEW vw_so_sanh_hieu_qua_lop_hang_thang AS
WITH monthly_ky_luat AS (
    -- Lấy lớp của thiếu nhi qua bảng PHAN_LOP theo đúng năm học
    SELECT pl.id_lop, dk.id_cau_hinh_nam_hoc, dk.thang, 
           AVG(dk.diem)::NUMERIC(5,2) as avg_ky_luat
    FROM DIEM_KY_LUAT dk
    JOIN PHAN_LOP pl ON dk.id_tn = pl.id_tn AND dk.id_cau_hinh_nam_hoc = pl.id_cau_hinh_nam_hoc
    GROUP BY pl.id_lop, dk.id_cau_hinh_nam_hoc, dk.thang
),
monthly_chuyen_can AS (
    -- Lấy lớp của thiếu nhi qua bảng PHAN_LOP theo đúng năm học
    SELECT pl.id_lop, dc.id_cau_hinh_nam_hoc, dc.thang, 
           AVG(dc.diem_chuyen_can)::NUMERIC(5,2) as avg_chuyen_can
    FROM DIEM_CHUYEN_CAN dc
    JOIN PHAN_LOP pl ON dc.id_tn = pl.id_tn AND dc.id_cau_hinh_nam_hoc = pl.id_cau_hinh_nam_hoc
    GROUP BY pl.id_lop, dc.id_cau_hinh_nam_hoc, dc.thang
),
academic_metrics AS (
    -- Điểm học tập quản lý theo stt_bai_ktra, ta lấy trung bình theo lớp và bài kiểm tra
    SELECT pl.id_lop, dt.id_cau_hinh_nam_hoc, dt.stt_bai_ktra, 
           AVG(dt.diem_so)::NUMERIC(5,2) as avg_hoc_tap
    FROM DIEM_HOC_TAP dt
    JOIN PHAN_LOP pl ON dt.id_tn = pl.id_tn AND dt.id_cau_hinh_nam_hoc = pl.id_cau_hinh_nam_hoc
    GROUP BY pl.id_lop, dt.id_cau_hinh_nam_hoc, dt.stt_bai_ktra
)

SELECT 
    c.nien_khoa,
    l.ten_lop,
    k.ten_khoi,
    COALESCE(am.thang, ky.thang) as thang_trong_nam,
    COALESCE(am.avg_chuyen_can, 0) as diem_chuyen_can_tb,
    COALESCE(ky.avg_ky_luat, 0) as diem_ky_luat_tb
FROM LOP_HOC l
JOIN CAU_HINH_NAM_HOC c ON l.id_cau_hinh_nam_hoc = c.id_cau_hinh_nam_hoc
JOIN KHOI k ON l.id_khoi = k.id_khoi
LEFT JOIN monthly_ky_luat ky ON l.id_lop = ky.id_lop AND l.id_cau_hinh_nam_hoc = ky.id_cau_hinh_nam_hoc
LEFT JOIN monthly_chuyen_can am ON l.id_lop = am.id_lop AND l.id_cau_hinh_nam_hoc = am.id_cau_hinh_nam_hoc
ORDER BY c.nien_khoa DESC, thang_trong_nam DESC;