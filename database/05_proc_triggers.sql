-- A. Trigger tự động sinh Mã số thiếu nhi (MSTN) dạng: YY + STT (4 chữ số từ id_tn) + Giới tính (A/B)
CREATE OR REPLACE FUNCTION fn_tu_dong_tao_mstn_after()
RETURNS TRIGGER AS $$
DECLARE
    v_nam_hien_tai VARCHAR(2);
    v_id_hex VARCHAR(3);
    v_tuoi INT;
    v_ky_tu_nganh VARCHAR(1);
    v_mstn_moi VARCHAR(20);
BEGIN
    IF NEW.mstn IS NULL OR NEW.mstn = '' THEN
        v_nam_hien_tai := TO_CHAR(CURRENT_DATE, 'YY');
        v_id_hex := UPPER(LPAD(to_hex(NEW.id_tn), 3, '0'));
        v_tuoi := EXTRACT(YEAR FROM AGE(CURRENT_DATE, NEW.ngay_sinh));

        IF v_tuoi BETWEEN 6 AND 8 THEN
            v_ky_tu_nganh := 'A'; -- Ấu
        ELSIF v_tuoi BETWEEN 9 AND 11 THEN
            v_ky_tu_nganh := 'T'; -- Thiếu
        ELSIF v_tuoi BETWEEN 12 AND 14 THEN
            v_ky_tu_nganh := 'N'; -- Nghĩa
        ELSIF v_tuoi BETWEEN 15 AND 17 THEN
            v_ky_tu_nganh := 'H'; -- Hiệp
        ELSE
            v_ky_tu_nganh := 'O'; -- Ngoài phạm vi
        END IF;

        v_mstn_moi := v_nam_hien_tai || v_id_hex || v_ky_tu_nganh;

        UPDATE THIEU_NHI
        SET mstn = v_mstn_moi
        WHERE id_tn = NEW.id_tn;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sinh_mstn_thieu_nhi ON THIEU_NHI;
CREATE TRIGGER trg_sinh_mstn_thieu_nhi
AFTER INSERT ON THIEU_NHI
FOR EACH ROW
EXECUTE FUNCTION fn_tu_dong_tao_mstn_after();

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- B. Trigger tự động tạo tài khoản khi thêm Giáo lý viên mới
CREATE OR REPLACE FUNCTION fn_tu_dong_tao_tai_khoan_glv()
RETURNS TRIGGER AS $$
DECLARE
    raw_password TEXT;
BEGIN
    raw_password := COALESCE(TO_CHAR(NEW.ngay_sinh::DATE, 'DDMMYYYY'), '123456');

    INSERT INTO TAI_KHOAN (username, password_hash, is_admin, id_glv)
    VALUES (
        NEW.sdt,
        crypt(raw_password, gen_salt('bf')),
        FALSE,
        NEW.id_glv
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tao_tai_khoan_glv ON GLV;
CREATE TRIGGER trg_tao_tai_khoan_glv
AFTER INSERT ON GLV
FOR EACH ROW
EXECUTE FUNCTION fn_tu_dong_tao_tai_khoan_glv();


-- C. Trigger kiểm tra không cho phép xếp một thiếu nhi vào 2 lớp trong cùng 1 cấu hình năm học
CREATE OR REPLACE FUNCTION fn_check_trung_lop_cau_hinh()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM PHAN_LOP 
        WHERE id_tn = NEW.id_tn 
          AND id_cau_hinh_nam_hoc = NEW.id_cau_hinh_nam_hoc 
          AND id_lop <> COALESCE(NEW.id_lop, -1)
    ) THEN
        RAISE EXCEPTION 'Thiếu nhi có ID % đã được xếp vào một lớp khác trong cùng một năm học!', NEW.id_tn;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_phan_lop ON PHAN_LOP;
CREATE TRIGGER trg_check_phan_lop
BEFORE INSERT OR UPDATE ON PHAN_LOP
FOR EACH ROW
EXECUTE FUNCTION fn_check_trung_lop_cau_hinh();

