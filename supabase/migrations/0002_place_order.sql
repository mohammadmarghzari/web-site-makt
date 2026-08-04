-- ═══════════════════════════════════════════════════════════════════════
-- MAKT — ثبت سفارش بدون سرور
--
-- بعد از 0001_init.sql این فایل را هم یک بار در SQL Editor اجرا کنید.
--
-- چرا این فایل وجود دارد: سایت روی GitHub Pages میزبانی می‌شود و هیچ کد
-- سمت سروری ندارد. اگر مرورگر مستقیم در جدول orders درج می‌کرد، خریدار
-- می‌توانست مبلغ را دست‌کاری کند و یک فیگور سه‌میلیونی را یک تومان بخرد.
--
-- راه‌حل: خودِ دیتابیس نقش سرور را بازی می‌کند. تابع زیر هر عددی را که
-- مرورگر فرستاده باشد دور می‌ریزد، قیمت و موجودی را از جدول products
-- می‌خواند و مبلغ را خودش حساب می‌کند.
-- ═══════════════════════════════════════════════════════════════════════

-- شمارهٔ سفارش خوانا: MK- به‌علاوهٔ ۶ نویسه، بدون حروف مبهم مثل O و I
create or replace function public.generate_order_no()
returns text
language plpgsql
as $$
declare
  alphabet text := '0123456789BCDFGHJKLMNPQRSTVWXYZ';
  result text := 'MK-';
  i int;
begin
  for i in 1..6 loop
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return result;
end $$;

