-- Argus schema — apply once in Vercel Postgres SQL Editor

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category text,
  product_url text not null,
  price_selector text,
  is_active boolean default true,
  image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists price_history (
  id bigserial primary key,
  product_id uuid not null references products(id) on delete cascade,
  price numeric(10,2) not null,
  available boolean default true,
  collected_at timestamptz default now(),
  source text default 'playwright'
);

create index if not exists idx_price_history_product_time
  on price_history(product_id, collected_at desc);

create table if not exists notifications_sent (
  id bigserial primary key,
  product_id uuid references products(id) on delete cascade,
  kind text not null,
  old_price numeric(10,2),
  new_price numeric(10,2),
  variation_pct numeric(6,2),
  sent_at timestamptz default now()
);

create index if not exists idx_notifications_product_time
  on notifications_sent(product_id, sent_at desc);

create or replace view v_products_summary as
select
  p.id,
  p.slug,
  p.name,
  p.category,
  p.product_url,
  p.image_url,
  p.is_active,
  latest.price          as current_price,
  latest.available      as currently_available,
  latest.collected_at   as last_updated,
  week_ago.price        as price_7d_ago,
  case
    when week_ago.price is null or week_ago.price = 0 then null
    else round(((latest.price - week_ago.price) / week_ago.price * 100)::numeric, 2)
  end as variation_7d_pct
from products p
left join lateral (
  select price, available, collected_at
  from price_history
  where product_id = p.id
  order by collected_at desc
  limit 1
) latest on true
left join lateral (
  select price
  from price_history
  where product_id = p.id
    and collected_at <= now() - interval '7 days'
  order by collected_at desc
  limit 1
) week_ago on true;
