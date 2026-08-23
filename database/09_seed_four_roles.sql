BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================================
-- 1. NIÊN KHÓA
-- =====================================================================
INSERT INTO CAU_HINH_NAM_HOC
    (nien_khoa, trong_so_hoc_tap, trong_so_ky_luat, trong_so_diem_chuyen_can, so_luong_bai_ktra, ngay_tao)
VALUES
    ('2025-2026', 3.00, 2.00, 1.00, 3, CURRENT_DATE),
    ('2024-2025', 3.00, 2.00, 1.00, 3, CURRENT_DATE - INTERVAL '365 days')
ON CONFLICT (nien_khoa) DO UPDATE SET
    trong_so_hoc_tap = EXCLUDED.trong_so_hoc_tap,
    trong_so_ky_luat = EXCLUDED.trong_so_ky_luat,
    trong_so_diem_chuyen_can = EXCLUDED.trong_so_diem_chuyen_can,
    so_luong_bai_ktra = EXCLUDED.so_luong_bai_ktra;

-- =====================================================================
-- 2. KHỐI
-- =====================================================================
INSERT INTO KHOI (stt, ten_khoi)
SELECT seed.stt, seed.ten_khoi
FROM (VALUES
    (1, 'Khai Tâm'),
    (2, 'Rước Lễ'),
    (3, 'Thêm Sức'),
    (4, 'Bao Đồng'),
    (5, 'Vào Đời 1')
) AS seed(stt, ten_khoi)
WHERE NOT EXISTS (
    SELECT 1 FROM KHOI k WHERE k.ten_khoi = seed.ten_khoi
);

-- =====================================================================
-- 3. KHUNG XẾP LOẠI
-- =====================================================================
INSERT INTO KHUNG_XEP_LOAI (ten_xep_loai, min, max, id_cau_hinh_nam_hoc)
SELECT ranking.ten_xep_loai, ranking.min, ranking.max, year_config.id_cau_hinh_nam_hoc
FROM (VALUES
    ('Giỏi', 8.50::DECIMAL, 10.00::DECIMAL),
    ('Khá', 7.00::DECIMAL, 8.49::DECIMAL),
    ('Trung Bình', 5.00::DECIMAL, 6.99::DECIMAL),
    ('Yếu', 0.00::DECIMAL, 4.99::DECIMAL)
) AS ranking(ten_xep_loai, min, max)
CROSS JOIN CAU_HINH_NAM_HOC year_config
WHERE year_config.nien_khoa = '2025-2026'
  AND NOT EXISTS (
      SELECT 1
      FROM KHUNG_XEP_LOAI existing
      WHERE existing.ten_xep_loai = ranking.ten_xep_loai
        AND existing.id_cau_hinh_nam_hoc = year_config.id_cau_hinh_nam_hoc
  );

-- =====================================================================
-- 4. LỚP HỌC THEO NIÊN KHÓA
-- =====================================================================
INSERT INTO LOP_HOC (ten_lop, id_khoi, id_cau_hinh_nam_hoc)
SELECT seed.ten_lop, k.id_khoi, year_config.id_cau_hinh_nam_hoc
FROM (VALUES
    ('Khai Tâm 1', 'Khai Tâm'),
    ('Khai Tâm 2', 'Khai Tâm'),
    ('Rước Lễ 1', 'Rước Lễ'),
    ('Thêm Sức 1', 'Thêm Sức'),
    ('Bao Đồng 1', 'Bao Đồng'),
    ('Vào Đời 1', 'Vào Đời 1')
) AS seed(ten_lop, ten_khoi)
JOIN KHOI k ON k.ten_khoi = seed.ten_khoi
JOIN CAU_HINH_NAM_HOC year_config ON year_config.nien_khoa = '2025-2026'
WHERE NOT EXISTS (
    SELECT 1
    FROM LOP_HOC existing
    WHERE existing.ten_lop = seed.ten_lop
      AND existing.id_cau_hinh_nam_hoc = year_config.id_cau_hinh_nam_hoc
);