-- ═══════════════════════════════════════════════════════════════════════
-- place_order
--
-- SECURITY DEFINER است، یعنی با دسترسی سازندهٔ تابع اجرا می‌شود نه
-- کاربر ناشناس. به همین دلیل جدول orders می‌تواند برای عموم کاملاً بسته
-- بماند و هیچ‌کس نتواند سفارش‌های دیگران را بخواند.
--
-- search_path قفل شده تا کسی با ساختن جدولی هم‌نام در اسکیمای دیگر،
-- تابع را فریب ندهد.
-- ═══════════════════════════════════════════════════════════════════════
create or replace function public.place_order(p_items jsonb, p_customer jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  item              jsonb;
  prod              record;
  qty               int;
  computed_subtotal bigint := 0;
  ship              bigint := 0;
  clean_items       jsonb := '[]'::jsonb;
  new_order         record;
  order_number      text;
  attempts          int := 0;
  phone             text;
  postal            text;
begin
  -- ── اعتبارسنجی سبد ──────────────────────────────────────────────────
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'سبد خرید خالی است.';
  end if;
  if jsonb_array_length(p_items) > 50 then
    raise exception 'تعداد اقلام سبد بیش از حد مجاز است.';
  end if;

  -- ── اعتبارسنجی مشتری ────────────────────────────────────────────────
  -- همان قواعد فرم، ولی اینجا قابل دور زدن نیست.
  if coalesce(length(trim(p_customer->>'name')), 0) < 3 then
    raise exception 'نام و نام خانوادگی را کامل بنویسید.';
  end if;

  phone := regexp_replace(coalesce(p_customer->>'phone', ''), '[^0-9]', '', 'g');
  if phone !~ '^09[0-9]{9}$' then
    raise exception 'شمارهٔ موبایل معتبر نیست.';
  end if;

  postal := regexp_replace(coalesce(p_customer->>'postal_code', ''), '[^0-9]', '', 'g');
  if postal !~ '^[0-9]{10}$' then
    raise exception 'کد پستی باید ۱۰ رقم باشد.';
  end if;

  if coalesce(length(trim(p_customer->>'address')), 0) < 10 then
    raise exception 'نشانی را کامل‌تر بنویسید.';
  end if;

  -- ── قیمت‌گذاری از روی دیتابیس ───────────────────────────────────────
  for item in select * from jsonb_array_elements(p_items) loop
    qty := coalesce((item->>'quantity')::int, 0);
    if qty < 1 or qty > 20 then
      raise exception 'تعداد هر قلم باید بین ۱ تا ۲۰ باشد.';
    end if;

    select id, slug, name_fa, price, stock, status, colors
      into prod
      from public.products
     where id = (item->>'product_id')::uuid
     for update;   -- قفل ردیف تا دو سفارش هم‌زمان یک موجودی را دوبار نفروشند

    if not found then
      raise exception 'یکی از محصولات سبد دیگر موجود نیست.';
    end if;
    if prod.status <> 'published' then
      raise exception '«%» فعلاً قابل سفارش نیست.', prod.name_fa;
    end if;
    if prod.stock < qty then
      raise exception 'از «%» فقط % عدد موجود است.', prod.name_fa, prod.stock;
    end if;

    computed_subtotal := computed_subtotal + (prod.price * qty);

    -- تصویر لحظه‌ای قلم، با قیمتِ همین لحظه. رنگ هم از پالت واقعی محصول
    -- تأیید می‌شود، نه از چیزی که مرورگر فرستاده.
    clean_items := clean_items || jsonb_build_object(
      'product_id',    prod.id,
      'slug',          prod.slug,
      'name_fa',       prod.name_fa,
      'price',         prod.price,
      'quantity',      qty,
      'color_hex',     (
        select c->>'hex' from jsonb_array_elements(prod.colors) c
         where c->>'hex' = item->>'color_hex' limit 1
      ),
      'color_name_fa', (
        select c->>'name_fa' from jsonb_array_elements(prod.colors) c
         where c->>'hex' = item->>'color_hex' limit 1
      )
    );
  end loop;

  select shipping_flat_price into ship from public.site_settings where id = 1;
  ship := coalesce(ship, 0);

  -- ── شمارهٔ یکتا ─────────────────────────────────────────────────────
  loop
    order_number := public.generate_order_no();
    exit when not exists (select 1 from public.orders where order_no = order_number);
    attempts := attempts + 1;
    if attempts > 10 then
      raise exception 'تولید شمارهٔ سفارش ناموفق بود. دوباره تلاش کنید.';
    end if;
  end loop;

  -- ── درج ─────────────────────────────────────────────────────────────
  -- هیچ‌کدام از مبالغ از ورودی نمی‌آید؛ همه محاسبه‌شدهٔ همین تابع‌اند.
  insert into public.orders (order_no, items, subtotal, shipping, total, customer, status)
  values (
    order_number,
    clean_items,
    computed_subtotal,
    ship,
    computed_subtotal + ship,
    jsonb_build_object(
      'name',        trim(p_customer->>'name'),
      'phone',       phone,
      'address',     trim(p_customer->>'address'),
      'postal_code', postal,
      'note',        left(coalesce(p_customer->>'note', ''), 300)
    ),
    'pending'
  )
  returning * into new_order;

  -- ── کسر موجودی ──────────────────────────────────────────────────────
  for item in select * from jsonb_array_elements(clean_items) loop
    update public.products
       set stock  = greatest(0, stock - (item->>'quantity')::int),
           status = case
                      when stock - (item->>'quantity')::int <= 0 then 'sold_out'::product_status
                      else status
                    end
     where id = (item->>'product_id')::uuid;
  end loop;

  -- فقط چیزی برمی‌گردد که مشتری باید ببیند. بقیهٔ ستون‌ها هرگز از
  -- جدول خارج نمی‌شوند.
  return jsonb_build_object(
    'order_no', new_order.order_no,
    'subtotal', new_order.subtotal,
    'shipping', new_order.shipping,
    'total',    new_order.total
  );
end $$;

-- کاربر ناشناس فقط اجازهٔ اجرای همین تابع را دارد — نه خواندن جدول
-- سفارش‌ها، نه درج مستقیم در آن.
revoke all on function public.place_order(jsonb, jsonb) from public;
grant execute on function public.place_order(jsonb, jsonb) to anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════
-- یادآوری: هیچ سیاست insert یا select عمومی روی جدول orders اضافه نشده
-- و نباید بشود. تنها راه ورود سفارش، همین تابع است.
-- ═══════════════════════════════════════════════════════════════════════
