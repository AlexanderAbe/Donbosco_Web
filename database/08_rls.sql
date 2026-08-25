-- ================================================================
-- RLS THEO auth.uid() CHO SCHEMA public
-- ================================================================
-- Yêu cầu PostgreSQL 15+ (VIEW security_invoker).
-- Trước khi chạy, ánh xạ auth.users.id vào TAI_KHOAN.auth_user_id.
-- Ví dụ: UPDATE tai_khoan SET auth_user_id = '<uuid-auth-users>' WHERE username = '...';
-- Không cấp quyền cho anon. service_role của Supabase vẫn bypass RLS.

-- 1. Thêm khóa liên kết với Supabase Auth nếu schema chưa có.
ALTER TABLE public.tai_khoan
    ADD COLUMN IF NOT EXISTS auth_user_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS uq_tai_khoan_auth_user_id
    ON public.tai_khoan (auth_user_id)
    WHERE auth_user_id IS NOT NULL;

-- 2. Bật RLS cho mọi bảng thật trong public.
DO $$
DECLARE item RECORD;
BEGIN
    FOR item IN
        SELECT n.nspname AS schema_name, c.relname AS object_name
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
    LOOP
        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', item.schema_name, item.object_name);
    END LOOP;
END $$;

-- 3. View dùng quyền của người gọi để RLS của bảng gốc được áp dụng.
DO $$
DECLARE item RECORD;
BEGIN
    FOR item IN
        SELECT n.nspname AS schema_name, c.relname AS object_name
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'v'
    LOOP
        EXECUTE format('ALTER VIEW %I.%I SET (security_invoker = true)', item.schema_name, item.object_name);
    END LOOP;
END $$;

-- 4. Hàm trợ giúp lấy tài khoản và vai trò từ auth.uid().
-- SECURITY DEFINER tránh vòng lặp RLS khi policy kiểm tra TAI_KHOAN.
CREATE OR REPLACE FUNCTION public.app_account_id()
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT id_tk FROM public.tai_khoan WHERE auth_user_id = (SELECT auth.uid()) LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.app_glv_id()
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT id_glv FROM public.tai_khoan WHERE auth_user_id = (SELECT auth.uid()) LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.app_is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT COALESCE((SELECT is_admin FROM public.tai_khoan WHERE auth_user_id = (SELECT auth.uid()) LIMIT 1), false)
$$;

CREATE OR REPLACE FUNCTION public.app_is_bdh()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.phan_cong_bdh b
        JOIN public.tai_khoan a ON a.id_glv = b.id_glv
        WHERE a.auth_user_id = (SELECT auth.uid())
    )
$$;

CREATE OR REPLACE FUNCTION public.app_is_truong_khoi()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.phan_cong_truong_khoi tk
        JOIN public.tai_khoan a ON a.id_glv = tk.id_glv
        JOIN public.cau_hinh_nam_hoc n ON n.id_cau_hinh_nam_hoc = tk.id_cau_hinh_nam_hoc
        WHERE a.auth_user_id = (SELECT auth.uid())
          AND tk.id_cau_hinh_nam_hoc = (
              SELECT id_cau_hinh_nam_hoc FROM public.cau_hinh_nam_hoc
              ORDER BY nien_khoa DESC, id_cau_hinh_nam_hoc DESC LIMIT 1
          )
    )
$$;

CREATE OR REPLACE FUNCTION public.app_can_access_child(child_id integer)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.phan_lop pl
        JOIN public.lop_hoc l ON l.id_lop = pl.id_lop
        WHERE pl.id_tn = child_id
          AND (
              EXISTS (
                  SELECT 1 FROM public.phan_cong_glv pc
                  WHERE pc.id_glv = public.app_glv_id() AND pc.id_lop = pl.id_lop
              )
              OR EXISTS (
                  SELECT 1
                  FROM public.phan_cong_truong_khoi tk
                  WHERE tk.id_glv = public.app_glv_id() AND tk.id_khoi = l.id_khoi
              )
          )
    )
$$;

-- 5. Xóa policy do script này quản lý.
DO $$
DECLARE item RECORD;
BEGIN
    FOR item IN
        SELECT c.relname AS table_name
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'rls_authenticated_select', item.table_name);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'rls_admin_all', item.table_name);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'rls_bdh_all', item.table_name);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'rls_truong_khoi_select', item.table_name);
    END LOOP;
END $$;

-- 6. SELECT tối thiểu cho tài khoản đã liên kết với Supabase Auth.
-- Quyền ghi được cấp riêng bên dưới theo vai trò.
CREATE POLICY rls_authenticated_select ON public.tai_khoan
    FOR SELECT TO authenticated USING (auth_user_id = (SELECT auth.uid()) OR public.app_is_admin());

CREATE POLICY rls_authenticated_select ON public.glv
    FOR SELECT TO authenticated USING (true);

CREATE POLICY rls_authenticated_select ON public.khoi
    FOR SELECT TO authenticated USING (true);

CREATE POLICY rls_authenticated_select ON public.cau_hinh_nam_hoc
    FOR SELECT TO authenticated USING (true);

CREATE POLICY rls_authenticated_select ON public.khung_xep_loai
    FOR SELECT TO authenticated USING (true);

CREATE POLICY rls_authenticated_select ON public.lop_hoc
    FOR SELECT TO authenticated USING (true);