INSERT INTO LOP_HOC (ten_lop, id_khoi, id_cau_hinh_nam_hoc)
SELECT seed.ten_lop, k.id_khoi, year_config.id_cau_hinh_nam_hoc
FROM (VALUES
    ('Khai Tâm 1', 'Khai Tâm'),
    ('Rước Lễ 1', 'Rước Lễ'),
    ('Thêm Sức 1', 'Thêm Sức')
) AS seed(ten_lop, ten_khoi)
JOIN KHOI k ON k.ten_khoi = seed.ten_khoi
JOIN CAU_HINH_NAM_HOC year_config ON year_config.nien_khoa = '2024-2025'
WHERE NOT EXISTS (
    SELECT 1
    FROM LOP_HOC existing
    WHERE existing.ten_lop = seed.ten_lop
      AND existing.id_cau_hinh_nam_hoc = year_config.id_cau_hinh_nam_hoc
);

-- =====================================================================
-- 5. GIÁO LÝ VIÊN
-- Trigger sẽ tự tạo tài khoản với mật khẩu là DDMMYYYY.
-- Tài khoản mẫu:
--   0901000001 / 15051995: Admin + BDH
--   0901000002 / 20101998: BDH
--   0901000003 / 11031997: Trưởng khối
--   0901000004 / 25081999: GLV
--   0901000005 / 02122000: GLV tạm nghỉ
-- =====================================================================
INSERT INTO GLV (ten_thanh, ho_va_ten_lot, ten, ngay_sinh, gioi_tinh, sdt, trang_thai)
SELECT seed.ten_thanh, seed.ho_va_ten_lot, seed.ten, seed.ngay_sinh::DATE, seed.gioi_tinh, seed.sdt, seed.trang_thai::enum_trang_thai_glv
FROM (VALUES
    ('Giuse', 'Nguyễn Văn', 'An', '1995-05-15', 'Nam', '0901000001', 'Đang hoạt động'),
    ('Têrêsa', 'Trần Thị', 'Bình', '1998-10-20', 'Nữ', '0901000002', 'Đang hoạt động'),
    ('Phêrô', 'Lê Minh', 'Cường', '1997-03-11', 'Nam', '0901000003', 'Đang hoạt động'),
    ('Maria', 'Phạm Ngọc', 'Dung', '1999-08-25', 'Nữ', '0901000004', 'Đang hoạt động'),
    ('Gioan', 'Vũ Thanh', 'Hùng', '2000-12-02', 'Nam', '0901000005', 'Tạm nghỉ')
) AS seed(ten_thanh, ho_va_ten_lot, ten, ngay_sinh, gioi_tinh, sdt, trang_thai)
WHERE NOT EXISTS (
    SELECT 1 FROM GLV existing WHERE existing.sdt = seed.sdt
);

-- Gán quyền Admin và BDH cho tài khoản đầu tiên.
UPDATE TAI_KHOAN account
SET is_admin = TRUE
FROM GLV teacher
WHERE account.id_glv = teacher.id_glv
  AND teacher.sdt = '0901000001';

INSERT INTO PHAN_CONG_BDH (id_glv, id_cau_hinh_nam_hoc)
SELECT teacher.id_glv, year_config.id_cau_hinh_nam_hoc
FROM GLV teacher
CROSS JOIN CAU_HINH_NAM_HOC year_config
WHERE teacher.sdt IN ('0901000001', '0901000002')
  AND year_config.nien_khoa = '2025-2026'
  AND NOT EXISTS (
      SELECT 1 FROM PHAN_CONG_BDH existing
      WHERE existing.id_glv = teacher.id_glv
        AND existing.id_cau_hinh_nam_hoc = year_config.id_cau_hinh_nam_hoc
  );

