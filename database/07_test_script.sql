-- =====================================================================
-- KỊCH BẢN KIỂM THỬ (TEST SCRIPT) - HỆ THỐNG QUẢN LÝ GIÁO LÝ ĐON BOSCO
-- =====================================================================

-- BƯỚC 0: DỌN DẸP DỮ LIỆU CŨ (NẾU CẦN CHẠY LẠI TỪ ĐẦU)
-- TRUNCATE TABLE TAI_KHOAN, PHAN_LOP, TONG_KET_NAM_HOC, THIEU_NHI, GLV, LOP_HOC, KHUNG_XEP_LOAI, CAU_HINH_NAM_HOC, KHOI RESTART IDENTITY CASCADE;


-- =====================================================================
-- 1. KIỂM THỬ TRIGGER: TỰ ĐỘNG SINH MÃ SỐ THIẾU NHI (MSTN)
-- Định dạng: YY + ID (4 chữ số) + Giới tính (A: Nam, B: Nữ)
-- =====================================================================

-- Thêm một thiếu nhi nam mới (ID tiếp theo dự kiến là 4)
INSERT INTO THIEU_NHI (ten_thanh, ho_va_ten_lot, ten, gioi_tinh, ngay_sinh, dia_chi)
VALUES ('Dominico', 'Nguyễn Văn', 'Hùng', 'Nam', TO_DATE('12/05/2018', 'DD/MM/YYYY'), '123 Test Street');

-- Kiểm tra kết quả MSTN vừa sinh ra (Mong đợi: 260004A)
SELECT id_tn, ten, ngay_sinh, mstn
FROM THIEU_NHI
WHERE ten = 'Hùng';


-- =====================================================================
-- 2. KIỂM THỬ TRIGGER: TỰ ĐỘNG TẠO TÀI KHOẢN GLV (Mật khẩu DDMMYYYY)
-- =====================================================================

-- Thêm GLV sinh ngày 20/10/1998, SĐT: 0988889999
INSERT INTO GLV (ten_thanh, ho_va_ten_lot, ten, ngay_sinh, gioi_tinh, sdt)
VALUES ('Têrêsa', 'Trần Thị', 'Mai', TO_DATE('20/10/1998', 'DD/MM/YYYY'), 'Nữ', '0988889999');

-- Kiểm tra bảng TAI_KHOAN (Mong đợi: username = '0988889999', password_hash = '20101998')
SELECT *
FROM TAI_KHOAN
WHERE username = '0988889999';


-- =====================================================================
-- 3. KIỂM THỬ TRIGGER: CHẶN TRÙNG LỚP TRONG CÙNG NIÊN KHÓA (Negative Test)
-- =====================================================================
-- BƯỚC 1: Đảm bảo thiếu nhi id_tn = 1 đã được phân vào Lớp 1 trong niên khóa '2025-2026'
-- (Nếu ở file seed data bạn đã có rồi thì câu lệnh này có thể bỏ qua hoặc báo trùng khóa chính nếu insert lại,
-- nên ta dùng INSERT ... ON CONFLICT hoặc kiểm tra trước)
INSERT INTO PHAN_LOP (id_cau_hinh_nam_hoc, id_tn, id_lop, trang_thai)
SELECT id_cau_hinh_nam_hoc, 1, 1, 'Đang học'
FROM CAU_HINH_NAM_HOC
WHERE nien_khoa = '2025-2026'
ON CONFLICT DO NOTHING;

-- BƯỚC 2: Thử ép xếp em id_tn = 1 này vào MỘT LỚP KHÁC (ví dụ Lớp ID = 2) trong cùng niên khóa '2025-2026'
-- Lúc này Trigger 'trg_check_phan_lop' sẽ lập tức quét và chặn lại!
INSERT INTO PHAN_LOP (id_cau_hinh_nam_hoc, id_tn, id_lop, trang_thai)
SELECT id_cau_hinh_nam_hoc, 1, 2, 'Đang học'
FROM CAU_HINH_NAM_HOC
WHERE nien_khoa = '2025-2026';

DO $$
BEGIN
    INSERT INTO PHAN_LOP (id_cau_hinh_nam_hoc, id_tn, id_lop, trang_thai)
    SELECT id_cau_hinh_nam_hoc, 1, 2, 'Đang học'
    FROM CAU_HINH_NAM_HOC
    WHERE nien_khoa = '2025-2026';
    RAISE NOTICE 'Test thất bại: Hệ thống cho phép xếp trùng lớp!';
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Test thành công: Hệ thống đã chặn thành công lỗi trùng lớp. Chi tiết lỗi: %', SQLERRM;
END $$;


-- =====================================================================
-- 4. KIỂM THỬ STORED PROCEDURE: TÍNH ĐIỂM TỔNG KẾT & QUY TẮC ĐIỂM LIỆT
-- =====================================================================

-- A. Giả lập điểm số cho thiếu nhi ID = 1 trong niên khóa '2025-2026'
-- Đưa điểm học tập xuống mức liệt (< 5.0), dù chuyên cần và kỷ luật cao.
DELETE FROM DIEM_HOC_TAP WHERE id_tn = 1 AND nien_khoa = '2025-2026';
DELETE FROM DIEM_CHUYEN_CAN WHERE id_tn = 1 AND nien_khoa = '2025-2026';
DELETE FROM DIEM_KY_LUAT WHERE id_tn = 1 AND nien_khoa = '2025-2026';

-- Chèn điểm học tập thấp (Điểm liệt = 4.0)
INSERT INTO DIEM_HOC_TAP (diem_so, nien_khoa, id_tn) VALUES (4.0, '2025-2026', 1);

-- Chèn điểm chuyên cần tháng cao (9.0)
INSERT INTO DIEM_CHUYEN_CAN (thang, tong_so_buoi, co_mat, diem_chuyen_can, nien_khoa, id_tn)
VALUES (1, 10, 9, 9.0, '2025-2026', 1);

-- Chèn điểm kỷ luật cao (8.0)
INSERT INTO DIEM_KY_LUAT (thang, diem, nien_khoa, id_tn)
VALUES (1, 8.0, '2025-2026', 1);

-- B. Thực thi thủ tục tính điểm tổng kết cho Lớp ID = 1
CALL sp_tinh_tong_ket_nam_hoc('2025-2026', 1);

-- C. Kiểm tra kết quả trong bảng TONG_KET_NAM_HOC
-- Mong đợi: Mặc dù điểm tổng có thể cao, nhưng vì điểm học tập = 4.0 (< 5.0)
-- nên cột 'tinh_trang' BẮT BUỘC phải là 'Ở lại lớp'.
SELECT tk.id_tn, tn.ten, tk.diem_hoc_tap, tk.diem_chuyen_can, tk.diem_ky_luat, tk.diem_tong, tk.tinh_trang
FROM TONG_KET_NAM_HOC tk
JOIN THIEU_NHI tn ON tk.id_tn = tn.id_tn
WHERE tk.id_tn = 1 AND tk.nien_khoa = '2025-2026';