-- A. Thủ tục tự động tổng hợp điểm chuyên cần tháng từ bảng điểm danh
CREATE OR REPLACE PROCEDURE sp_tinh_chuyen_can_thang(
    p_id_tn INT,
    p_thang INT,
    p_id_cau_hinh_nam_hoc INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_tong_buoi INT := 0;
    v_so_buoi_hien_dien INT := 0;
    v_diem_cc DECIMAL(4,2) := 0;
BEGIN
    SELECT COUNT(*), 
           SUM(CASE WHEN trang_thai IN ('Có mặt', 'Đi sớm') THEN 1 ELSE 0 END)
    INTO v_tong_buoi, v_so_buoi_hien_dien
    FROM DIEM_DANH
    WHERE id_tn = p_id_tn 
      AND id_cau_hinh_nam_hoc = p_id_cau_hinh_nam_hoc
      AND EXTRACT(MONTH FROM ngay_diem_danh) = p_thang;

    IF v_tong_buoi = 0 THEN
        RETURN;
    END IF;

    v_diem_cc := ROUND((CAST(v_so_buoi_hien_dien AS DECIMAL) / v_tong_buoi) * 10, 2);

    IF EXISTS (SELECT 1 FROM DIEM_CHUYEN_CAN WHERE id_tn = p_id_tn AND thang = p_thang AND id_cau_hinh_nam_hoc = p_id_cau_hinh_nam_hoc) THEN
        UPDATE DIEM_CHUYEN_CAN 
        SET tong_so_buoi = v_tong_buoi,
            co_mat = v_so_buoi_hien_dien,
            diem_chuyen_can = v_diem_cc
        WHERE id_tn = p_id_tn AND thang = p_thang AND id_cau_hinh_nam_hoc = p_id_cau_hinh_nam_hoc;
    ELSE
        INSERT INTO DIEM_CHUYEN_CAN (thang, tong_so_buoi, co_mat, diem_chuyen_can, id_cau_hinh_nam_hoc, id_tn)
        VALUES (p_thang, v_tong_buoi, v_so_buoi_hien_dien, v_diem_cc, p_id_cau_hinh_nam_hoc, p_id_tn);
    END IF;
END;
$$;


-- B. Thủ tục tính điểm tổng kết năm học dựa trên ID cấu hình năm học
CREATE OR REPLACE PROCEDURE sp_tinh_tong_ket_nam_hoc(
    p_id_cau_hinh_nam_hoc INT,
    p_id_lop INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    r_tn RECORD;
    v_hs_chuyen_can DECIMAL(3,2);
    v_hs_hoc_tap DECIMAL(3,2);
    v_hs_ky_luat DECIMAL(3,2);
    v_tong_he_so DECIMAL(3,2);
    
    v_dtb_hoc_tap DECIMAL(4,2);
    v_dtb_chuyen_can DECIMAL(4,2);
    v_dtb_ky_luat DECIMAL(4,2);
    v_diem_tong DECIMAL(4,2);
    v_tinh_trang VARCHAR(50);
    v_id_khung INT;
BEGIN
    -- Lấy hệ số từ bảng cấu hình năm học
    SELECT trong_so_diem_chuyen_can, trong_so_hoc_tap, trong_so_ky_luat
    INTO v_hs_chuyen_can, v_hs_hoc_tap, v_hs_ky_luat
    FROM CAU_HINH_NAM_HOC
    WHERE id_cau_hinh_nam_hoc = p_id_cau_hinh_nam_hoc;

    IF v_hs_chuyen_can IS NULL THEN
        v_hs_chuyen_can := 1;
        v_hs_hoc_tap := 2;
        v_hs_ky_luat := 1;
        v_tong_he_so := 4;
    ELSE
        v_tong_he_so := v_hs_chuyen_can + v_hs_hoc_tap + v_hs_ky_luat;
    END IF;

    -- Duyệt qua từng thiếu nhi trong lớp
    FOR r_tn IN 
        SELECT id_tn FROM PHAN_LOP WHERE id_lop = p_id_lop AND id_cau_hinh_nam_hoc = p_id_cau_hinh_nam_hoc
    LOOP
        SELECT COALESCE(AVG(diem_so), 0) INTO v_dtb_hoc_tap
        FROM DIEM_HOC_TAP WHERE id_tn = r_tn.id_tn AND id_cau_hinh_nam_hoc = p_id_cau_hinh_nam_hoc;

        SELECT COALESCE(AVG(diem_chuyen_can), 0) INTO v_dtb_chuyen_can
        FROM DIEM_CHUYEN_CAN WHERE id_tn = r_tn.id_tn AND id_cau_hinh_nam_hoc = p_id_cau_hinh_nam_hoc;

        SELECT COALESCE(AVG(diem), 0) INTO v_dtb_ky_luat
        FROM DIEM_KY_LUAT WHERE id_tn = r_tn.id_tn AND id_cau_hinh_nam_hoc = p_id_cau_hinh_nam_hoc;

        IF v_tong_he_so > 0 THEN
            v_diem_tong := ROUND(
                ((v_dtb_chuyen_can * v_hs_chuyen_can) + (v_dtb_hoc_tap * v_hs_hoc_tap) + (v_dtb_ky_luat * v_hs_ky_luat)) / v_tong_he_so, 
                2
            );
        ELSE
            v_diem_tong := ROUND((v_dtb_chuyen_can + v_dtb_hoc_tap + v_dtb_ky_luat) / 3, 2);
        END IF;

        IF v_diem_tong >= 5.0 
           AND v_dtb_hoc_tap >= 5.0 
           AND v_dtb_chuyen_can >= 5.0 
           AND v_dtb_ky_luat >= 5.0 THEN
            v_tinh_trang := 'Đạt';
        ELSE
            v_tinh_trang := 'Chưa đạt';
        END IF;

        SELECT id_khung_xep_loai INTO v_id_khung
        FROM KHUNG_XEP_LOAI
        WHERE id_cau_hinh_nam_hoc = p_id_cau_hinh_nam_hoc AND v_diem_tong BETWEEN min AND max
        LIMIT 1;

        IF EXISTS (SELECT 1 FROM TONG_KET_NAM_HOC WHERE id_tn = r_tn.id_tn AND id_lop = p_id_lop AND id_cau_hinh_nam_hoc = p_id_cau_hinh_nam_hoc) THEN
            UPDATE TONG_KET_NAM_HOC 
            SET diem_hoc_tap = v_dtb_hoc_tap,
                diem_chuyen_can = v_dtb_chuyen_can,
                diem_ky_luat = v_dtb_ky_luat,
                diem_tong = v_diem_tong,
                tinh_trang = v_tinh_trang,
                id_khung_xep_loai = v_id_khung
            WHERE id_tn = r_tn.id_tn AND id_lop = p_id_lop AND id_cau_hinh_nam_hoc = p_id_cau_hinh_nam_hoc;
        ELSE
            INSERT INTO TONG_KET_NAM_HOC (id_cau_hinh_nam_hoc, diem_hoc_tap, diem_chuyen_can, diem_ky_luat, diem_tong, tinh_trang, id_tn, id_lop, id_khung_xep_loai)
            VALUES (p_id_cau_hinh_nam_hoc, v_dtb_hoc_tap, v_dtb_chuyen_can, v_dtb_ky_luat, v_diem_tong, v_tinh_trang, r_tn.id_tn, p_id_lop, v_id_khung);
        END IF;
    END LOOP;
END;
$$;


-- C. Thủ tục cập nhật kết quả sau hè
CREATE OR REPLACE PROCEDURE sp_cap_nhat_ket_qua_he(
    p_id_tong_ket INT,
    p_ket_qua_moi VARCHAR(50)
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE TONG_KET_NAM_HOC
    SET tinh_trang = p_ket_qua_moi
    WHERE id_tong_ket_nam_hoc = p_id_tong_ket;
END;
$$;


-- D. Thủ tục chuyển giao sang niên khóa mới (Dùng ID cấu hình thay vì chuỗi)
CREATE OR REPLACE PROCEDURE sp_chuyen_giao_nien_khoa(
    p_id_cau_hinh_cu INT,
    p_id_cau_hinh_moi INT
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- 1. ĐẨY LÊN LỚP (Dành cho các em đạt và STT khối < 11)
    INSERT INTO PHAN_LOP (id_cau_hinh_nam_hoc, id_tn, id_lop)
    SELECT 
        p_id_cau_hinh_moi, 
        pl.id_tn, 
        l_moi.id_lop
    FROM PHAN_LOP pl
    JOIN LOP_HOC l_cu ON pl.id_lop = l_cu.id_lop
    JOIN KHOI k_cu ON l_cu.id_khoi = k_cu.id_khoi
    JOIN TONG_KET_NAM_HOC tk ON pl.id_tn = tk.id_tn AND pl.id_cau_hinh_nam_hoc = tk.id_cau_hinh_nam_hoc AND pl.id_lop = tk.id_lop
    JOIN KHOI k_moi ON k_moi.stt = k_cu.stt + 1
    JOIN LOP_HOC l_moi ON l_moi.id_khoi = k_moi.id_khoi AND l_moi.id_cau_hinh_nam_hoc = p_id_cau_hinh_moi
    WHERE pl.id_cau_hinh_nam_hoc = p_id_cau_hinh_cu
      AND tk.tinh_trang = 'Đạt'
      AND k_cu.stt < 11
      AND NOT EXISTS (
          SELECT 1 FROM PHAN_LOP p_check 
          WHERE p_check.id_tn = pl.id_tn AND p_check.id_cau_hinh_nam_hoc = p_id_cau_hinh_moi
      );

    -- 2. Ở LẠI LỚP (Dành cho các em chưa đạt)
    INSERT INTO PHAN_LOP (id_cau_hinh_nam_hoc, id_tn, id_lop)
    SELECT 
        p_id_cau_hinh_moi, 
        pl.id_tn, 
        l_moi.id_lop
    FROM PHAN_LOP pl
    JOIN LOP_HOC l_cu ON pl.id_lop = l_cu.id_lop
    JOIN KHOI k_cu ON l_cu.id_khoi = k_cu.id_khoi
    JOIN TONG_KET_NAM_HOC tk ON pl.id_tn = tk.id_tn AND pl.id_cau_hinh_nam_hoc = tk.id_cau_hinh_nam_hoc AND pl.id_lop = tk.id_lop
    JOIN LOP_HOC l_moi ON l_moi.id_khoi = k_cu.id_khoi AND l_moi.id_cau_hinh_nam_hoc = p_id_cau_hinh_moi
    WHERE pl.id_cau_hinh_nam_hoc = p_id_cau_hinh_cu
      AND tk.tinh_trang = 'Chưa đạt'
      AND NOT EXISTS (
          SELECT 1 FROM PHAN_LOP p_check 
          WHERE p_check.id_tn = pl.id_tn AND p_check.id_cau_hinh_nam_hoc = p_id_cau_hinh_moi
      );
END;
$$;