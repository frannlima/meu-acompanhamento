-- Aplicado no Supabase do Meu Acompanhamento em 2026-11-04.
create table if not exists public.branch_manager_avatars (
 branch_code text primary key references public.stores(code),
 manager_name text not null,
 images jsonb not null default '{}'::jsonb,
 enabled boolean not null default true,
 updated_at timestamptz not null default now(),
 constraint branch_avatar_images_object check(jsonb_typeof(images)='object')
);
alter table public.branch_manager_avatars enable row level security;
revoke all on public.branch_manager_avatars from anon, authenticated;
comment on table public.branch_manager_avatars is 'Gerentes e expressoes de avatares por filial; acesso via API administrativa autorizada.';
-- Nenhuma foto foi cadastrada; a API deverá validar a permissão ADM no servidor.
