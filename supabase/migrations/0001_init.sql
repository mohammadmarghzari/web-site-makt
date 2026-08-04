-- ═══════════════════════════════════════════════════════════════════════
-- MAKT — اسکیمای کامل دیتابیس
--
-- طرز استفاده: کل این فایل را کپی کنید و در داشبورد Supabase،
-- بخش SQL Editor، یک بار اجرا (Run) کنید.
--
-- این فایل idempotent است: اجرای دوباره‌اش خطا نمی‌دهد و داده را
-- پاک نمی‌کند.
-- ═══════════════════════════════════════════════════════════════════════

-- ── انواع شمارشی ───────────────────────────────────────────────────────
do $$ begin
  create type product_status as enum ('draft', 'published', 'sold_out');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum ('pending', 'paid', 'failed', 'canceled');
exception when duplicate_object then null; end $$;

-- ── profiles ───────────────────────────────────────────────────────────
-- هر کاربر Supabase Auth یک رکورد اینجا دارد. ستون role تعیین می‌کند
-- چه کسی مدیر است.
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  role        text not null default 'customer' check (role in ('customer', 'admin')),
  created_at  timestamptz not null default now()
);

-- ساخت خودکار profile هنگام ثبت‌نام، وگرنه کاربر تازه هیچ رکوردی ندارد
-- و هیچ سیاستی نمی‌تواند نقشش را تشخیص دهد.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── تابع تشخیص مدیر ────────────────────────────────────────────────────
-- security definer است تا خودش تابع سیاست‌های RLS جدول profiles نباشد؛
-- بدون آن، سیاستی که profiles را می‌خواند تا نقش را بفهمد، دوباره همان
-- سیاست را صدا می‌زد و به بازگشت بی‌نهایت می‌خورد.
-- search_path قفل شده تا کسی نتواند با جدول هم‌نام، تابع را فریب دهد.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ── products ───────────────────────────────────────────────────────────
create table if not exists public.products (
  id             uuid primary key default gen_random_uuid(),
  slug           text unique not null,
  name_fa        text not null,
  name_en        text not null default '',
  tagline_fa     text not null default '',
  description_fa text not null default '',
  price          bigint not null check (price >= 0),        -- تومان
  compare_price  bigint check (compare_price is null or compare_price >= 0),
  images         text[] not null default '{}',
  colors         jsonb not null default '[]'::jsonb,
  scale          text not null default '1/12',
  height_cm      numeric(5,1) not null default 0,
  material       text not null default '',
  articulation   int,
  accessories    text[] not null default '{}',
  stock          int not null default 0 check (stock >= 0),
  status         product_status not null default 'draft',
  is_featured    boolean not null default false,
  sort_order     int not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists products_status_sort_idx
  on public.products (status, sort_order);
create index if not exists products_featured_idx
  on public.products (is_featured) where is_featured;

-- ── hero_scenes ────────────────────────────────────────────────────────
create table if not exists public.hero_scenes (
  id            uuid primary key default gen_random_uuid(),
  scene_key     text unique not null check (scene_key in ('act1', 'act3')),
  frames        text[] not null default '{}',   -- ترتیب فریم‌های دنبالهٔ عکس
  poster_url    text,
  title_lines   text[] not null default '{}',   -- هر عنصر = یک خط تیتر
  subtitle_fa   text not null default '',
  cta_label     text,
  cta_href      text,
  overlay_alpha numeric(3,2) not null default 0.40
                  check (overlay_alpha >= 0 and overlay_alpha <= 1),
  updated_at    timestamptz not null default now()
);

-- ── site_settings ──────────────────────────────────────────────────────
-- تک‌رکوردی. ستون id با check قفل شده تا هرگز رکورد دوم ساخته نشود.
create table if not exists public.site_settings (
  id                  int primary key default 1 check (id = 1),
  brand_name          text not null default 'MAKT',
  logo_url            text,
  socials             jsonb not null default '[]'::jsonb,
  footer_note         text not null default '',
  shipping_flat_price bigint not null default 0 check (shipping_flat_price >= 0),
  updated_at          timestamptz not null default now()
);

-- ── orders ─────────────────────────────────────────────────────────────
-- هیچ دسترسی عمومی ندارد. فقط سرور با کلید service_role می‌نویسد.
create table if not exists public.orders (
  id         uuid primary key default gen_random_uuid(),
  order_no   text unique not null,
  items      jsonb not null,          -- تصویر لحظه‌ای اقلام، با قیمت همان لحظه
  subtotal   bigint not null check (subtotal >= 0),
  shipping   bigint not null default 0 check (shipping >= 0),
  total      bigint not null check (total >= 0),
  customer   jsonb not null,          -- name, phone, address, postal_code
  authority  text,                    -- شناسهٔ تراکنش زرین‌پال
  ref_id     text,                    -- شمارهٔ پیگیری پس از verify موفق
  status     order_status not null default 'pending',
  created_at timestamptz not null default now(),
  paid_at    timestamptz
);

create index if not exists orders_status_created_idx
  on public.orders (status, created_at desc);
-- جست‌وجوی برگشت از درگاه با authority انجام می‌شود و باید سریع و یکتا باشد.
create unique index if not exists orders_authority_idx
  on public.orders (authority) where authority is not null;

-- ── به‌روزرسانی خودکار updated_at ───────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

drop trigger if exists hero_scenes_touch on public.hero_scenes;
create trigger hero_scenes_touch before update on public.hero_scenes
  for each row execute function public.touch_updated_at();

drop trigger if exists site_settings_touch on public.site_settings;
create trigger site_settings_touch before update on public.site_settings
  for each row execute function public.touch_updated_at();

-- ═══════════════════════════════════════════════════════════════════════
-- امنیت سطح ردیف (RLS)
--
-- RLS روی همهٔ جدول‌ها فعال است. بدون سیاست صریح، هیچ‌کس هیچ‌چیز
-- نمی‌بیند — یعنی حالت پیش‌فرض «بسته» است، نه «باز».
-- ═══════════════════════════════════════════════════════════════════════

alter table public.profiles      enable row level security;
alter table public.products      enable row level security;
alter table public.hero_scenes   enable row level security;
alter table public.site_settings enable row level security;
alter table public.orders        enable row level security;

-- profiles: هر کس فقط رکورد خودش را می‌بیند؛ مدیر همه را
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- products: عموم فقط منتشرشده‌ها؛ مدیر همه‌چیز
-- محصول draft نباید حتی از طریق API عمومی قابل خواندن باشد.
drop policy if exists products_select_published on public.products;
create policy products_select_published on public.products
  for select using (status <> 'draft' or public.is_admin());

drop policy if exists products_admin_write on public.products;
create policy products_admin_write on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- hero_scenes و site_settings: خواندن آزاد، نوشتن فقط مدیر
drop policy if exists hero_scenes_select_all on public.hero_scenes;
create policy hero_scenes_select_all on public.hero_scenes
  for select using (true);

drop policy if exists hero_scenes_admin_write on public.hero_scenes;
create policy hero_scenes_admin_write on public.hero_scenes
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists site_settings_select_all on public.site_settings;
create policy site_settings_select_all on public.site_settings
  for select using (true);

drop policy if exists site_settings_admin_write on public.site_settings;
create policy site_settings_admin_write on public.site_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- orders: فقط مدیر می‌خواند. هیچ سیاست insert/update ای برای کاربر عادی
-- وجود ندارد، پس نوشتن فقط با کلید service_role از سمت سرور ممکن است —
-- و service_role اصولاً RLS را دور می‌زند.
drop policy if exists orders_admin_select on public.orders;
create policy orders_admin_select on public.orders
  for select using (public.is_admin());

-- ═══════════════════════════════════════════════════════════════════════
-- Storage
-- ═══════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('hero-frames', 'hero-frames', true)
on conflict (id) do nothing;

drop policy if exists storage_public_read on storage.objects;
create policy storage_public_read on storage.objects
  for select using (bucket_id in ('product-images', 'hero-frames'));

drop policy if exists storage_admin_write on storage.objects;
create policy storage_admin_write on storage.objects
  for all
  using (bucket_id in ('product-images', 'hero-frames') and public.is_admin())
  with check (bucket_id in ('product-images', 'hero-frames') and public.is_admin());

-- ═══════════════════════════════════════════════════════════════════════
-- دادهٔ اولیه
--
-- همان محتوایی که سایت الان با آن کار می‌کند، تا بلافاصله بعد از وصل‌شدن
-- دیتابیس صفحهٔ خالی نبینید. هر وقت خواستید از پنل حذفشان کنید.
-- ═══════════════════════════════════════════════════════════════════════

insert into public.site_settings (id, brand_name, footer_note, shipping_flat_price, socials)
values (
  1, 'MAKT', 'ساخته‌شده در ایران — ارسال به سراسر کشور', 89000,
  '[{"label":"اینستاگرام","href":"https://instagram.com"},
    {"label":"تلگرام","href":"https://telegram.org"}]'::jsonb
) on conflict (id) do nothing;

