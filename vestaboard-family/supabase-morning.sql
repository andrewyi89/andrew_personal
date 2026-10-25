-- Run once in the Supabase SQL editor. Replace YOUR_CRON_SECRET (same value as in Vercel).
insert into integrations (id) values ('morning') on conflict do nothing;

select cron.schedule(
  'morning-poll',
  '* * * * *',
  $$ select net.http_get(
       url := 'https://andrew-personal.vercel.app/api/morning',
       headers := '{"Authorization": "Bearer YOUR_CRON_SECRET"}'::jsonb
     ) $$
);
-- To remove it later: select cron.unschedule('morning-poll');
