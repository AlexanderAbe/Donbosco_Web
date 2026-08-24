--
-- PostgreSQL database dump
--


-- Dumped from database version 18.6 (Debian 18.6-1.pgdg13+2)
-- Dumped by pg_dump version 18.6 (Debian 18.6-1.pgdg13+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: enum_bi_tich; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_bi_tich AS ENUM (
    'Rửa tội',
    'Giải tội',
    'Thánh thể',
    'Thêm sức'
);


ALTER TYPE public.enum_bi_tich OWNER TO postgres;

--
-- Name: enum_diem_danh; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_diem_danh AS ENUM (
    'Có mặt',
    'Đi sớm',
    'Vắng phép',
    'Vắng không phép'
);


ALTER TYPE public.enum_diem_danh OWNER TO postgres;

--
-- Name: enum_gioi_tinh; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_gioi_tinh AS ENUM (
    'Nam',
    'Nữ'
);


ALTER TYPE public.enum_gioi_tinh OWNER TO postgres;

--
-- Name: enum_ket_qua; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_ket_qua AS ENUM (
    'Lên lớp',
    'Ở lại lớp'
);


ALTER TYPE public.enum_ket_qua OWNER TO postgres;

--
-- Name: enum_trang_thai_tn; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_trang_thai_tn AS ENUM (
    'Đang học',
    'Chuyển xứ',
    'Nghỉ học'
);


ALTER TYPE public.enum_trang_thai_tn OWNER TO postgres;

--
-- Name: enum_moi_quan_he; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_moi_quan_he AS ENUM (
    'Cha',
    'Mẹ',
    'Ông',
    'Bà',
    'Cô',
    'Chú',
    'Bác',
    'Người giám hộ'
);


ALTER TYPE public.enum_moi_quan_he OWNER TO postgres;

--
-- Name: enum_ten_xep_loai; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_ten_xep_loai AS ENUM (
    'Xuất sắc',
    'Giỏi',
    'Khá',
    'Trung Bình',
    'Yếu'
);


ALTER TYPE public.enum_ten_xep_loai OWNER TO postgres;

--
-- Name: fn_check_trung_lop_nien_khoa(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_check_trung_lop_nien_khoa() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    IF EXISTS (

        SELECT 1 FROM PHAN_LOP

        WHERE id_tn = NEW.id_tn

          AND nien_khoa = NEW.nien_khoa

          AND id_lop <> COALESCE(NEW.id_lop, -1)

    ) THEN

        RAISE EXCEPTION 'Thiếu nhi có ID % đã được xếp vào một lớp khác trong niên khóa %!', NEW.id_tn, NEW.nien_khoa;

    END IF;

    RETURN NEW;

END;

$$;


ALTER FUNCTION public.fn_check_trung_lop_nien_khoa() OWNER TO postgres;

--
-- Name: fn_tu_dong_tao_mstn_after(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_tu_dong_tao_mstn_after() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

DECLARE

    v_nam_hoc VARCHAR(2);

    v_ky_tu_gioi_tinh VARCHAR(1);

    v_mstn_moi VARCHAR(30);

BEGIN

    IF NEW.mstn IS NULL OR NEW.mstn = '' THEN

        v_nam_hoc := TO_CHAR(CURRENT_DATE, 'YY');



        IF NEW.gioi_tinh = 'Nam' THEN

            v_ky_tu_gioi_tinh := 'A';

        ELSE

            v_ky_tu_gioi_tinh := 'B';

        END IF;



        v_mstn_moi := v_nam_hoc || LPAD(CAST(NEW.id_tn AS TEXT), 4, '0') || v_ky_tu_gioi_tinh;



        UPDATE THIEU_NHI

        SET mstn = v_mstn_moi

        WHERE id_tn = NEW.id_tn;

    END IF;



    RETURN NEW;

END;

$$;


ALTER FUNCTION public.fn_tu_dong_tao_mstn_after() OWNER TO postgres;

--
-- Name: fn_tu_dong_tao_tai_khoan_glv(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_tu_dong_tao_tai_khoan_glv() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    INSERT INTO TAI_KHOAN (username, password_hash, is_admin, id_glv)

    VALUES (

        NEW.sdt,

        -- Lấy ngày sinh chuyển thành chuỗi DDMMYYYY (Ví dụ: 15/05/1995 -> '15051995')

        COALESCE(TO_CHAR(NEW.ngay_sinh::DATE, 'DDMMYYYY'), '123456'),

        FALSE,

        NEW.id_glv

    );

    RETURN NEW;

END;

$$;


ALTER FUNCTION public.fn_tu_dong_tao_tai_khoan_glv() OWNER TO postgres;

--
-- Name: sp_cap_nhat_ket_qua_he(integer, character varying); Type: PROCEDURE; Schema: public; Owner: postgres
--

CREATE PROCEDURE public.sp_cap_nhat_ket_qua_he(IN p_id_tong_ket integer, IN p_ket_qua_moi character varying)
    LANGUAGE plpgsql
    AS $$

BEGIN

    UPDATE TONG_KET_NAM_HOC

    SET tinh_trang = p_ket_qua_moi::public.enum_ket_qua

    WHERE id_tong_ket_nam_hoc = p_id_tong_ket;

END;

$$;


ALTER PROCEDURE public.sp_cap_nhat_ket_qua_he(IN p_id_tong_ket integer, IN p_ket_qua_moi character varying) OWNER TO postgres;

--
-- Name: sp_chuyen_giao_nien_khoa(character varying, character varying); Type: PROCEDURE; Schema: public; Owner: postgres
--

CREATE PROCEDURE public.sp_chuyen_giao_nien_khoa(IN p_nien_khoa_cu character varying, IN p_nien_khoa_moi character varying)
    LANGUAGE plpgsql
    AS $$

BEGIN

    -- 1. ĐẨY LÊN LỚP (Dành cho các em lên lớp và STT khối < 11)

    INSERT INTO PHAN_LOP (nien_khoa, id_tn, id_lop)

    SELECT

        p_nien_khoa_moi,

        pl.id_tn,

        l_moi.id_lop

    FROM PHAN_LOP pl

    JOIN LOP_HOC l_cu ON pl.id_lop = l_cu.id_lop

    JOIN KHOI k_cu ON l_cu.id_khoi = k_cu.id_khoi

    JOIN TONG_KET_NAM_HOC tk ON pl.id_tn = tk.id_tn AND pl.nien_khoa = tk.nien_khoa AND pl.id_lop = tk.id_lop

    JOIN KHOI k_moi ON k_moi.stt = k_cu.stt + 1

    JOIN LOP_HOC l_moi ON l_moi.id_khoi = k_moi.id_khoi AND l_moi.nien_khoa = p_nien_khoa_moi

    WHERE pl.nien_khoa = p_nien_khoa_cu

    AND tk.tinh_trang = 'Lên lớp'

      AND k_cu.stt < 11

      AND NOT EXISTS (

          SELECT 1 FROM PHAN_LOP p_check

          WHERE p_check.id_tn = pl.id_tn AND p_check.nien_khoa = p_nien_khoa_moi

      );



    -- 2. Ở LẠI LỚP (Dành cho các em ở lại lớp, học lại khối cũ)

    INSERT INTO PHAN_LOP (nien_khoa, id_tn, id_lop)

    SELECT

        p_nien_khoa_moi,

        pl.id_tn,

        l_moi.id_lop

    FROM PHAN_LOP pl

    JOIN LOP_HOC l_cu ON pl.id_lop = l_cu.id_lop

    JOIN KHOI k_cu ON l_cu.id_khoi = k_cu.id_khoi

    JOIN TONG_KET_NAM_HOC tk ON pl.id_tn = tk.id_tn AND pl.nien_khoa = tk.nien_khoa AND pl.id_lop = tk.id_lop

    JOIN LOP_HOC l_moi ON l_moi.id_khoi = k_cu.id_khoi AND l_moi.nien_khoa = p_nien_khoa_moi

    WHERE pl.nien_khoa = p_nien_khoa_cu

    AND tk.tinh_trang = 'Ở lại lớp'

      AND NOT EXISTS (

          SELECT 1 FROM PHAN_LOP p_check

          WHERE p_check.id_tn = pl.id_tn AND p_check.nien_khoa = p_nien_khoa_moi

      );

END;

$$;


ALTER PROCEDURE public.sp_chuyen_giao_nien_khoa(IN p_nien_khoa_cu character varying, IN p_nien_khoa_moi character varying) OWNER TO postgres;

--
-- Name: sp_tinh_chuyen_can_thang(integer, integer, character varying); Type: PROCEDURE; Schema: public; Owner: postgres
--

CREATE PROCEDURE public.sp_tinh_chuyen_can_thang(IN p_id_tn integer, IN p_thang integer, IN p_nien_khoa character varying)
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

      AND EXTRACT(MONTH FROM ngay_diem_danh) = p_thang;



    IF v_tong_buoi = 0 THEN

        RETURN;

    END IF;



    v_diem_cc := ROUND((CAST(v_so_buoi_hien_dien AS DECIMAL) / v_tong_buoi) * 10, 2);



    IF EXISTS (SELECT 1 FROM DIEM_CHUYEN_CAN WHERE id_tn = p_id_tn AND thang = p_thang AND nien_khoa = p_nien_khoa) THEN

        UPDATE DIEM_CHUYEN_CAN

        SET tong_so_buoi = v_tong_buoi,

            co_mat = v_so_buoi_hien_dien,

            diem_chuyen_can = v_diem_cc

        WHERE id_tn = p_id_tn AND thang = p_thang AND nien_khoa = p_nien_khoa;

    ELSE

        INSERT INTO DIEM_CHUYEN_CAN (thang, tong_so_buoi, co_mat, diem_chuyen_can, nien_khoa, id_tn)

        VALUES (p_thang, v_tong_buoi, v_so_buoi_hien_dien, v_diem_cc, p_nien_khoa, p_id_tn);

    END IF;

END;

$$;


ALTER PROCEDURE public.sp_tinh_chuyen_can_thang(IN p_id_tn integer, IN p_thang integer, IN p_nien_khoa character varying) OWNER TO postgres;

--
-- Name: sp_tinh_tong_ket_nam_hoc(character varying, integer); Type: PROCEDURE; Schema: public; Owner: postgres
--

CREATE PROCEDURE public.sp_tinh_tong_ket_nam_hoc(IN p_nien_khoa character varying, IN p_id_lop integer)
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

    WHERE nien_khoa = p_nien_khoa

    LIMIT 1;



    -- Giá trị mặc định phòng hờ

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

        SELECT id_tn FROM PHAN_LOP WHERE id_lop = p_id_lop AND nien_khoa = p_nien_khoa

    LOOP

        -- Lấy điểm trung bình các thành phần

        SELECT COALESCE(AVG(diem_so), 0) INTO v_dtb_hoc_tap

        FROM DIEM_HOC_TAP WHERE id_tn = r_tn.id_tn AND nien_khoa = p_nien_khoa;



        SELECT COALESCE(AVG(diem_chuyen_can), 0) INTO v_dtb_chuyen_can

        FROM DIEM_CHUYEN_CAN WHERE id_tn = r_tn.id_tn AND nien_khoa = p_nien_khoa;



        SELECT COALESCE(AVG(diem), 0) INTO v_dtb_ky_luat

        FROM DIEM_KY_LUAT WHERE id_tn = r_tn.id_tn AND nien_khoa = p_nien_khoa;



        -- Công thức tính điểm tổng kết có xét trọng số (Chuyên cần*1 + Học tập*2 + Kỷ luật*1 / Tổng hệ số)

        IF v_tong_he_so > 0 THEN

            v_diem_tong := ROUND(

                ((v_dtb_chuyen_can * v_hs_chuyen_can) + (v_dtb_hoc_tap * v_hs_hoc_tap) + (v_dtb_ky_luat * v_hs_ky_luat)) / v_tong_he_so,

                2

            );

        ELSE

            v_diem_tong := ROUND((v_dtb_chuyen_can + v_dtb_hoc_tap + v_dtb_ky_luat) / 3, 2);

        END IF;



        -- KIỂM TRA ĐIỀU KIỆN LÊN LỚP: Điểm tổng >= 5.0 VÀ KHÔNG CÓ CỘT NÀO DƯỚI 5.0

        IF v_diem_tong >= 5.0

           AND v_dtb_hoc_tap >= 5.0

           AND v_dtb_chuyen_can >= 5.0

           AND v_dtb_ky_luat >= 5.0 THEN

            v_tinh_trang := 'Lên lớp';

        ELSE

            v_tinh_trang := 'Ở lại lớp';

        END IF;



        -- Xác định khung xếp loại tương ứng với điểm tổng

        SELECT id_khung_xep_loai INTO v_id_khung

        FROM KHUNG_XEP_LOAI

        WHERE nien_khoa = p_nien_khoa AND v_diem_tong BETWEEN min AND max

        LIMIT 1;



        -- Lưu hoặc cập nhật kết quả vào bảng tổng kết năm học

        IF EXISTS (SELECT 1 FROM TONG_KET_NAM_HOC WHERE id_tn = r_tn.id_tn AND id_lop = p_id_lop AND nien_khoa = p_nien_khoa) THEN

            UPDATE TONG_KET_NAM_HOC

            SET diem_hoc_tap = v_dtb_hoc_tap,

                diem_chuyen_can = v_dtb_chuyen_can,

                diem_ky_luat = v_dtb_ky_luat,

                diem_tong = v_diem_tong,

                tinh_trang = v_tinh_trang,

                id_khung_xep_loai = v_id_khung

            WHERE id_tn = r_tn.id_tn AND id_lop = p_id_lop AND nien_khoa = p_nien_khoa;

        ELSE

            INSERT INTO TONG_KET_NAM_HOC (nien_khoa, diem_hoc_tap, diem_chuyen_can, diem_ky_luat, diem_tong, tinh_trang, id_tn, id_lop, id_khung_xep_loai)

            VALUES (p_nien_khoa, v_dtb_hoc_tap, v_dtb_chuyen_can, v_dtb_ky_luat, v_diem_tong, v_tinh_trang, r_tn.id_tn, p_id_lop, v_id_khung);

        END IF;

    END LOOP;

END;

$$;


ALTER PROCEDURE public.sp_tinh_tong_ket_nam_hoc(IN p_nien_khoa character varying, IN p_id_lop integer) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: bi_tich; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bi_tich (
    id_bi_tich integer NOT NULL,
    loai_bi_tich character varying(50),
    ngay_lanh_nhan date,
    id_tn integer,
    CONSTRAINT check_ngay_lanh_nhan_hop_le CHECK ((ngay_lanh_nhan <= CURRENT_DATE))
);


ALTER TABLE public.bi_tich OWNER TO postgres;

--
-- Name: bi_tich_id_bi_tich_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.bi_tich ALTER COLUMN id_bi_tich ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.bi_tich_id_bi_tich_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: cau_hinh_nam_hoc; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cau_hinh_nam_hoc (
    id_cau_hinh_nam_hoc integer NOT NULL,
    nien_khoa character varying(20),
    trong_so_hoc_tap numeric(3,2),
    trong_so_ky_luat numeric(3,2),
    trong_so_diem_chuyen_can numeric(3,2),
    so_luong_bai_ktra integer,
    ngay_tao date,
    CONSTRAINT check_nk_cau_hinh CHECK (((nien_khoa)::text ~ '^\d{4}-\d{4}$'::text))
);


ALTER TABLE public.cau_hinh_nam_hoc OWNER TO postgres;

--
-- Name: cau_hinh_nam_hoc_id_cau_hinh_nam_hoc_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.cau_hinh_nam_hoc ALTER COLUMN id_cau_hinh_nam_hoc ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.cau_hinh_nam_hoc_id_cau_hinh_nam_hoc_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: diem_chuyen_can; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.diem_chuyen_can (
    id_chuyen_can integer NOT NULL,
    thang integer,
    tong_so_buoi integer,
    co_mat integer,
    diem_chuyen_can numeric(4,2),
    nien_khoa character varying(20),
    id_tn integer,
    CONSTRAINT check_diem_chuyen_can_range CHECK (((diem_chuyen_can >= (0)::numeric) AND (diem_chuyen_can <= (10)::numeric))),
    CONSTRAINT check_nk_diem_chuyen_can CHECK (((nien_khoa)::text ~ '^\d{4}-\d{4}$'::text)),
    CONSTRAINT check_thang_chuyen_can CHECK (((thang >= 1) AND (thang <= 12)))
);


ALTER TABLE public.diem_chuyen_can OWNER TO postgres;

--
-- Name: diem_chuyen_can_id_chuyen_can_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.diem_chuyen_can ALTER COLUMN id_chuyen_can ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.diem_chuyen_can_id_chuyen_can_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: diem_danh; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.diem_danh (
    id_diem_danh integer NOT NULL,
    ngay_diem_danh date,
    trang_thai character varying(20),
    id_tn integer,
    id_lop integer
);


ALTER TABLE public.diem_danh OWNER TO postgres;

--
-- Name: diem_danh_id_diem_danh_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.diem_danh ALTER COLUMN id_diem_danh ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.diem_danh_id_diem_danh_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: diem_hoc_tap; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.diem_hoc_tap (
    id_hoc_tap integer NOT NULL,
    stt_bai_ktra integer,
    diem_so numeric(4,2),
    nien_khoa character varying(20),
    id_tn integer,
    CONSTRAINT check_diem_hoc_tap_range CHECK (((diem_so >= (0)::numeric) AND (diem_so <= (10)::numeric))),
    CONSTRAINT check_nk_diem_hoc_tap CHECK (((nien_khoa)::text ~ '^\d{4}-\d{4}$'::text))
);


ALTER TABLE public.diem_hoc_tap OWNER TO postgres;

--
-- Name: diem_hoc_tap_id_hoc_tap_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.diem_hoc_tap ALTER COLUMN id_hoc_tap ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.diem_hoc_tap_id_hoc_tap_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: diem_ky_luat; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.diem_ky_luat (
    id_ky_luat integer NOT NULL,
    thang integer,
    diem numeric(4,2),
    nien_khoa character varying(20),
    id_tn integer,
    CONSTRAINT check_diem_ky_luat_range CHECK (((diem >= (0)::numeric) AND (diem <= (10)::numeric))),
    CONSTRAINT check_nk_diem_ky_luat CHECK (((nien_khoa)::text ~ '^\d{4}-\d{4}$'::text)),
    CONSTRAINT check_thang_ky_luat CHECK (((thang >= 1) AND (thang <= 12)))
);


ALTER TABLE public.diem_ky_luat OWNER TO postgres;

--
-- Name: diem_ky_luat_id_ky_luat_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.diem_ky_luat ALTER COLUMN id_ky_luat ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.diem_ky_luat_id_ky_luat_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: glv; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.glv (
    id_glv integer NOT NULL,
    ten_thanh character varying(50),
    ho_va_ten_lot character varying(100),
    ten character varying(50),
    ngay_sinh date,
    gioi_tinh character varying(10),
    sdt character varying(15)
);


ALTER TABLE public.glv OWNER TO postgres;

--
-- Name: glv_id_glv_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.glv ALTER COLUMN id_glv ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.glv_id_glv_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: khoi; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.khoi (
    id_khoi integer NOT NULL,
    stt integer,
    ten_khoi character varying(50)
);


ALTER TABLE public.khoi OWNER TO postgres;

--
-- Name: khoi_id_khoi_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.khoi ALTER COLUMN id_khoi ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.khoi_id_khoi_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: khung_xep_loai; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.khung_xep_loai (
    id_khung_xep_loai integer NOT NULL,
    nien_khoa character varying(20),
    ten_xep_loai character varying(50),
    min numeric(4,2),
    max numeric(4,2),
    id_cau_hinh_nam_hoc integer,
    CONSTRAINT check_nk_khung_xep_loai CHECK (((nien_khoa)::text ~ '^\d{4}-\d{4}$'::text))
);


ALTER TABLE public.khung_xep_loai OWNER TO postgres;

--
-- Name: khung_xep_loai_id_khung_xep_loai_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.khung_xep_loai ALTER COLUMN id_khung_xep_loai ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.khung_xep_loai_id_khung_xep_loai_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: lop_hoc; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lop_hoc (
    id_lop integer NOT NULL,
    ten_lop character varying(50),
    nien_khoa character varying(20),
    id_khoi integer,
    CONSTRAINT check_nk_lop_hoc CHECK (((nien_khoa)::text ~ '^\d{4}-\d{4}$'::text))
);


ALTER TABLE public.lop_hoc OWNER TO postgres;

--
-- Name: lop_hoc_id_lop_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.lop_hoc ALTER COLUMN id_lop ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.lop_hoc_id_lop_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: phan_cong_bdh; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.phan_cong_bdh (
    id_phan_cong_bdh integer NOT NULL,
    nien_khoa character varying(20),
    id_glv integer,
    CONSTRAINT check_nk_pc_bdh CHECK (((nien_khoa)::text ~ '^\d{4}-\d{4}$'::text))
);


ALTER TABLE public.phan_cong_bdh OWNER TO postgres;

--
-- Name: phan_cong_bdh_id_phan_cong_bdh_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.phan_cong_bdh ALTER COLUMN id_phan_cong_bdh ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.phan_cong_bdh_id_phan_cong_bdh_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: phan_cong_glv; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.phan_cong_glv (
    id_phan_cong_glv integer NOT NULL,
    id_glv integer,
    id_lop integer
);


ALTER TABLE public.phan_cong_glv OWNER TO postgres;

--
-- Name: phan_cong_glv_id_phan_cong_glv_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.phan_cong_glv ALTER COLUMN id_phan_cong_glv ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.phan_cong_glv_id_phan_cong_glv_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: phan_cong_truong_khoi; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.phan_cong_truong_khoi (
    id_phan_cong_truong integer NOT NULL,
    nien_khoa character varying(20),
    id_glv integer,
    id_khoi integer,
    CONSTRAINT check_nk_pc_truong_khoi CHECK (((nien_khoa)::text ~ '^\d{4}-\d{4}$'::text))
);


ALTER TABLE public.phan_cong_truong_khoi OWNER TO postgres;

--
-- Name: phan_cong_truong_khoi_id_phan_cong_truong_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.phan_cong_truong_khoi ALTER COLUMN id_phan_cong_truong ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.phan_cong_truong_khoi_id_phan_cong_truong_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: phan_lop; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.phan_lop (
    id_phan_lop integer NOT NULL,
    nien_khoa character varying(20),
    id_tn integer,
    id_lop integer,
    trang_thai public.enum_trang_thai_tn DEFAULT 'Đang học'::public.enum_trang_thai_tn,
    CONSTRAINT check_nk_phan_lop CHECK (((nien_khoa)::text ~ '^\d{4}-\d{4}$'::text))
);


ALTER TABLE public.phan_lop OWNER TO postgres;

--
-- Name: phan_lop_id_phan_lop_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.phan_lop ALTER COLUMN id_phan_lop ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.phan_lop_id_phan_lop_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: phu_huynh; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.phu_huynh (
    id_phu_huynh integer NOT NULL,
    sdt character varying(15),
    id_tn integer,
    ten_thanh_ph character varying(50),
    ten_ph character varying(100),
    moi_quan_he character varying(50),
    CONSTRAINT check_sdt_phu_huynh CHECK ((length((sdt)::text) >= 9))
);


ALTER TABLE public.phu_huynh OWNER TO postgres;

--
-- Name: phu_huynh_id_phu_huynh_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.phu_huynh ALTER COLUMN id_phu_huynh ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.phu_huynh_id_phu_huynh_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: tai_khoan; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tai_khoan (
    id_tk integer NOT NULL,
    username character varying(50),
    password_hash character varying(255),
    is_admin boolean,
    id_glv integer
);


ALTER TABLE public.tai_khoan OWNER TO postgres;

--
-- Name: tai_khoan_id_tk_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.tai_khoan ALTER COLUMN id_tk ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.tai_khoan_id_tk_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: thieu_nhi; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.thieu_nhi (
    id_tn integer NOT NULL,
    ten_thanh character varying(50),
    ho_va_ten_lot character varying(100),
    ten character varying(50),
    gioi_tinh character varying(10),
    ngay_sinh date,
    dia_chi character varying(255),
    mstn character varying(20),
    CONSTRAINT check_ngay_sinh_hop_le CHECK ((ngay_sinh <= CURRENT_DATE))
);


ALTER TABLE public.thieu_nhi OWNER TO postgres;

--
-- Name: thieu_nhi_id_tn_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.thieu_nhi ALTER COLUMN id_tn ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.thieu_nhi_id_tn_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: tong_ket_nam_hoc; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tong_ket_nam_hoc (
    id_tong_ket_nam_hoc integer NOT NULL,
    nien_khoa character varying(20),
    diem_hoc_tap numeric(4,2),
    diem_chuyen_can numeric(4,2),
    diem_ky_luat numeric(4,2),
    diem_tong numeric(4,2),
    tinh_trang public.enum_ket_qua,
    id_tn integer,
    id_lop integer,
    id_khung_xep_loai integer,
    CONSTRAINT check_nk_tong_ket CHECK (((nien_khoa)::text ~ '^\d{4}-\d{4}$'::text)),
    CONSTRAINT check_tk_diem_chuyen_can CHECK (((diem_chuyen_can >= (0)::numeric) AND (diem_chuyen_can <= (10)::numeric))),
    CONSTRAINT check_tk_diem_hoc_tap CHECK (((diem_hoc_tap >= (0)::numeric) AND (diem_hoc_tap <= (10)::numeric))),
    CONSTRAINT check_tk_diem_ky_luat CHECK (((diem_ky_luat >= (0)::numeric) AND (diem_ky_luat <= (10)::numeric))),
    CONSTRAINT check_tk_diem_tong CHECK (((diem_tong >= (0)::numeric) AND (diem_tong <= (10)::numeric)))
);


ALTER TABLE public.tong_ket_nam_hoc OWNER TO postgres;

--
-- Name: tong_ket_nam_hoc_id_tong_ket_nam_hoc_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.tong_ket_nam_hoc ALTER COLUMN id_tong_ket_nam_hoc ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.tong_ket_nam_hoc_id_tong_ket_nam_hoc_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: vw_chi_tiet_phu_huynh; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vw_chi_tiet_phu_huynh AS
 SELECT ph.id_phu_huynh,
    ph.ten_thanh_ph,
    ph.ten_ph,
    ph.moi_quan_he,
    ph.sdt,
    tn.id_tn,
    tn.ten_thanh AS ten_thanh_tn,
    tn.ho_va_ten_lot AS ho_ten_lot_tn,
    tn.ten AS ten_tn
   FROM (public.phu_huynh ph
     JOIN public.thieu_nhi tn ON ((ph.id_tn = tn.id_tn)));


ALTER VIEW public.vw_chi_tiet_phu_huynh OWNER TO postgres;

--
-- Name: vw_chi_tiet_thieu_nhi_lop; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vw_chi_tiet_thieu_nhi_lop AS
 SELECT tn.id_tn,
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
   FROM (((public.thieu_nhi tn
     JOIN public.phan_lop pl ON ((tn.id_tn = pl.id_tn)))
     JOIN public.lop_hoc l ON ((pl.id_lop = l.id_lop)))
     JOIN public.khoi k ON ((l.id_khoi = k.id_khoi)));


ALTER VIEW public.vw_chi_tiet_thieu_nhi_lop OWNER TO postgres;

--
-- Name: vw_phan_cong_giang_day; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vw_phan_cong_giang_day AS
 SELECT pc.id_phan_cong_glv,
    glv.id_glv,
    glv.ten_thanh AS ten_thanh_glv,
    glv.ho_va_ten_lot AS ho_ten_lot_glv,
    glv.ten AS ten_glv,
    glv.sdt AS sdt_glv,
    l.id_lop,
    l.ten_lop,
    l.nien_khoa,
    k.ten_khoi
   FROM (((public.phan_cong_glv pc
     JOIN public.glv glv ON ((pc.id_glv = glv.id_glv)))
     JOIN public.lop_hoc l ON ((pc.id_lop = l.id_lop)))
     JOIN public.khoi k ON ((l.id_khoi = k.id_khoi)));


ALTER VIEW public.vw_phan_cong_giang_day OWNER TO postgres;

--
-- Name: vw_tong_ket_chi_tiet; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vw_tong_ket_chi_tiet AS
 SELECT tk.id_tong_ket_nam_hoc,
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
   FROM (((public.tong_ket_nam_hoc tk
     JOIN public.thieu_nhi tn ON ((tk.id_tn = tn.id_tn)))
     JOIN public.lop_hoc l ON ((tk.id_lop = l.id_lop)))
     JOIN public.khoi k ON ((l.id_khoi = k.id_khoi)));


ALTER VIEW public.vw_tong_ket_chi_tiet OWNER TO postgres;

--
-- Data for Name: bi_tich; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: cau_hinh_nam_hoc; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.cau_hinh_nam_hoc (id_cau_hinh_nam_hoc, nien_khoa, trong_so_hoc_tap, trong_so_ky_luat, trong_so_diem_chuyen_can, so_luong_bai_ktra, ngay_tao) OVERRIDING SYSTEM VALUE VALUES (1, '2025-2026', 3.00, 2.00, 1.00, 3, '2026-08-18');


--
-- Data for Name: diem_chuyen_can; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.diem_chuyen_can (id_chuyen_can, thang, tong_so_buoi, co_mat, diem_chuyen_can, nien_khoa, id_tn) OVERRIDING SYSTEM VALUE VALUES (1, 1, 10, 9, 9.00, '2025-2026', 1);


--
-- Data for Name: diem_danh; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: diem_hoc_tap; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.diem_hoc_tap (id_hoc_tap, stt_bai_ktra, diem_so, nien_khoa, id_tn) OVERRIDING SYSTEM VALUE VALUES (1, NULL, 4.00, '2025-2026', 1);


--
-- Data for Name: diem_ky_luat; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.diem_ky_luat (id_ky_luat, thang, diem, nien_khoa, id_tn) OVERRIDING SYSTEM VALUE VALUES (1, 1, 8.00, '2025-2026', 1);


--
-- Data for Name: glv; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.glv (id_glv, ten_thanh, ho_va_ten_lot, ten, ngay_sinh, gioi_tinh, sdt) OVERRIDING SYSTEM VALUE VALUES (1, 'Giuse', 'Nguyễn Văn', 'An', '1995-05-15', 'Nam', '0901112233');
INSERT INTO public.glv (id_glv, ten_thanh, ho_va_ten_lot, ten, ngay_sinh, gioi_tinh, sdt) OVERRIDING SYSTEM VALUE VALUES (2, 'Têrêsa', 'Trần Thị', 'Bình', '1998-10-20', 'Nữ', '0904445566');
INSERT INTO public.glv (id_glv, ten_thanh, ho_va_ten_lot, ten, ngay_sinh, gioi_tinh, sdt) OVERRIDING SYSTEM VALUE VALUES (3, 'Têrêsa', 'Trần Thị', 'Mai', '1998-10-20', 'Nữ', '0988889999');
INSERT INTO public.glv (id_glv, ten_thanh, ho_va_ten_lot, ten, ngay_sinh, gioi_tinh, sdt) OVERRIDING SYSTEM VALUE VALUES (4, 'Têrêsa', 'Trần Thị', 'Mai', '1998-10-20', 'Nữ', '0988889999');


--
-- Data for Name: khoi; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.khoi (id_khoi, stt, ten_khoi) OVERRIDING SYSTEM VALUE VALUES (1, 1, 'Khai Tâm');
INSERT INTO public.khoi (id_khoi, stt, ten_khoi) OVERRIDING SYSTEM VALUE VALUES (2, 2, 'Rước Lễ');
INSERT INTO public.khoi (id_khoi, stt, ten_khoi) OVERRIDING SYSTEM VALUE VALUES (3, 3, 'Thêm Sức');
INSERT INTO public.khoi (id_khoi, stt, ten_khoi) OVERRIDING SYSTEM VALUE VALUES (4, 4, 'Bao Đồng');
INSERT INTO public.khoi (id_khoi, stt, ten_khoi) OVERRIDING SYSTEM VALUE VALUES (5, 5, 'Vào Đời 1');
INSERT INTO public.khoi (id_khoi, stt, ten_khoi) OVERRIDING SYSTEM VALUE VALUES (6, 6, 'Vào Đời 2');
INSERT INTO public.khoi (id_khoi, stt, ten_khoi) OVERRIDING SYSTEM VALUE VALUES (7, 7, 'Vào Đời 3');
INSERT INTO public.khoi (id_khoi, stt, ten_khoi) OVERRIDING SYSTEM VALUE VALUES (8, 8, 'Vào Đời 4');
INSERT INTO public.khoi (id_khoi, stt, ten_khoi) OVERRIDING SYSTEM VALUE VALUES (9, 9, 'Vào Đời 5');
INSERT INTO public.khoi (id_khoi, stt, ten_khoi) OVERRIDING SYSTEM VALUE VALUES (10, 10, 'Vào Đời 6');
INSERT INTO public.khoi (id_khoi, stt, ten_khoi) OVERRIDING SYSTEM VALUE VALUES (11, 11, 'Bao Đồng Trưởng Thành');


--
-- Data for Name: khung_xep_loai; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.khung_xep_loai (id_khung_xep_loai, nien_khoa, ten_xep_loai, min, max, id_cau_hinh_nam_hoc) OVERRIDING SYSTEM VALUE VALUES (1, '2025-2026', 'Giỏi', 8.50, 10.00, 1);
INSERT INTO public.khung_xep_loai (id_khung_xep_loai, nien_khoa, ten_xep_loai, min, max, id_cau_hinh_nam_hoc) OVERRIDING SYSTEM VALUE VALUES (2, '2025-2026', 'Khá', 7.00, 8.49, 1);
INSERT INTO public.khung_xep_loai (id_khung_xep_loai, nien_khoa, ten_xep_loai, min, max, id_cau_hinh_nam_hoc) OVERRIDING SYSTEM VALUE VALUES (3, '2025-2026', 'Trung Bình', 5.00, 6.99, 1);
INSERT INTO public.khung_xep_loai (id_khung_xep_loai, nien_khoa, ten_xep_loai, min, max, id_cau_hinh_nam_hoc) OVERRIDING SYSTEM VALUE VALUES (4, '2025-2026', 'Yếu', 0.00, 4.99, 1);


--
-- Data for Name: lop_hoc; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.lop_hoc (id_lop, ten_lop, nien_khoa, id_khoi) OVERRIDING SYSTEM VALUE VALUES (1, 'Khai Tâm 1', '2025-2026', 1);
INSERT INTO public.lop_hoc (id_lop, ten_lop, nien_khoa, id_khoi) OVERRIDING SYSTEM VALUE VALUES (2, 'Rước Lễ 1', '2025-2026', 2);
INSERT INTO public.lop_hoc (id_lop, ten_lop, nien_khoa, id_khoi) OVERRIDING SYSTEM VALUE VALUES (3, 'Thêm Sức 1', '2025-2026', 3);


--
-- Data for Name: phan_cong_bdh; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: phan_cong_glv; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: phan_cong_truong_khoi; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: phan_lop; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.phan_lop (id_phan_lop, nien_khoa, id_tn, id_lop, trang_thai) OVERRIDING SYSTEM VALUE VALUES (1, '2025-2026', 1, 1, 'Đang học');
INSERT INTO public.phan_lop (id_phan_lop, nien_khoa, id_tn, id_lop, trang_thai) OVERRIDING SYSTEM VALUE VALUES (2, '2025-2026', 2, 1, 'Đang học');
INSERT INTO public.phan_lop (id_phan_lop, nien_khoa, id_tn, id_lop, trang_thai) OVERRIDING SYSTEM VALUE VALUES (3, '2025-2026', 3, 2, 'Đang học');


--
-- Data for Name: phu_huynh; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: tai_khoan; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.tai_khoan (id_tk, username, password_hash, is_admin, id_glv) OVERRIDING SYSTEM VALUE VALUES (1, '0901112233', '19950515', false, 1);
INSERT INTO public.tai_khoan (id_tk, username, password_hash, is_admin, id_glv) OVERRIDING SYSTEM VALUE VALUES (2, '0904445566', '19981020', false, 2);
INSERT INTO public.tai_khoan (id_tk, username, password_hash, is_admin, id_glv) OVERRIDING SYSTEM VALUE VALUES (3, '0988889999', '20101998', false, 3);
INSERT INTO public.tai_khoan (id_tk, username, password_hash, is_admin, id_glv) OVERRIDING SYSTEM VALUE VALUES (4, '0988889999', '20101998', false, 4);


--
-- Data for Name: thieu_nhi; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.thieu_nhi (id_tn, ten_thanh, ho_va_ten_lot, ten, gioi_tinh, ngay_sinh, dia_chi, mstn) OVERRIDING SYSTEM VALUE VALUES (1, 'Phêrô', 'Lê Văn', 'Cường', 'Nam', '2018-03-12', '123 Đường Số 1, Phường An Lạc', '260001A');
INSERT INTO public.thieu_nhi (id_tn, ten_thanh, ho_va_ten_lot, ten, gioi_tinh, ngay_sinh, dia_chi, mstn) OVERRIDING SYSTEM VALUE VALUES (2, 'Maria', 'Phạm Thị', 'Dung', 'Nữ', '2018-07-25', '456 Đường Số 2, Phường An Lạc', '260002B');
INSERT INTO public.thieu_nhi (id_tn, ten_thanh, ho_va_ten_lot, ten, gioi_tinh, ngay_sinh, dia_chi, mstn) OVERRIDING SYSTEM VALUE VALUES (3, 'Gioan', 'Nguyễn Hoàng', 'Nam', 'Nam', '2017-01-05', '789 Đường Số 3, Phường An Lạc', '260003A');
INSERT INTO public.thieu_nhi (id_tn, ten_thanh, ho_va_ten_lot, ten, gioi_tinh, ngay_sinh, dia_chi, mstn) OVERRIDING SYSTEM VALUE VALUES (4, 'Đaminh', 'Ngô Văn', 'E', 'Nam', '2019-01-01', 'Test Address', '260004A');
INSERT INTO public.thieu_nhi (id_tn, ten_thanh, ho_va_ten_lot, ten, gioi_tinh, ngay_sinh, dia_chi, mstn) OVERRIDING SYSTEM VALUE VALUES (5, 'Dominico', 'Nguyễn Văn', 'Hùng', 'Nam', '2018-05-12', '123 Test Street', '260005A');


--
-- Data for Name: tong_ket_nam_hoc; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.tong_ket_nam_hoc (id_tong_ket_nam_hoc, nien_khoa, diem_hoc_tap, diem_chuyen_can, diem_ky_luat, diem_tong, tinh_trang, id_tn, id_lop, id_khung_xep_loai) OVERRIDING SYSTEM VALUE VALUES (3, NULL, 4.00, 9.00, 9.00, NULL, NULL, 2, NULL, NULL);
INSERT INTO public.tong_ket_nam_hoc (id_tong_ket_nam_hoc, nien_khoa, diem_hoc_tap, diem_chuyen_can, diem_ky_luat, diem_tong, tinh_trang, id_tn, id_lop, id_khung_xep_loai) OVERRIDING SYSTEM VALUE VALUES (4, '2025-2026', 0.00, 0.00, 0.00, 0.00, 'Ở lại lớp', 3, 2, 4);
INSERT INTO public.tong_ket_nam_hoc (id_tong_ket_nam_hoc, nien_khoa, diem_hoc_tap, diem_chuyen_can, diem_ky_luat, diem_tong, tinh_trang, id_tn, id_lop, id_khung_xep_loai) OVERRIDING SYSTEM VALUE VALUES (1, '2025-2026', 4.00, 9.00, 8.00, 6.17, 'Ở lại lớp', 1, 1, 3);
INSERT INTO public.tong_ket_nam_hoc (id_tong_ket_nam_hoc, nien_khoa, diem_hoc_tap, diem_chuyen_can, diem_ky_luat, diem_tong, tinh_trang, id_tn, id_lop, id_khung_xep_loai) OVERRIDING SYSTEM VALUE VALUES (2, '2025-2026', 0.00, 0.00, 0.00, 0.00, 'Ở lại lớp', 2, 1, 4);


--
-- Name: bi_tich_id_bi_tich_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bi_tich_id_bi_tich_seq', 1, false);


--
-- Name: cau_hinh_nam_hoc_id_cau_hinh_nam_hoc_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.cau_hinh_nam_hoc_id_cau_hinh_nam_hoc_seq', 1, true);


--
-- Name: diem_chuyen_can_id_chuyen_can_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.diem_chuyen_can_id_chuyen_can_seq', 1, true);


--
-- Name: diem_danh_id_diem_danh_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.diem_danh_id_diem_danh_seq', 1, false);


--
-- Name: diem_hoc_tap_id_hoc_tap_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.diem_hoc_tap_id_hoc_tap_seq', 1, true);


--
-- Name: diem_ky_luat_id_ky_luat_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.diem_ky_luat_id_ky_luat_seq', 1, true);


--
-- Name: glv_id_glv_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.glv_id_glv_seq', 4, true);


--
-- Name: khoi_id_khoi_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.khoi_id_khoi_seq', 11, true);


--
-- Name: khung_xep_loai_id_khung_xep_loai_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.khung_xep_loai_id_khung_xep_loai_seq', 4, true);


--
-- Name: lop_hoc_id_lop_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lop_hoc_id_lop_seq', 3, true);


--
-- Name: phan_cong_bdh_id_phan_cong_bdh_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.phan_cong_bdh_id_phan_cong_bdh_seq', 1, false);


--
-- Name: phan_cong_glv_id_phan_cong_glv_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.phan_cong_glv_id_phan_cong_glv_seq', 1, false);


--
-- Name: phan_cong_truong_khoi_id_phan_cong_truong_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.phan_cong_truong_khoi_id_phan_cong_truong_seq', 1, false);


--
-- Name: phan_lop_id_phan_lop_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.phan_lop_id_phan_lop_seq', 6, true);


--
-- Name: phu_huynh_id_phu_huynh_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.phu_huynh_id_phu_huynh_seq', 1, false);


--
-- Name: tai_khoan_id_tk_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tai_khoan_id_tk_seq', 4, true);


--
-- Name: thieu_nhi_id_tn_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.thieu_nhi_id_tn_seq', 5, true);


--
-- Name: tong_ket_nam_hoc_id_tong_ket_nam_hoc_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tong_ket_nam_hoc_id_tong_ket_nam_hoc_seq', 4, true);


--
-- Name: bi_tich bi_tich_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bi_tich
    ADD CONSTRAINT bi_tich_pkey PRIMARY KEY (id_bi_tich);


--
-- Name: cau_hinh_nam_hoc cau_hinh_nam_hoc_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cau_hinh_nam_hoc
    ADD CONSTRAINT cau_hinh_nam_hoc_pkey PRIMARY KEY (id_cau_hinh_nam_hoc);


--
-- Name: diem_chuyen_can diem_chuyen_can_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.diem_chuyen_can
    ADD CONSTRAINT diem_chuyen_can_pkey PRIMARY KEY (id_chuyen_can);


--
-- Name: diem_danh diem_danh_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.diem_danh
    ADD CONSTRAINT diem_danh_pkey PRIMARY KEY (id_diem_danh);


--
-- Name: diem_hoc_tap diem_hoc_tap_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.diem_hoc_tap
    ADD CONSTRAINT diem_hoc_tap_pkey PRIMARY KEY (id_hoc_tap);


--
-- Name: diem_ky_luat diem_ky_luat_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.diem_ky_luat
    ADD CONSTRAINT diem_ky_luat_pkey PRIMARY KEY (id_ky_luat);


--
-- Name: glv glv_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.glv
    ADD CONSTRAINT glv_pkey PRIMARY KEY (id_glv);


--
-- Name: khoi khoi_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.khoi
    ADD CONSTRAINT khoi_pkey PRIMARY KEY (id_khoi);


--
-- Name: khung_xep_loai khung_xep_loai_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.khung_xep_loai
    ADD CONSTRAINT khung_xep_loai_pkey PRIMARY KEY (id_khung_xep_loai);


--
-- Name: lop_hoc lop_hoc_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lop_hoc
    ADD CONSTRAINT lop_hoc_pkey PRIMARY KEY (id_lop);


--
-- Name: phan_cong_bdh phan_cong_bdh_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.phan_cong_bdh
    ADD CONSTRAINT phan_cong_bdh_pkey PRIMARY KEY (id_phan_cong_bdh);


--
-- Name: phan_cong_glv phan_cong_glv_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.phan_cong_glv
    ADD CONSTRAINT phan_cong_glv_pkey PRIMARY KEY (id_phan_cong_glv);


--
-- Name: phan_cong_truong_khoi phan_cong_truong_khoi_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.phan_cong_truong_khoi
    ADD CONSTRAINT phan_cong_truong_khoi_pkey PRIMARY KEY (id_phan_cong_truong);


--
-- Name: phan_lop phan_lop_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.phan_lop
    ADD CONSTRAINT phan_lop_pkey PRIMARY KEY (id_phan_lop);


--
-- Name: phu_huynh phu_huynh_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.phu_huynh
    ADD CONSTRAINT phu_huynh_pkey PRIMARY KEY (id_phu_huynh);


--
-- Name: tai_khoan tai_khoan_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tai_khoan
    ADD CONSTRAINT tai_khoan_pkey PRIMARY KEY (id_tk);


--
-- Name: thieu_nhi thieu_nhi_mstn_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.thieu_nhi
    ADD CONSTRAINT thieu_nhi_mstn_key UNIQUE (mstn);


--
-- Name: thieu_nhi thieu_nhi_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.thieu_nhi
    ADD CONSTRAINT thieu_nhi_pkey PRIMARY KEY (id_tn);


--
-- Name: tong_ket_nam_hoc tong_ket_nam_hoc_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tong_ket_nam_hoc
    ADD CONSTRAINT tong_ket_nam_hoc_pkey PRIMARY KEY (id_tong_ket_nam_hoc);


--
-- Name: bi_tich uk_thieu_nhi_loai_bi_tich; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bi_tich
    ADD CONSTRAINT uk_thieu_nhi_loai_bi_tich UNIQUE (id_tn, loai_bi_tich);


--
-- Name: phan_lop uk_thieu_nhi_nien_khoa; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.phan_lop
    ADD CONSTRAINT uk_thieu_nhi_nien_khoa UNIQUE (id_tn, nien_khoa);


--
-- Name: idx_bi_tich_tn; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bi_tich_tn ON public.bi_tich USING btree (id_tn);


--
-- Name: idx_diem_chuyen_can_tn; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_diem_chuyen_can_tn ON public.diem_chuyen_can USING btree (id_tn);


--
-- Name: idx_diem_danh_lop; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_diem_danh_lop ON public.diem_danh USING btree (id_lop);


--
-- Name: idx_diem_danh_tn; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_diem_danh_tn ON public.diem_danh USING btree (id_tn);


--
-- Name: idx_diem_hoc_tap_tn; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_diem_hoc_tap_tn ON public.diem_hoc_tap USING btree (id_tn);


--
-- Name: idx_diem_ky_luat_tn; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_diem_ky_luat_tn ON public.diem_ky_luat USING btree (id_tn);


--
-- Name: idx_khung_xep_loai_cau_hinh; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_khung_xep_loai_cau_hinh ON public.khung_xep_loai USING btree (id_cau_hinh_nam_hoc);


--
-- Name: idx_lop_hoc_khoi; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lop_hoc_khoi ON public.lop_hoc USING btree (id_khoi);


--
-- Name: idx_pc_bdh_glv; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pc_bdh_glv ON public.phan_cong_bdh USING btree (id_glv);


--
-- Name: idx_pc_glv_glv; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pc_glv_glv ON public.phan_cong_glv USING btree (id_glv);


--
-- Name: idx_pc_glv_lop; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pc_glv_lop ON public.phan_cong_glv USING btree (id_lop);


--
-- Name: idx_pc_truong_glv; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pc_truong_glv ON public.phan_cong_truong_khoi USING btree (id_glv);


--
-- Name: idx_pc_truong_khoi; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pc_truong_khoi ON public.phan_cong_truong_khoi USING btree (id_khoi);


--
-- Name: idx_phan_lop_lop; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_phan_lop_lop ON public.phan_lop USING btree (id_lop);


--
-- Name: idx_phan_lop_nien_khoa; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_phan_lop_nien_khoa ON public.phan_lop USING btree (nien_khoa);


--
-- Name: idx_phan_lop_tn; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_phan_lop_tn ON public.phan_lop USING btree (id_tn);


--
-- Name: idx_phu_huynh_sdt; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_phu_huynh_sdt ON public.phu_huynh USING btree (sdt);


--
-- Name: idx_tai_khoan_glv; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tai_khoan_glv ON public.tai_khoan USING btree (id_glv);


--
-- Name: idx_thieu_nhi_ten; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_thieu_nhi_ten ON public.thieu_nhi USING btree (ten);


--
-- Name: idx_tong_ket_khung; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tong_ket_khung ON public.tong_ket_nam_hoc USING btree (id_khung_xep_loai);


--
-- Name: idx_tong_ket_lop; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tong_ket_lop ON public.tong_ket_nam_hoc USING btree (id_lop);


--
-- Name: idx_tong_ket_tn; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tong_ket_tn ON public.tong_ket_nam_hoc USING btree (id_tn);


--
-- Name: phan_lop trg_check_phan_lop; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_check_phan_lop BEFORE INSERT OR UPDATE ON public.phan_lop FOR EACH ROW EXECUTE FUNCTION public.fn_check_trung_lop_nien_khoa();


--
-- Name: thieu_nhi trg_sinh_mstn_thieu_nhi; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_sinh_mstn_thieu_nhi AFTER INSERT ON public.thieu_nhi FOR EACH ROW EXECUTE FUNCTION public.fn_tu_dong_tao_mstn_after();


--
-- Name: glv trg_tao_tai_khoan_glv; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_tao_tai_khoan_glv AFTER INSERT ON public.glv FOR EACH ROW EXECUTE FUNCTION public.fn_tu_dong_tao_tai_khoan_glv();


--
-- Name: bi_tich bi_tich_id_tn_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bi_tich
    ADD CONSTRAINT bi_tich_id_tn_fkey FOREIGN KEY (id_tn) REFERENCES public.thieu_nhi(id_tn);


--
-- Name: diem_chuyen_can diem_chuyen_can_id_tn_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.diem_chuyen_can
    ADD CONSTRAINT diem_chuyen_can_id_tn_fkey FOREIGN KEY (id_tn) REFERENCES public.thieu_nhi(id_tn);


--
-- Name: diem_danh diem_danh_id_lop_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.diem_danh
    ADD CONSTRAINT diem_danh_id_lop_fkey FOREIGN KEY (id_lop) REFERENCES public.lop_hoc(id_lop);


--
-- Name: diem_danh diem_danh_id_tn_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.diem_danh
    ADD CONSTRAINT diem_danh_id_tn_fkey FOREIGN KEY (id_tn) REFERENCES public.thieu_nhi(id_tn);


--
-- Name: diem_hoc_tap diem_hoc_tap_id_tn_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.diem_hoc_tap
    ADD CONSTRAINT diem_hoc_tap_id_tn_fkey FOREIGN KEY (id_tn) REFERENCES public.thieu_nhi(id_tn);


--
-- Name: diem_ky_luat diem_ky_luat_id_tn_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.diem_ky_luat
    ADD CONSTRAINT diem_ky_luat_id_tn_fkey FOREIGN KEY (id_tn) REFERENCES public.thieu_nhi(id_tn);


--
-- Name: khung_xep_loai khung_xep_loai_id_cau_hinh_nam_hoc_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.khung_xep_loai
    ADD CONSTRAINT khung_xep_loai_id_cau_hinh_nam_hoc_fkey FOREIGN KEY (id_cau_hinh_nam_hoc) REFERENCES public.cau_hinh_nam_hoc(id_cau_hinh_nam_hoc);


--
-- Name: lop_hoc lop_hoc_id_khoi_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lop_hoc
    ADD CONSTRAINT lop_hoc_id_khoi_fkey FOREIGN KEY (id_khoi) REFERENCES public.khoi(id_khoi);


--
-- Name: phan_cong_bdh phan_cong_bdh_id_glv_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.phan_cong_bdh
    ADD CONSTRAINT phan_cong_bdh_id_glv_fkey FOREIGN KEY (id_glv) REFERENCES public.glv(id_glv);


--
-- Name: phan_cong_glv phan_cong_glv_id_glv_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.phan_cong_glv
    ADD CONSTRAINT phan_cong_glv_id_glv_fkey FOREIGN KEY (id_glv) REFERENCES public.glv(id_glv);


--
-- Name: phan_cong_glv phan_cong_glv_id_lop_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.phan_cong_glv
    ADD CONSTRAINT phan_cong_glv_id_lop_fkey FOREIGN KEY (id_lop) REFERENCES public.lop_hoc(id_lop);


--
-- Name: phan_cong_truong_khoi phan_cong_truong_khoi_id_glv_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.phan_cong_truong_khoi
    ADD CONSTRAINT phan_cong_truong_khoi_id_glv_fkey FOREIGN KEY (id_glv) REFERENCES public.glv(id_glv);


--
-- Name: phan_cong_truong_khoi phan_cong_truong_khoi_id_khoi_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.phan_cong_truong_khoi
    ADD CONSTRAINT phan_cong_truong_khoi_id_khoi_fkey FOREIGN KEY (id_khoi) REFERENCES public.khoi(id_khoi);


--
-- Name: phan_lop phan_lop_id_lop_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.phan_lop
    ADD CONSTRAINT phan_lop_id_lop_fkey FOREIGN KEY (id_lop) REFERENCES public.lop_hoc(id_lop);


--
-- Name: phan_lop phan_lop_id_tn_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.phan_lop
    ADD CONSTRAINT phan_lop_id_tn_fkey FOREIGN KEY (id_tn) REFERENCES public.thieu_nhi(id_tn);


--
-- Name: phu_huynh phu_huynh_id_tn_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.phu_huynh
    ADD CONSTRAINT phu_huynh_id_tn_fkey FOREIGN KEY (id_tn) REFERENCES public.thieu_nhi(id_tn);


--
-- Name: tai_khoan tai_khoan_id_glv_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tai_khoan
    ADD CONSTRAINT tai_khoan_id_glv_fkey FOREIGN KEY (id_glv) REFERENCES public.glv(id_glv);


--
-- Name: tong_ket_nam_hoc tong_ket_nam_hoc_id_khung_xep_loai_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tong_ket_nam_hoc
    ADD CONSTRAINT tong_ket_nam_hoc_id_khung_xep_loai_fkey FOREIGN KEY (id_khung_xep_loai) REFERENCES public.khung_xep_loai(id_khung_xep_loai);


--
-- Name: tong_ket_nam_hoc tong_ket_nam_hoc_id_lop_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tong_ket_nam_hoc
    ADD CONSTRAINT tong_ket_nam_hoc_id_lop_fkey FOREIGN KEY (id_lop) REFERENCES public.lop_hoc(id_lop);


--
-- Name: tong_ket_nam_hoc tong_ket_nam_hoc_id_tn_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tong_ket_nam_hoc
    ADD CONSTRAINT tong_ket_nam_hoc_id_tn_fkey FOREIGN KEY (id_tn) REFERENCES public.thieu_nhi(id_tn);


--
-- PostgreSQL database dump complete
--

