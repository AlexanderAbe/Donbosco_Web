DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    -- 1. Bật RLS cho tất cả các BẢNG (Base Tables)
    FOR r IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
    LOOP 
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.table_name);
    END LOOP; 

    -- 2. Đảm bảo tất cả các VIEW tuân thủ RLS của bảng gốc (Security Invoker)
    -- Yêu cầu PostgreSQL 15 trở lên
    FOR r IN 
        SELECT table_name 
        FROM information_schema.views 
        WHERE table_schema = 'public'
    LOOP 
        EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true);', r.table_name);
    END LOOP;

END $$;

DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    FOR r IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
    LOOP 
        -- Xóa policy cũ nếu có để tránh lỗi trùng lặp
        EXECUTE format('DROP POLICY IF EXISTS "Cho phép toàn quyền" ON public.%I;', r.table_name);
        
        -- Tạo policy mở toàn quyền (Đọc, Thêm, Sửa, Xóa) cho mọi bảng
        EXECUTE format('CREATE POLICY "Cho phép toàn quyền" ON public.%I FOR ALL USING (true) WITH CHECK (true);', r.table_name);
    END LOOP; 
END $$;