-- =====================================================================
-- 06_seed_data.sql
-- TẠO DỮ LIỆU MẪU BAN ĐẦU CHO HỆ THỐNG
-- =====================================================================

-- 1. Thêm dữ liệu các Khối (Từ Khối 1 đến Khối 11)
INSERT INTO KHOI (stt, ten_khoi) VALUES
(1, 'Khai Tâm'),
(2, 'Rước Lễ'),
(3, 'Thêm Sức'),
(4, 'Bao Đồng'),
(5, 'Vào Đời 1'),
(6, 'Vào Đời 2'),
(7, 'Vào Đời 3'),
(8, 'Vào Đời 4'),
(9, 'Vào Đời 5'),
(10, 'Vào Đời 6'),
(11, 'Bao Đồng Trưởng Thành');


-- 2. Thêm Cấu hình năm học 2025-2026
INSERT INTO CAU_HINH_NAM_HOC (nien_khoa, trong_so_hoc_tap, trong_so_ky_luat, trong_so_diem_chuyen_can, so_luong_bai_ktra, ngay_tao) 
VALUES ('2025-2026', 3, 2, 1, 3, CURRENT_DATE);


-- 3. Thêm Khung xếp loại cho năm học 2025-2026 (id_cau_hinh_nam_hoc = 1)
INSERT INTO KHUNG_XEP_LOAI (nien_khoa, ten_xep_loai, min, max, id_cau_hinh_nam_hoc) VALUES
('2025-2026', 'Giỏi', 8.50, 10.00, 1),
('2025-2026', 'Khá', 7.00, 8.49, 1),
('2025-2026', 'Trung Bình', 5.00, 6.99, 1),
('2025-2026', 'Yếu', 0.00, 4.99, 1);


-- 4. Thêm các Lớp học mẫu trong niên khóa 2025-2026
INSERT INTO LOP_HOC (ten_lop, nien_khoa, id_khoi) VALUES
('Khai Tâm 1', '2025-2026', 1),
('Rước Lễ 1', '2025-2026', 2),
('Thêm Sức 1', '2025-2026', 3);


-- 5. Thêm Giáo lý viên mẫu (Trigger sẽ tự động sinh tài khoản trong bảng TAI_KHOAN)
-- Mật khẩu mặc định là ngày sinh (YYYYMMDD) theo hàm trigger đã viết
INSERT INTO GLV (ten_thanh, ho_va_ten_lot, ten, ngay_sinh, gioi_tinh, sdt) VALUES
('Giuse', 'Nguyễn Văn', 'An', '1995-05-15', 'Nam', '0901112233'),
('Têrêsa', 'Trần Thị', 'Bình', '1998-10-20', 'Nữ', '0904445566');

UPDATE TAI_KHOAN
SET is_admin = TRUE
WHERE username = '0901112233';

-- Cấp quyền Ban Điều Hành (BDH) cho id_glv = 1 (nếu chưa có)
INSERT INTO PHAN_CONG_BDH (id_glv)
VALUES (1)
ON CONFLICT DO NOTHING;

-- Cấp quyền Trưởng Khối cho id_glv = 1 (nếu chưa có)
INSERT INTO PHAN_CONG_TRUONG_KHOI (id_glv)
VALUES (1)
ON CONFLICT DO NOTHING;


-- 6. Thêm Thiếu nhi mẫu (Trigger sẽ tự động sinh mã `mstn` dạng YY + id + Giới tính)
INSERT INTO THIEU_NHI (ten_thanh, ho_va_ten_lot, ten, gioi_tinh, ngay_sinh, dia_chi) VALUES
('Phêrô', 'Lê Văn', 'Cường', 'Nam', '2018-03-12', '123 Đường Số 1, Phường An Lạc'),
('Maria', 'Phạm Thị', 'Dung', 'Nữ', '2018-07-25', '456 Đường Số 2, Phường An Lạc'),
('Gioan', 'Nguyễn Hoàng', 'Nam', 'Nam', '2017-01-05', '789 Đường Số 3, Phường An Lạc');


-- 7. Phân lớp thử nghiệm cho các thiếu nhi vừa thêm vào niên khóa 2025-2026
INSERT INTO PHAN_LOP (nien_khoa, id_tn, id_lop) VALUES
('2025-2026', 1, 1),
('2025-2026', 2, 1),
('2025-2026', 3, 2);