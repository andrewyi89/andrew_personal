-- Run once in the Supabase SQL editor AFTER deploying.
-- Replace both placeholders. Checks for score changes every minute.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'worldseries-poll',
  '* * * * *',
  $$ select net.http_get(
       url := 'https://YOUR-APP.vercel.app/api/worldseries',
       headers := '{"Authorization": "Bearer YOUR_CRON_SECRET"}'::jsonb
     ) $$
);
-- To remove it later: select cron.unschedule('worldseries-poll');
