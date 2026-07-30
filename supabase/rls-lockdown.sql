-- ============================================================
-- RLS LOCKDOWN — fix "RLS Disabled in Public" (Supabase Security Advisor)
-- ============================================================
-- App này KHÔNG dùng Supabase client (anon key) để đọc/ghi 5 bảng dưới đây —
-- toàn bộ đi qua Prisma với connection string riêng (bypass RLS hoàn toàn,
-- xem lib/prisma.ts). Vì vậy bật RLS mà KHÔNG thêm policy nào (deny-all cho
-- anon/authenticated) là an toàn tuyệt đối — không ảnh hưởng app hiện tại,
-- chỉ khoá đường tấn công qua REST API công khai (PostgREST) mà Supabase tự
-- động expose cho mọi bảng trong schema `public`.
--
-- Cách chạy: Supabase Dashboard → SQL Editor → dán toàn bộ file này → Run.
-- ============================================================

ALTER TABLE public.career_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leagues        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.national_teams ENABLE ROW LEVEL SECURITY;

-- Không cần policy nào thêm: mặc định sau khi bật RLS, nếu không có policy nào
-- match thì MỌI request qua anon/authenticated key đều bị từ chối — đúng ý
-- muốn (app không cần PostgREST truy cập các bảng này).
--
-- Nếu sau này bạn muốn cho phép client-side Supabase query trực tiếp bảng
-- leagues/clubs/national_teams (dữ liệu tĩnh, không nhạy cảm) để hiển thị mà
-- không qua Server Action, có thể thêm policy đọc công khai kiểu:
--
--   CREATE POLICY "Public read access" ON public.leagues
--     FOR SELECT TO anon, authenticated USING (true);
--
-- Không nên làm điều tương tự cho career_players/game_sessions — 2 bảng này
-- chứa dữ liệu gắn với user cụ thể (bao gồm hiddenStats không được lộ ra
-- client) nên phải giữ deny-all tuyệt đối.
