alter table public.teams enable row level security;
alter table public.matches enable row level security;

alter publication supabase_realtime add table public.teams;
alter publication supabase_realtime add table public.matches;

drop policy if exists "Public can read teams" on public.teams;
drop policy if exists "Authenticated users can manage teams" on public.teams;
drop policy if exists "Public can read matches" on public.matches;
drop policy if exists "Authenticated users can manage matches" on public.matches;
drop policy if exists "Authenticated users can insert matches" on public.matches;
drop policy if exists "Authenticated users can update matches" on public.matches;
drop policy if exists "Authenticated users can delete matches" on public.matches;

create policy "Public can read teams"
on public.teams
for select
to anon, authenticated
using (true);

create policy "Authenticated users can manage teams"
on public.teams
for all
to authenticated
using (true)
with check (true);

create policy "Public can read matches"
on public.matches
for select
to anon, authenticated
using (true);

create policy "Authenticated users can insert matches"
on public.matches
for insert
to authenticated
with check (true);

create policy "Authenticated users can update matches"
on public.matches
for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can delete matches"
on public.matches
for delete
to authenticated
using (true);

create or replace function public.reset_tournament()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.matches where id is not null;
end;
$$;

grant execute on function public.reset_tournament() to authenticated;

create policy "Public can read logos"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'logo');

create policy "Authenticated users can upload logos"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'logo');

create policy "Authenticated users can delete logos"
on storage.objects
for delete
to authenticated
using (bucket_id = 'logo');