-- =====================================================================
-- 6. PHÂN CÔNG TRƯỞNG KHỐI VÀ GLV ĐỨNG LỚP
-- =====================================================================
INSERT INTO PHAN_CONG_TRUONG_KHOI (id_glv, id_khoi, id_cau_hinh_nam_hoc)
SELECT teacher.id_glv, k.id_khoi, year_config.id_cau_hinh_nam_hoc
FROM GLV teacher
JOIN KHOI k ON k.ten_khoi = 'Thêm Sức'
JOIN CAU_HINH_NAM_HOC year_config ON year_config.nien_khoa = '2025-2026'
WHERE teacher.sdt = '0901000003'
  AND NOT EXISTS (
      SELECT 1 FROM PHAN_CONG_TRUONG_KHOI existing
      WHERE existing.id_khoi = k.id_khoi
        AND existing.id_cau_hinh_nam_hoc = year_config.id_cau_hinh_nam_hoc
  );

INSERT INTO PHAN_CONG_GLV (id_glv, id_lop, id_cau_hinh_nam_hoc)
SELECT teacher.id_glv, class.id_lop, year_config.id_cau_hinh_nam_hoc
FROM (
    VALUES
        ('0901000001', 'Khai Tâm 1'),
        ('0901000002', 'Rước Lễ 1'),
        ('0901000003', 'Thêm Sức 1'),
        ('0901000004', 'Bao Đồng 1'),
        ('0901000005', 'Vào Đời 1')
) AS seed(sdt, ten_lop)
JOIN GLV teacher ON teacher.sdt = seed.sdt
JOIN CAU_HINH_NAM_HOC year_config ON year_config.nien_khoa = '2025-2026'
JOIN LOP_HOC class ON class.ten_lop = seed.ten_lop
    AND class.id_cau_hinh_nam_hoc = year_config.id_cau_hinh_nam_hoc
WHERE NOT EXISTS (
    SELECT 1 FROM PHAN_CONG_GLV existing
    WHERE existing.id_glv = teacher.id_glv
      AND existing.id_lop = class.id_lop
      AND existing.id_cau_hinh_nam_hoc = year_config.id_cau_hinh_nam_hoc
);

-- =====================================================================
-- 7. THIẾU NHI VÀ PHÂN LỚP
-- =====================================================================
INSERT INTO THIEU_NHI (ten_thanh, ho_va_ten_lot, ten, gioi_tinh, ngay_sinh, dia_chi, mstn)
SELECT seed.ten_thanh, seed.ho_va_ten_lot, seed.ten, seed.gioi_tinh, seed.ngay_sinh::DATE, seed.dia_chi, seed.mstn
FROM (VALUES
    ('Phêrô', 'Lê Văn', 'Cường', 'Nam', '2018-03-12', '12 Nguyễn Trãi', 'SD001'),
    ('Maria', 'Phạm Thị', 'Dung', 'Nữ', '2018-07-25', '24 Lê Lợi', 'SD002'),
    ('Gioan', 'Nguyễn Hoàng', 'Nam', 'Nam', '2017-01-05', '36 Trần Hưng Đạo', 'SD003'),
    ('Đaminh', 'Ngô Văn', 'E', 'Nam', '2019-01-01', '48 Hai Bà Trưng', 'SD004'),
    ('Anna', 'Đỗ Minh', 'Lan', 'Nữ', '2017-09-18', '50 Nguyễn Du', 'SD005'),
    ('Tôma', 'Bùi Quốc', 'Nam', 'Nam', '2016-11-22', '62 Pasteur', 'SD006'),
    ('Cecilia', 'Hoàng Thị', 'Mai', 'Nữ', '2016-04-09', '74 Võ Thị Sáu', 'SD007'),
    ('Mátthêu', 'Phan Đức', 'Long', 'Nam', '2015-08-14', '86 Cách Mạng Tháng Tám', 'SD008'),
    ('Clara', 'Võ Ngọc', 'Hà', 'Nữ', '2015-02-28', '98 Điện Biên Phủ', 'SD009'),
    ('Luca', 'Đặng Minh', 'Khoa', 'Nam', '2014-06-30', '10 Hoàng Văn Thụ', 'SD010'),
    ('Rosa', 'Nguyễn Thị', 'Vy', 'Nữ', '2014-10-16', '22 Lý Thường Kiệt', 'SD011'),
    ('Phaolô', 'Trương Gia', 'Bảo', 'Nam', '2013-12-05', '34 Phan Đình Phùng', 'SD012')
) AS seed(ten_thanh, ho_va_ten_lot, ten, gioi_tinh, ngay_sinh, dia_chi, mstn)
WHERE NOT EXISTS (
    SELECT 1 FROM THIEU_NHI existing WHERE existing.mstn = seed.mstn
);

