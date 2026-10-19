create table if not exists public.flash_snapshots (
 id bigint generated always as identity primary key,
 business_date date not null,
 collected_at timestamptz not null,
 received_at timestamptz not null default now(),
 rows jsonb not null check(jsonb_typeof(rows)='array' and jsonb_array_length(rows) between 1 and 18),
 content_hash text not null check(length(content_hash)=64),
 collected_by text not null,
 unique(business_date,content_hash)
);
create index if not exists flash_snapshots_day_time on public.flash_snapshots(business_date,collected_at desc);
alter table public.flash_snapshots enable row level security;
revoke all on public.flash_snapshots from anon,authenticated;
grant all on public.flash_snapshots to service_role;
grant usage,select on sequence public.flash_snapshots_id_seq to service_role;
comment on table public.flash_snapshots is 'Referências operacionais Flash; acesso via flash-sync com JWT verificado e vínculo administrativo. Não substitui venda oficial.';
