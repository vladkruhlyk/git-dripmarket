create extension if not exists pgcrypto;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_reference text not null unique,
  status text not null default 'created',
  payment_status text not null default 'pending',
  total_uah numeric(12, 2) not null default 0,
  due_now_uah numeric(12, 2) not null default 0,
  payload jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crypto_payments (
  id uuid primary key default gen_random_uuid(),
  order_reference text not null references public.orders(order_reference) on delete cascade,
  status text not null default 'pending',
  currency text not null default 'USDT',
  network text,
  receiving_address text,
  amount_usdt numeric(18, 6) not null,
  amount_uah numeric(12, 2) not null default 0,
  tx_hash text unique,
  metadata jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crypto_payments_status_check check (status in ('pending', 'detected', 'paid', 'expired', 'underpaid', 'manual_review')),
  constraint crypto_payments_currency_check check (currency = 'USDT'),
  constraint crypto_payments_network_check check (network is null or network in ('trc20', 'bep20'))
);

create index if not exists orders_order_reference_idx on public.orders(order_reference);
create index if not exists crypto_payments_order_reference_idx on public.crypto_payments(order_reference);
create index if not exists crypto_payments_status_expires_at_idx on public.crypto_payments(status, expires_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

drop trigger if exists crypto_payments_set_updated_at on public.crypto_payments;
create trigger crypto_payments_set_updated_at
before update on public.crypto_payments
for each row execute function public.set_updated_at();

alter table public.orders enable row level security;
alter table public.crypto_payments enable row level security;
