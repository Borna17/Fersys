select cron.schedule('fersys-weather-morning-every-hour','0 * * * *',$$
select net.http_post(
 url := (select decrypted_secret from vault.decrypted_secrets where name='fersys_push_project_url' limit 1) || '/functions/v1/weather-morning',
 headers := jsonb_build_object('Content-Type','application/json','x-fersys-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='fersys_push_cron_secret' limit 1)),
 body := jsonb_build_object('source','cron')
);
$$);