INSERT INTO PHAN_LOP (id_tn, id_lop, id_cau_hinh_nam_hoc)
SELECT child.id_tn, class.id_lop, year_config.id_cau_hinh_nam_hoc
FROM (
    VALUES
        ('SD001', 'Khai Tâm 1'), ('SD002', 'Khai Tâm 1'),
        ('SD003', 'Khai Tâm 2'), ('SD004', 'Khai Tâm 2'),
        ('SD005', 'Rước Lễ 1'), ('SD006', 'Rước Lễ 1'),
        ('SD007', 'Thêm Sức 1'), ('SD008', 'Thêm Sức 1'),
        ('SD009', 'Bao Đồng 1'), ('SD010', 'Bao Đồng 1'),
        ('SD011', 'Vào Đời 1'), ('SD012', 'Vào Đời 1')
) AS seed(mstn, ten_lop)
JOIN THIEU_NHI child ON child.mstn = seed.mstn
JOIN CAU_HINH_NAM_HOC year_config ON year_config.nien_khoa = '2025-2026'
JOIN LOP_HOC class ON class.ten_lop = seed.ten_lop
    AND class.id_cau_hinh_nam_hoc = year_config.id_cau_hinh_nam_hoc
WHERE NOT EXISTS (
    SELECT 1 FROM PHAN_LOP existing
    WHERE existing.id_tn = child.id_tn
      AND existing.id_cau_hinh_nam_hoc = year_config.id_cau_hinh_nam_hoc
);

-- =====================================================================
-- 8. PHỤ HUYNH VÀ BÍ TÍCH
-- =====================================================================
INSERT INTO PHU_HUYNH (sdt, id_tn, ten_thanh_ph, ten_ph, moi_quan_he)
SELECT seed.sdt, child.id_tn, seed.ten_thanh_ph, seed.ten_ph, seed.moi_quan_he
FROM (VALUES
    ('0911000001', 'SD001', 'Giuse', 'Lê Văn Minh', 'Cha'),
    ('0911000002', 'SD002', 'Maria', 'Phạm Thị Hoa', 'Mẹ'),
    ('0911000003', 'SD003', 'Gioan', 'Nguyễn Hoàng Sơn', 'Cha'),
    ('0911000004', 'SD004', 'Anna', 'Ngô Thị Hạnh', 'Mẹ'),
    ('0911000005', 'SD005', 'Rosa', 'Đỗ Minh Tâm', 'Cha'),
    ('0911000006', 'SD006', 'Phaolô', 'Bùi Quốc Việt', 'Cha')
) AS seed(sdt, mstn, ten_thanh_ph, ten_ph, moi_quan_he)
JOIN THIEU_NHI child ON child.mstn = seed.mstn
WHERE NOT EXISTS (
    SELECT 1 FROM PHU_HUYNH existing
    WHERE existing.id_tn = child.id_tn AND existing.sdt = seed.sdt
);

INSERT INTO BI_TICH (loai_bi_tich, ngay_lanh_nhan, id_tn)
SELECT seed.loai_bi_tich, seed.ngay_lanh_nhan::DATE, child.id_tn
FROM (VALUES
    ('Rửa tội', '2018-04-01', 'SD001'),
    ('Rửa tội', '2018-08-10', 'SD002'),
    ('Thánh thể', '2025-05-11', 'SD005'),
    ('Thêm sức', '2025-06-15', 'SD007')
) AS seed(loai_bi_tich, ngay_lanh_nhan, mstn)
JOIN THIEU_NHI child ON child.mstn = seed.mstn
WHERE NOT EXISTS (
    SELECT 1 FROM BI_TICH existing
    WHERE existing.id_tn = child.id_tn AND existing.loai_bi_tich = seed.loai_bi_tich
);

