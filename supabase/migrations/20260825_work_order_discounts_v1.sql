alter table public.work_orders
  add column if not exists discount_rate numeric not null default 0;

alter table public.work_orders
  drop constraint if exists work_orders_discount_rate_range;

alter table public.work_orders
  add constraint work_orders_discount_rate_range
  check (discount_rate >= 0 and discount_rate <= 100);

create or replace function public.get_secure_work_orders()
returns setof jsonb
language sql
stable
security definer
set search_path to 'public', 'auth'
as $function$
  select
    to_jsonb(wo) ||
    case
      when public.current_user_has_permission(
        'workOrders.viewPrices'
      )
      then '{}'::jsonb
      else jsonb_build_object(
        'materials',
        coalesce(
          (
            select jsonb_agg(
              material ||
              jsonb_build_object(
                'unitPrice', 0,
                'discountRate', 0
              )
            )
            from jsonb_array_elements(
              coalesce(
                wo.materials,
                '[]'::jsonb
              )
            ) material
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
  where wo.company_id =
    public.current_company_id()
    and public.current_user_has_permission(
      'workOrders.view'
    )
  order by
    wo.work_date desc,
    wo.created_at desc;
$function$;
