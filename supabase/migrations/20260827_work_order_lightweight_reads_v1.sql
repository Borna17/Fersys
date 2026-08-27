-- Lightweight work-order reads.
-- Images are intentionally excluded from the primary RPC payload because legacy
-- work orders can contain multi-megabyte base64 data URLs in work_orders.images.

create or replace function public.get_secure_work_order_by_id(requested_work_order_id uuid)
returns setof jsonb
language sql
stable
security definer
set search_path to 'public', 'auth'
as $function$
  with access as (
    select
      public.current_company_id() as company_id,
      public.current_user_has_permission('workOrders.view') as can_view,
      public.current_user_has_permission('workOrders.viewPrices') as can_view_prices
  )
  select
    (to_jsonb(wo) - 'images') ||
    jsonb_build_object('images', '[]'::jsonb) ||
    case
      when access.can_view_prices then '{}'::jsonb
      else jsonb_build_object(
        'materials',
        coalesce(
          (
            select jsonb_agg(
              material || jsonb_build_object(
                'unitPrice', 0,
                'discountRate', 0
              )
            )
            from jsonb_array_elements(coalesce(wo.materials, '[]'::jsonb)) material
          ),
          '[]'::jsonb
        ),
        'labour_price', 0,
        'material_price', 0,
        'discount_rate', 0,
        'vat_rate', 0,
        'total_price', 0,
        'price_note', null
      )
    end
  from public.work_orders wo
  cross join access
  where wo.id = requested_work_order_id
    and wo.company_id = access.company_id
    and access.can_view
  limit 1;
$function$;

create or replace function public.get_secure_work_orders()
returns setof jsonb
language sql
stable
security definer
set search_path to 'public', 'auth'
as $function$
  select
    (to_jsonb(wo) - 'images') ||
    jsonb_build_object('images', '[]'::jsonb) ||
    case
      when public.current_user_has_permission('workOrders.viewPrices') then '{}'::jsonb
      else jsonb_build_object(
        'materials',
        coalesce(
          (
            select jsonb_agg(
              material || jsonb_build_object(
                'unitPrice', 0,
                'discountRate', 0
              )
            )
            from jsonb_array_elements(coalesce(wo.materials, '[]'::jsonb)) material
          ),
          '[]'::jsonb
        ),
        'labour_price', 0,
        'material_price', 0,
        'discount_rate', 0,
        'vat_rate', 0,
        'total_price', 0,
        'price_note', null
      )
    end
  from public.work_orders wo
  where wo.company_id = public.current_company_id()
    and public.current_user_has_permission('workOrders.view')
  order by wo.work_date desc, wo.created_at desc;
$function$;