-- =====================================================================
-- 9. ĐIỂM, ĐIỂM DANH VÀ TỔNG KẾT
-- =====================================================================
INSERT INTO DIEM_HOC_TAP (stt_bai_ktra, diem_so, id_tn, id_cau_hinh_nam_hoc)
SELECT seed.stt_bai_ktra, seed.diem_so, child.id_tn, year_config.id_cau_hinh_nam_hoc
FROM (VALUES
    (1, 8.50::DECIMAL, 'SD001'), (2, 9.00::DECIMAL, 'SD001'),
    (1, 7.00::DECIMAL, 'SD002'), (2, 8.00::DECIMAL, 'SD002'),
    (1, 6.50::DECIMAL, 'SD003'), (2, 7.50::DECIMAL, 'SD003'),
    (1, 9.50::DECIMAL, 'SD005'), (2, 9.00::DECIMAL, 'SD005'),
    (1, 5.50::DECIMAL, 'SD007'), (2, 6.00::DECIMAL, 'SD007')
) AS seed(stt_bai_ktra, diem_so, mstn)
JOIN THIEU_NHI child ON child.mstn = seed.mstn
JOIN CAU_HINH_NAM_HOC year_config ON year_config.nien_khoa = '2025-2026'
WHERE NOT EXISTS (
    SELECT 1 FROM DIEM_HOC_TAP existing
    WHERE existing.id_tn = child.id_tn
      AND existing.id_cau_hinh_nam_hoc = year_config.id_cau_hinh_nam_hoc
      AND existing.stt_bai_ktra = seed.stt_bai_ktra
);

INSERT INTO DIEM_KY_LUAT (thang, diem, id_tn, id_cau_hinh_nam_hoc)
SELECT seed.thang, seed.diem, child.id_tn, year_config.id_cau_hinh_nam_hoc
FROM (VALUES
    (1, 9.00::DECIMAL, 'SD001'), (2, 9.50::DECIMAL, 'SD001'),
    (1, 8.00::DECIMAL, 'SD002'), (2, 8.50::DECIMAL, 'SD002'),
    (1, 7.50::DECIMAL, 'SD003'), (2, 8.00::DECIMAL, 'SD003'),
    (1, 9.50::DECIMAL, 'SD005'), (2, 9.00::DECIMAL, 'SD005'),
    (1, 6.00::DECIMAL, 'SD007'), (2, 7.00::DECIMAL, 'SD007')
) AS seed(thang, diem, mstn)
JOIN THIEU_NHI child ON child.mstn = seed.mstn
JOIN CAU_HINH_NAM_HOC year_config ON year_config.nien_khoa = '2025-2026'
WHERE NOT EXISTS (
    SELECT 1 FROM DIEM_KY_LUAT existing
    WHERE existing.id_tn = child.id_tn
      AND existing.id_cau_hinh_nam_hoc = year_config.id_cau_hinh_nam_hoc
      AND existing.thang = seed.thang
);

