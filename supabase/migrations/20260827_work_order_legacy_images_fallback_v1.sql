create or replace function public.get_legacy_work_order_images_by_id(requested_work_order_id uuid)
returns jsonb
language sql
stable
security definer
set search_path to 'public', 'auth'
as $function$
  select coalesce(wo.images, '[]'::jsonb)
  from public.work_orders wo
  where wo.id = requested_work_order_id
    and wo.company_id = public.current_company_id()
    and public.current_user_has_permission('workOrders.view')
  limit 1;
$function$;
