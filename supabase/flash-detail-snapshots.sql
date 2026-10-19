create table if not exists public.flash_detail_snapshots (
 id bigint generated always as identity primary key,
 kind text not null check (kind in ('flash-departments','flash-products','flash-photos','flash-exchanges')),
 business_date date not null,
 store_code text not null,
 dco_code integer not null default 0,
 scope text not null default '',
 collected_at timestamptz not null,
 received_at timestamptz not null default now(),
 rows jsonb not null check(jsonb_typeof(rows)='array' and jsonb_array_length(rows) between 1 and 300),
 content_hash text not null check(length(content_hash)=64),
 collected_by text not null,
 unique(kind,business_date,store_code,dco_code,scope,content_hash)
);
create index if not exists flash_detail_day_store_time on public.flash_detail_snapshots(business_date,store_code,collected_at desc);
alter table public.flash_detail_snapshots enable row level security;
revoke all on public.flash_detail_snapshots from anon,authenticated;
grant all on public.flash_detail_snapshots to service_role;
grant usage,select on sequence public.flash_detail_snapshots_id_seq to service_role;
comment on table public.flash_detail_snapshots is 'Indicadores operacionais Flash por DCO e produto. Somente flash-sync com identidade verificada. Não é venda contábil.';