INSERT INTO DIEM_CHUYEN_CAN (thang, tong_so_buoi, co_mat, diem_chuyen_can, id_tn, id_cau_hinh_nam_hoc)
SELECT seed.thang, seed.tong_so_buoi, seed.co_mat, seed.diem_chuyen_can, child.id_tn, year_config.id_cau_hinh_nam_hoc
FROM (VALUES
    (1, 10, 9, 9.00::DECIMAL, 'SD001'), (2, 10, 10, 10.00::DECIMAL, 'SD001'),
    (1, 10, 8, 8.00::DECIMAL, 'SD002'), (2, 10, 9, 9.00::DECIMAL, 'SD002'),
    (1, 10, 8, 8.00::DECIMAL, 'SD003'), (2, 10, 8, 8.00::DECIMAL, 'SD003'),
    (1, 10, 9, 9.00::DECIMAL, 'SD005'), (2, 10, 9, 9.00::DECIMAL, 'SD005'),
    (1, 10, 7, 7.00::DECIMAL, 'SD007'), (2, 10, 8, 8.00::DECIMAL, 'SD007')
) AS seed(thang, tong_so_buoi, co_mat, diem_chuyen_can, mstn)
JOIN THIEU_NHI child ON child.mstn = seed.mstn
JOIN CAU_HINH_NAM_HOC year_config ON year_config.nien_khoa = '2025-2026'
WHERE NOT EXISTS (
    SELECT 1 FROM DIEM_CHUYEN_CAN existing
    WHERE existing.id_tn = child.id_tn
      AND existing.id_cau_hinh_nam_hoc = year_config.id_cau_hinh_nam_hoc
      AND existing.thang = seed.thang
);

INSERT INTO DIEM_DANH (ngay_diem_danh, trang_thai, id_tn, id_lop)
SELECT seed.ngay_diem_danh::DATE, seed.trang_thai, child.id_tn, class.id_lop
FROM (VALUES
    ('2025-09-07', 'Có mặt', 'SD001', 'Khai Tâm 1'),
    ('2025-09-14', 'Đi sớm', 'SD001', 'Khai Tâm 1'),
    ('2025-09-07', 'Vắng phép', 'SD002', 'Khai Tâm 1'),
    ('2025-09-14', 'Có mặt', 'SD002', 'Khai Tâm 1'),
    ('2025-09-07', 'Có mặt', 'SD005', 'Rước Lễ 1'),
    ('2025-09-14', 'Vắng không phép', 'SD005', 'Rước Lễ 1')
) AS seed(ngay_diem_danh, trang_thai, mstn, ten_lop)
JOIN THIEU_NHI child ON child.mstn = seed.mstn
JOIN LOP_HOC class ON class.ten_lop = seed.ten_lop
JOIN CAU_HINH_NAM_HOC year_config ON year_config.nien_khoa = '2025-2026'
    AND class.id_cau_hinh_nam_hoc = year_config.id_cau_hinh_nam_hoc
WHERE NOT EXISTS (
    SELECT 1 FROM DIEM_DANH existing
    WHERE existing.ngay_diem_danh = seed.ngay_diem_danh::DATE
      AND existing.id_tn = child.id_tn
      AND existing.id_lop = class.id_lop
);

INSERT INTO TONG_KET_NAM_HOC
    (diem_hoc_tap, diem_chuyen_can, diem_ky_luat, diem_tong, tinh_trang, id_tn, id_lop, id_khung_xep_loai, id_cau_hinh_nam_hoc)
SELECT seed.diem_hoc_tap, seed.diem_chuyen_can, seed.diem_ky_luat, seed.diem_tong, seed.tinh_trang,
       child.id_tn, class.id_lop, ranking.id_khung_xep_loai, year_config.id_cau_hinh_nam_hoc
FROM (VALUES
    (8.75::DECIMAL, 9.50::DECIMAL, 9.25::DECIMAL, 9.06::DECIMAL, 'Đạt', 'SD001', 'Khai Tâm 1', 'Giỏi'),
    (7.50::DECIMAL, 8.50::DECIMAL, 8.25::DECIMAL, 7.94::DECIMAL, 'Đạt', 'SD002', 'Khai Tâm 1', 'Khá'),
    (7.00::DECIMAL, 8.00::DECIMAL, 7.75::DECIMAL, 7.31::DECIMAL, 'Đạt', 'SD003', 'Khai Tâm 2', 'Khá'),
    (9.25::DECIMAL, 9.00::DECIMAL, 9.25::DECIMAL, 9.19::DECIMAL, 'Đạt', 'SD005', 'Rước Lễ 1', 'Giỏi'),
    (5.75::DECIMAL, 7.50::DECIMAL, 6.50::DECIMAL, 6.50::DECIMAL, 'Đạt', 'SD007', 'Thêm Sức 1', 'Trung Bình')
) AS seed(diem_hoc_tap, diem_chuyen_can, diem_ky_luat, diem_tong, tinh_trang, mstn, ten_lop, ten_xep_loai)
JOIN THIEU_NHI child ON child.mstn = seed.mstn
JOIN CAU_HINH_NAM_HOC year_config ON year_config.nien_khoa = '2025-2026'
JOIN LOP_HOC class ON class.ten_lop = seed.ten_lop
    AND class.id_cau_hinh_nam_hoc = year_config.id_cau_hinh_nam_hoc
