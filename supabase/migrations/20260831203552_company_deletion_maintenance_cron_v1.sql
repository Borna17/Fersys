do $$
declare existing_job bigint;
begin
  select jobid into existing_job
  from cron.job
  where jobname = 'fersys-company-deletion-maintenance-hourly'
  limit 1;

  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;
end $$;

select cron.schedule(
  'fersys-company-deletion-maintenance-hourly',
  '23 * * * *',
  $$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name='fersys_push_project_url' limit 1) || '/functions/v1/company-deletion-maintenance',
      headers := jsonb_build_object('Content-Type','application/json'),
      body := jsonb_build_object('source','cron')
    );
  $$
);