insert into public.hero_scenes (scene_key, title_lines, subtitle_fa, cta_label, cta_href, overlay_alpha)
values
  ('act1', array['ساخته شده','برای','دست‌های تو'],
   'مجموعهٔ اکشن‌فیگور MAKT — مقیاس ۱/۱۲', 'خرید آرش', '/product/arash', 0.38),
  ('act3', array['ما','کوچک','می‌سازیم'],
   'هر مفصل، هر خط، هر رنگ — دستی بازبینی می‌شود.', 'دیدن کاتالوگ', '#act-2', 0.46)
on conflict (scene_key) do nothing;

insert into public.products
  (slug, name_fa, name_en, tagline_fa, description_fa, price, compare_price,
   colors, scale, height_cm, material, articulation, accessories, stock,
   status, is_featured, sort_order)
values
  ('arash', 'آرش', 'ARASH', 'کمان‌دار، با تیر و ترکش کامل',
   'پیکرهٔ آرش کمان‌گیر با مفصل‌بندی کامل شانه و آرنج، طراحی‌شده برای گرفتن حالت کشیدن کمان بدون پایهٔ کمکی. پارچهٔ ردا جداگانه قالب‌گیری شده و روی بدنه می‌نشیند.',
   1290000, 1490000,
   '[{"name_fa":"نقره‌ای سرد","hex":"#c9d3da"},{"name_fa":"خاکستری تیره","hex":"#5a6a76"},{"name_fa":"برنز مات","hex":"#8a7a63"}]'::jsonb,
   '1/12', 16.5, 'PVC و ABS', 28,
   array['کمان','ترکش','سه دست تعویضی','پایهٔ نمایش'], 12, 'published', true, 1),

  ('simorgh', 'سیمرغ', 'SIMORGH', 'بال‌های متحرک، جزئیات پر',
   'سیمرغ با بال‌های چندبخشی که هر پر آن جداگانه قالب‌گیری شده است. مفصل بال اجازهٔ باز و بستهٔ کامل می‌دهد و در حالت باز، دهانهٔ بال به ۳۴ سانتی‌متر می‌رسد.',
   2450000, null,
   '[{"name_fa":"فیروزه‌ای دودی","hex":"#6f9aa4"},{"name_fa":"نقره‌ای سرد","hex":"#c9d3da"}]'::jsonb,
   '1/12', 22, 'PVC و رزین', 34,
   array['پایهٔ پرواز','دو جفت بال تعویضی'], 5, 'published', false, 2),

  ('kaveh', 'کاوه', 'KAVEH', 'درفش کاویانی، پارچهٔ واقعی',
   'کاوهٔ آهنگر همراه با درفش کاویانی از پارچهٔ واقعی و میلهٔ فلزی. پیش‌بند چرمی‌نما و چکش، هر دو قابل جداشدن هستند.',
   1690000, null,
   '[{"name_fa":"خاکستری آهن","hex":"#6b7680"},{"name_fa":"سرخ کهنه","hex":"#8f5a52"}]'::jsonb,
   '1/12', 17, 'PVC و پارچه', 26,
   array['درفش','چکش','سندان کوچک','پایهٔ نمایش'], 0, 'sold_out', false, 3),

  ('rostam', 'رستم', 'ROSTAM', 'زره چندلایه، ببر بیان',
   'رستم با زره چندلایه و پوستین ببر بیان. سنگین‌ترین پیکرهٔ مجموعه با اسکلت داخلی فلزی که تعادل را در حالت‌های نامتقارن حفظ می‌کند.',
   2890000, 3190000,
   '[{"name_fa":"برنز تیره","hex":"#7d6a52"},{"name_fa":"خاکستری آهن","hex":"#6b7680"},{"name_fa":"نارنجی ببر","hex":"#b07c4a"}]'::jsonb,
   '1/12', 18.5, 'PVC، ABS و اسکلت فلزی', 32,
   array['گرز گاوسر','کمند','سپر','دو سر تعویضی'], 3, 'published', false, 4),

  ('zarvan', 'زروان', 'ZARVAN', 'نسخهٔ محدود، شماره‌گذاری‌شده',
   'زروان، ایزد زمان، در نسخهٔ محدود ۳۰۰ عددی. هر پیکره روی پایه شماره‌گذاری شده و با گواهی اصالت عرضه می‌شود. حلقهٔ زمان دور پیکره آزادانه می‌چرخد.',
   3450000, null,
   '[{"name_fa":"نقرهٔ آینه‌ای","hex":"#d8e2e8"}]'::jsonb,
   '1/12', 20, 'رزین و آبکاری کروم', 18,
   array['حلقهٔ زمان','پایهٔ شماره‌دار','گواهی اصالت'], 2, 'published', false, 5),

  ('azarakhsh', 'آذرخش', 'AZARAKHSH', 'قطعات شفاف، جلوهٔ صاعقه',
   'آذرخش با قطعات شفاف رنگی که جلوهٔ صاعقه را می‌سازند. قطعات افکت روی مفاصل سوار می‌شوند و بدون ابزار جدا می‌شوند.',
   1950000, null,
   '[{"name_fa":"آبی شفاف","hex":"#8fb6c9"},{"name_fa":"دودی شفاف","hex":"#9aa6ae"}]'::jsonb,
   '1/12', 16, 'PVC و PC شفاف', 30,
   array['چهار قطعهٔ افکت','پایهٔ نمایش','دست تعویضی'], 8, 'published', false, 6)
on conflict (slug) do nothing;

-- ═══════════════════════════════════════════════════════════════════════
-- گام آخر — خودتان را مدیر کنید
--
-- اول در سایت به /admin/login بروید و با ایمیل و رمز ثبت‌نام کنید.
-- بعد این خط را با ایمیل خودتان اینجا اجرا کنید:
--
--   update public.profiles set role = 'admin' where email = 'you@example.com';
--
-- ═══════════════════════════════════════════════════════════════════════