JOIN KHUNG_XEP_LOAI ranking ON ranking.ten_xep_loai = seed.ten_xep_loai
    AND ranking.id_cau_hinh_nam_hoc = year_config.id_cau_hinh_nam_hoc
WHERE NOT EXISTS (
    SELECT 1 FROM TONG_KET_NAM_HOC existing
    WHERE existing.id_tn = child.id_tn
      AND existing.id_cau_hinh_nam_hoc = year_config.id_cau_hinh_nam_hoc
);

-- =====================================================================
-- 10. AUDIT LOGS
-- =====================================================================
INSERT INTO audit_logs (id_tk, action, status)
SELECT account.id_tk, seed.action, seed.status
FROM (VALUES
    ('Đăng nhập vào hệ thống', 'Thành công'),
    ('Cập nhật phân quyền GLV', 'Thành công'),
    ('Phân công GLV vào lớp Khai Tâm 1', 'Thành công'),
    ('Cập nhật điểm tổng kết năm học', 'Thành công')
) AS seed(action, status)
JOIN TAI_KHOAN account ON account.username = '0901000001'
WHERE NOT EXISTS (
    SELECT 1 FROM audit_logs existing
    WHERE existing.id_tk = account.id_tk
      AND existing.action = seed.action
);

COMMIT;

-- Kiểm tra nhanh dữ liệu seed
SELECT 'CAU_HINH_NAM_HOC' AS bang, COUNT(*) AS so_luong FROM CAU_HINH_NAM_HOC
UNION ALL SELECT 'KHOI', COUNT(*) FROM KHOI
UNION ALL SELECT 'LOP_HOC', COUNT(*) FROM LOP_HOC
UNION ALL SELECT 'GLV', COUNT(*) FROM GLV
UNION ALL SELECT 'TAI_KHOAN', COUNT(*) FROM TAI_KHOAN
UNION ALL SELECT 'THIEU_NHI', COUNT(*) FROM THIEU_NHI
UNION ALL SELECT 'PHAN_LOP', COUNT(*) FROM PHAN_LOP
UNION ALL SELECT 'PHAN_CONG_GLV', COUNT(*) FROM PHAN_CONG_GLV
UNION ALL SELECT 'PHAN_CONG_TRUONG_KHOI', COUNT(*) FROM PHAN_CONG_TRUONG_KHOI
UNION ALL SELECT 'DIEM_HOC_TAP', COUNT(*) FROM DIEM_HOC_TAP
UNION ALL SELECT 'DIEM_KY_LUAT', COUNT(*) FROM DIEM_KY_LUAT
UNION ALL SELECT 'DIEM_CHUYEN_CAN', COUNT(*) FROM DIEM_CHUYEN_CAN
UNION ALL SELECT 'DIEM_DANH', COUNT(*) FROM DIEM_DANH
UNION ALL SELECT 'TONG_KET_NAM_HOC', COUNT(*) FROM TONG_KET_NAM_HOC
UNION ALL SELECT 'PHU_HUYNH', COUNT(*) FROM PHU_HUYNH
UNION ALL SELECT 'BI_TICH', COUNT(*) FROM BI_TICH
UNION ALL SELECT 'audit_logs', COUNT(*) FROM audit_logs;
