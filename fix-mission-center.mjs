import fs from "node:fs"; import path from "node:path";
const rel="src/components/MissionCenter.tsx", file=path.join(process.cwd(),rel); let t=fs.readFileSync(file,"utf8");
const old=`        const [customers, orders, offers, employees, calendar, inventory, flags] =
          await Promise.all([
            getCustomers(), getWorkOrders(), getOffers(), getEmployees(),
            getCalendarEventCount(), getInventoryItemCount(), getMissionFlags(),
          ])

        if (!cancelled) {
          setData({
            customers: customers.length,
            orders: orders.length,
            offers: offers.length,
            employees: employees.length,
            calendar,
            inventory,
            aiOpened: flags.aiOpened,
            celebrationSeen: flags.celebrationSeen,
          })
        }`;
const neu=`        const results = await Promise.allSettled([
          getCustomers(), getWorkOrders(), getOffers(), getEmployees(),
          getCalendarEventCount(), getInventoryItemCount(), getMissionFlags(),
        ])

        if (!cancelled) {
          const valueOr = <T,>(index: number, fallback: T): T => {
            const result = results[index]
            if (result?.status === 'fulfilled') return result.value as T
            if (result?.status === 'rejected') console.error('Mission Center task load:', result.reason)
            return fallback
          }
          const customers = valueOr<any[]>(0, [])
          const orders = valueOr<any[]>(1, [])
          const offers = valueOr<any[]>(2, [])
          const employees = valueOr<any[]>(3, [])
          const calendar = valueOr<number>(4, 0)
          const inventory = valueOr<number>(5, 0)
          const flags = valueOr(6, { aiOpened: false, celebrationSeen: false })
          setData({ customers: customers.length, orders: orders.length, offers: offers.length, employees: employees.length, calendar, inventory, aiOpened: flags.aiOpened, celebrationSeen: flags.celebrationSeen })
        }`;
if(!t.includes(old)) throw new Error("Load blok nije pronađen"); t=t.replace(old,neu);
const old2=`    void load()
    window.addEventListener('focus', load)
    window.addEventListener('fersys:mission-refresh', load)

    return () => {
      cancelled = true
      window.removeEventListener('focus', load)
      window.removeEventListener('fersys:mission-refresh', load)
    }`;
const new2=`    void load()
    const refresh = () => { void load() }
    window.addEventListener('focus', refresh)
    window.addEventListener('pageshow', refresh)
    window.addEventListener('storage', refresh)
    window.addEventListener('fersys:mission-refresh', refresh)
    return () => {
      cancelled = true
      window.removeEventListener('focus', refresh)
      window.removeEventListener('pageshow', refresh)
      window.removeEventListener('storage', refresh)
      window.removeEventListener('fersys:mission-refresh', refresh)
    }`;
if(!t.includes(old2)) throw new Error("Refresh blok nije pronađen"); t=t.replace(old2,new2); fs.writeFileSync(file,t,"utf8"); console.log("✓ Mission Center popravljen. Pokreni npm run build");