CREATE POLICY rls_authenticated_select ON public.phan_cong_truong_khoi
    FOR SELECT TO authenticated USING (public.app_is_admin() OR id_glv = public.app_glv_id() OR public.app_is_bdh());

CREATE POLICY rls_authenticated_select ON public.phan_cong_glv
    FOR SELECT TO authenticated USING (public.app_is_admin() OR public.app_is_bdh() OR id_glv = public.app_glv_id());

CREATE POLICY rls_authenticated_select ON public.phan_lop
    FOR SELECT TO authenticated USING (public.app_is_admin() OR public.app_is_bdh() OR EXISTS (
        SELECT 1 FROM public.phan_cong_glv pc WHERE pc.id_glv = public.app_glv_id() AND pc.id_lop = phan_lop.id_lop
    ) OR EXISTS (
        SELECT 1 FROM public.phan_cong_truong_khoi tk JOIN public.lop_hoc l ON l.id_khoi = tk.id_khoi
        WHERE tk.id_glv = public.app_glv_id() AND l.id_lop = phan_lop.id_lop
    ));

CREATE POLICY rls_authenticated_select ON public.thieu_nhi
    FOR SELECT TO authenticated USING (public.app_is_admin() OR public.app_is_bdh() OR EXISTS (
        SELECT 1 WHERE public.app_can_access_child(thieu_nhi.id_tn)
    ));

CREATE POLICY rls_authenticated_select ON public.phu_huynh
    FOR SELECT TO authenticated USING (public.app_is_admin() OR public.app_is_bdh() OR EXISTS (
        SELECT 1 WHERE public.app_can_access_child(phu_huynh.id_tn)
    ));

CREATE POLICY rls_authenticated_select ON public.bi_tich
    FOR SELECT TO authenticated USING (public.app_is_admin() OR public.app_is_bdh() OR EXISTS (
        SELECT 1 WHERE public.app_can_access_child(bi_tich.id_tn)
    ));

CREATE POLICY rls_authenticated_select ON public.diem_danh
    FOR SELECT TO authenticated USING (public.app_is_admin() OR public.app_is_bdh() OR public.app_can_access_child(id_tn));

CREATE POLICY rls_authenticated_select ON public.diem_hoc_tap
    FOR SELECT TO authenticated USING (public.app_is_admin() OR public.app_is_bdh() OR public.app_can_access_child(id_tn));

CREATE POLICY rls_authenticated_select ON public.diem_ky_luat
    FOR SELECT TO authenticated USING (public.app_is_admin() OR public.app_is_bdh() OR public.app_can_access_child(id_tn));

CREATE POLICY rls_authenticated_select ON public.diem_chuyen_can
    FOR SELECT TO authenticated USING (public.app_is_admin() OR public.app_is_bdh() OR public.app_can_access_child(id_tn));

CREATE POLICY rls_authenticated_select ON public.tong_ket_nam_hoc
    FOR SELECT TO authenticated USING (public.app_is_admin() OR public.app_is_bdh() OR public.app_can_access_child(id_tn));

-- 7. Admin được toàn quyền trên các bảng nghiệp vụ.
DO $$
DECLARE item RECORD;
BEGIN
    FOR item IN
        SELECT c.relname AS table_name FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND c.relname <> 'tai_khoan'
    LOOP
        EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.app_is_admin()) WITH CHECK (public.app_is_admin())', 'rls_admin_all', item.table_name);
    END LOOP;
END $$;

CREATE POLICY rls_admin_all ON public.tai_khoan FOR ALL TO authenticated
    USING (public.app_is_admin()) WITH CHECK (public.app_is_admin());

-- 8. BDH được quản lý cấu hình, khối, lớp và phân công.
CREATE POLICY rls_bdh_all ON public.khoi FOR ALL TO authenticated
    USING (public.app_is_bdh()) WITH CHECK (public.app_is_bdh());
CREATE POLICY rls_bdh_all ON public.lop_hoc FOR ALL TO authenticated
    USING (public.app_is_bdh()) WITH CHECK (public.app_is_bdh());
CREATE POLICY rls_bdh_all ON public.phan_cong_truong_khoi FOR ALL TO authenticated
    USING (public.app_is_bdh()) WITH CHECK (public.app_is_bdh());
CREATE POLICY rls_bdh_all ON public.phan_cong_glv FOR ALL TO authenticated
    USING (public.app_is_bdh()) WITH CHECK (public.app_is_bdh());

-- 9. Trưởng khối chỉ được xem dữ liệu thuộc khối mình phụ trách.
CREATE POLICY rls_truong_khoi_select ON public.thieu_nhi FOR SELECT TO authenticated
    USING (public.app_is_truong_khoi() AND EXISTS (
        SELECT 1 FROM public.phan_lop pl JOIN public.lop_hoc l ON l.id_lop = pl.id_lop
        JOIN public.phan_cong_truong_khoi tk ON tk.id_khoi = l.id_khoi
        WHERE pl.id_tn = thieu_nhi.id_tn AND tk.id_glv = public.app_glv_id()
    ));

CREATE POLICY rls_admin_select_logs ON public.audit_logs
    FOR SELECT TO authenticated USING (public.app_is_admin());

-- 10. Cấp quyền SQL cho authenticated. RLS policy không thay GRANT.
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Lưu ý: cần map auth.users.id vào TAI_KHOAN.auth_user_id trước khi kiểm thử.