import { supabase } from '../lib/supabase'
import type {
  CloudWorkOrderStatus,
} from './workOrders.service'

export async function updateWorkOrderQuickStatus(
  workOrderId: string,
  status: CloudWorkOrderStatus,
): Promise<void> {
  const { error } = await supabase
    .from('work_orders')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', workOrderId)

  if (error) {
    throw new Error(
      `Status radnog naloga nije moguće spremiti: ${error.message}`,
    )
  }
}
