-- Avatares de gerentes por filial. Executar no Supabase após revisão.
create table if not exists public.branch_manager_avatars (
  branch_code text primary key,
  manager_name text not null,
  images jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint avatar_images_object check (jsonb_typeof(images) = 'object')
);
alter table public.branch_manager_avatars enable row level security;
-- Leitura para usuários autenticados; escrita apenas via política administrativa a configurar.
create policy "authenticated read manager avatars"
on public.branch_manager_avatars for select to authenticated using (true);
-- Não criar política de escrita pública. Configurar função de autorização ADM existente.
-- Criar bucket PRIVADO manager-avatars no Supabase Storage e políticas de leitura/escrita
-- conforme os papéis já usados pelo aplicativo.
