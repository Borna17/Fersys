import { getCustomers } from './customers.service'
import { getEmployees } from './employees.service'
import { getCalendarEvents } from './calendar.service'
import { getInventoryItems, getInventoryMovements } from './inventory.service'
import { getWorkOrders } from './workOrders.service'
import { getOffers } from './offers.service'
import { getInvoices } from './invoices.service'
import { getVehicles, getVehicleExpenses, getVehicleServices } from './vehicles.service'
import { getTodayHourlyWeatherForCurrentLocation } from './weather.service'

export type BusinessIntelligenceAnswer = {
  message: string
  proposedAction: null
  clientAction: { type: 'navigate'; payload: { route: string } } | null
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('hr-HR')
    .replace(/\s+/g, ' ')
    .trim()
}

function today() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Zagreb',
  }).format(new Date())
}

function addDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T12:00:00`)
  date.setDate(date.getDate() + days)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Zagreb',
  }).format(date)
}

function money(value: number) {
  return new Intl.NumberFormat('hr-HR', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number.isFinite(value) ? value : 0)
}

function answer(message: string, route?: string): BusinessIntelligenceAnswer {
  return {
    message,
    proposedAction: null,
    clientAction: route
      ? { type: 'navigate', payload: { route } }
      : null,
  }
}

function offerValue(offer: any) {
  return (Array.isArray(offer.items) ? offer.items : []).reduce(
    (sum: number, item: any) => {
      const quantity = Number(item.quantity) || 0
      const price = Number(item.price) || 0
      const discount = Math.min(100, Math.max(0, Number(item.discount) || 0))
      const vat = Math.min(100, Math.max(0, Number(item.vat) || 0))
      const net = quantity * price * (1 - discount / 100)
      return sum + net * (1 + vat / 100)
    },
    0,
  )
}

function missingWorkOrderFields(order: any) {
  const missing: string[] = []
  if (!String(order.customerName ?? '').trim()) missing.push('investitor')
  if (!String(order.address ?? '').trim()) missing.push('adresa')
  if (!String(order.title ?? '').trim()) missing.push('naziv radova')
  if (!String(order.description ?? '').trim()) missing.push('opis radova')
  if (!String(order.date ?? '').trim()) missing.push('datum')
  if (!String(order.arrivalTime ?? '').trim()) missing.push('dolazak')
  if (!String(order.departureTime ?? '').trim()) missing.push('odlazak')
  return missing
}

function missingOfferFields(offer: any) {
  const missing: string[] = []
  if (!String(offer.customerName ?? '').trim()) missing.push('investitor')
  if (!String(offer.date ?? '').trim()) missing.push('datum')
  if (!String(offer.validUntil ?? '').trim()) missing.push('valjanost')
  if (!String(offer.description ?? '').trim()) missing.push('opis')
  if (!Array.isArray(offer.items) || offer.items.length === 0) missing.push('stavke')
  else if (offer.items.some((item: any) => !String(item.name ?? '').trim() || Number(item.quantity) <= 0)) {
    missing.push('neispravna stavka')
  }
  return missing
}

function isPaidInvoice(invoice: any) {
  const status = normalize(String(invoice.status ?? ''))
  return status.includes('placeno') || status === 'paid' || Boolean(invoice.paidAt)
}

export async function tryBusinessIntelligenceQuestion(
  rawMessage: string,
): Promise<BusinessIntelligenceAnswer | null> {
  const n = normalize(rawMessage)

  if (/\b(vrijeme|vremenska|prognoza|kisa|snijeg|temperatura)\b/.test(n)) {
    const weather = await getTodayHourlyWeatherForCurrentLocation()
    const timeline = weather.hours.filter((_, index) => index % 2 === 0).slice(0, 8).map((point) => {
      const clock = point.time.slice(11, 16)
      const rain = point.precipitationProbabilityPct >= 20 ? ' · oborine ' + point.precipitationProbabilityPct + '%' : ''
      return '• ' + clock + ': ' + point.temperatureC.toFixed(0) + ' °C · ' + point.condition + rain + ' · vjetar ' + point.windKmh.toFixed(0) + ' km/h'
    })
    const rainSummary = weather.rainWindows.length
      ? 'Moguće oborine: ' + weather.rainWindows.map((window) => window.from.slice(11,16) + '–' + window.to.slice(11,16) + ' (do ' + window.maxProbabilityPct + '%)').join(', ') + '.'
      : 'Prema satnoj prognozi nema izraženog razdoblja oborina do kraja dana.'
    return answer([
      'Trenutačno: ' + weather.temperatureC.toFixed(1) + ' °C, ' + weather.condition.toLocaleLowerCase('hr-HR') + '.',
      weather.minC !== null && weather.maxC !== null ? 'Danas: ' + weather.minC.toFixed(1) + '–' + weather.maxC.toFixed(1) + ' °C.' : '',
      rainSummary,
      timeline.length ? 'Prognoza kroz ostatak dana:' : '',
      ...timeline,
    ].filter(Boolean).join('\n'))
  }

  if (/(prikazi|pokazi|izlistaj|navedi|svi|sve).*(investitor|kupac|klijent)/.test(n)) {
    const customers = await getCustomers()
    if (!customers.length) return answer('Nema evidentiranih investitora.', '/customers')
    return answer(
      `Investitori (${customers.length}):\n` +
        customers.map((customer, index) =>
          `${index + 1}. ${customer.name}${customer.city ? ` · ${customer.city}` : ''}${customer.status ? ` · ${customer.status}` : ''}`,
        ).join('\n'),
      '/customers',
    )
  }

  if (/(prikazi|pokazi|izlistaj|navedi|svi|sve).*(zaposlen|radnik|djelatnik)/.test(n)) {
    const employees = await getEmployees()
    if (!employees.length) return answer('Nema evidentiranih zaposlenika.', '/employees')
    return answer(
      `Zaposlenici (${employees.length}):\n` +
        employees.map((employee, index) =>
          `${index + 1}. ${employee.fullName} · ${employee.role} · ${employee.status}`,
        ).join('\n'),
      '/employees',
    )
  }

  if (/\b(skladist|zalihe|artikl|materijal).*(fali|nedostaje|premalo|minimum|kritic|stanje)\b|\bcega (fali|nedostaje)\b/.test(n)) {
    const items = await getInventoryItems()
    const low = items
      .filter((item) => item.quantity <= item.minimumQuantity)
      .sort((a, b) => (a.quantity - a.minimumQuantity) - (b.quantity - b.minimumQuantity))
    const abundant = [...items]
      .filter((item) => item.quantity > item.minimumQuantity)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)
    const lines = [
      `Skladište: ${items.length} artikala.`,
      '',
      low.length ? `Ispod ili na minimumu (${low.length}):` : 'Nema artikala ispod zadanog minimuma.',
      ...low.slice(0, 20).map((item) => `• ${item.name}: ${item.quantity} ${item.unit} (minimum ${item.minimumQuantity})`),
      '',
      abundant.length ? 'Najviše na zalihi:' : '',
      ...abundant.map((item) => `• ${item.name}: ${item.quantity} ${item.unit}`),
    ].filter((line, index, arr) => line !== '' || arr[index - 1] !== '')
    return answer(lines.join('\n'), '/inventory')
  }

  if (/\b(najvise|najcesce).*(korist|tros|izlaz|materijal|artikl)|\bsta se najvise koristilo\b/.test(n)) {
    const [items, movements] = await Promise.all([getInventoryItems(), getInventoryMovements()])
    const itemNames = new Map(items.map((item) => [item.id, item.name]))
    const from = addDays(today(), -30)
    const usage = new Map<string, number>()
    movements
      .filter((movement) => movement.type === 'exit' && movement.createdAt.slice(0, 10) >= from)
      .forEach((movement) => usage.set(movement.itemId, (usage.get(movement.itemId) ?? 0) + Math.abs(movement.quantity)))
    const ranked = [...usage.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)
    return answer(
      ranked.length
        ? `Najviše korišteni artikli u zadnjih 30 dana:\n${ranked.map(([id, quantity], index) => `${index + 1}. ${itemNames.get(id) ?? id}: ${quantity}`).join('\n')}`
        : 'U zadnjih 30 dana nema evidentiranih izlaza materijala iz skladišta.',
      '/inventory/movements',
    )
  }

  if (/\b(slobodan|slobodni|slobodne|slobodno).*(dan|termin)|\bkoje dane.*slobod/.test(n)) {
    const start = today()
    const end = addDays(start, 13)
    const events = await getCalendarEvents(start, end)
    const busy = new Set(events.filter((event) => event.status !== 'Otkazano').map((event) => event.date))
    const free: string[] = []
    for (let i = 0; i < 14; i += 1) {
      const date = addDays(start, i)
      if (!busy.has(date)) free.push(date)
    }
    return answer(
      free.length
        ? `Potpuno slobodni dani u sljedećih 14 dana:\n${free.map((date) => `• ${date}`).join('\n')}`
        : 'U sljedećih 14 dana nema potpuno praznog dana u kalendaru.',
      '/calendar',
    )
  }

  if (/\b(najvise|najopterecen|najzauzet).*(kalendar|zapis|termin|posao|dan)/.test(n)) {
    const start = today()
    const end = addDays(start, 30)
    const events = await getCalendarEvents(start, end)
    const counts = new Map<string, number>()
    events.filter((event) => event.status !== 'Otkazano').forEach((event) => counts.set(event.date, (counts.get(event.date) ?? 0) + 1))
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7)
    return answer(
      ranked.length
        ? `Najzauzetiji dani u idućih 30 dana:\n${ranked.map(([date, count], i) => `${i + 1}. ${date}: ${count} termina`).join('\n')}`
        : 'U idućih 30 dana nema termina u kalendaru.',
      '/calendar',
    )
  }

  if (/\b(radni nalog|nalozi).*(nije dovrs|nezavrs|otvoren|kasni)|\bkoji nalozi.*nisu.*dovrs/.test(n)) {
    const orders = await getWorkOrders()
    const unfinished = orders.filter((order) => !['Završen', 'Otkazan'].includes(order.status))
    return answer(
      unfinished.length
        ? `Nezavršeni radni nalozi (${unfinished.length}):\n${unfinished.map((order) => `• ${order.orderNumber} · ${order.customerName} · ${order.status} · ${order.date}`).join('\n')}`
        : 'Svi radni nalozi su završeni ili otkazani.',
      '/work-orders',
    )
  }

  if (/\b(radni nalog|nalozi).*(fali|nedostaje|nepotpun)|\bsta fali.*nalog/.test(n)) {
    const orders = await getWorkOrders()
    const incomplete = orders
      .map((order) => ({ order, missing: missingWorkOrderFields(order) }))
      .filter((item) => item.missing.length)
    return answer(
      incomplete.length
        ? `Radni nalozi kojima nedostaju osnovni podaci (${incomplete.length}):\n${incomplete.slice(0, 30).map(({ order, missing }) => `• ${order.orderNumber} · ${order.customerName}: ${missing.join(', ')}`).join('\n')}`
        : 'Svi radni nalozi imaju unesene osnovne podatke.',
      '/work-orders',
    )
  }

  if (/\b(radni nalog|nalozi).*(nije plac|neplac|placanje)|\bkoji nalozi.*nisu.*plac/.test(n)) {
    const [orders, invoices] = await Promise.all([getWorkOrders(), getInvoices<any>()])
    const paidWorkOrderIds = new Set(
      invoices.filter(isPaidInvoice).map((invoice: any) => String(invoice.sourceWorkOrderId ?? invoice.data?.sourceWorkOrderId ?? '')).filter(Boolean),
    )
    const candidates = orders.filter((order) => order.status === 'Završen' && !paidWorkOrderIds.has(order.id))
    return answer(
      candidates.length
        ? `Završeni radni nalozi bez evidentiranog plaćenog povezanog računa (${candidates.length}):\n${candidates.map((order) => `• ${order.orderNumber} · ${order.customerName} · ${money(order.totalPrice)}`).join('\n')}\n\nNapomena: radni nalog sam po sebi nema status plaćanja; provjeravam povezane račune.`
        : 'Ne nalazim završene radne naloge bez evidentiranog plaćenog povezanog računa.',
      '/work-orders',
    )
  }

  if (/\b(ponud|ponuda|ponude).*(fali|nedostaje|nepotpun)/.test(n)) {
    const offers = await getOffers()
    const incomplete = offers
      .map((offer) => ({ offer, missing: missingOfferFields(offer) }))
      .filter((item) => item.missing.length)
    return answer(
      incomplete.length
        ? `Nepotpune ponude (${incomplete.length}):\n${incomplete.slice(0, 30).map(({ offer, missing }) => `• ${offer.offerNumber} · ${offer.customerName}: ${missing.join(', ')}`).join('\n')}`
        : 'Sve ponude imaju osnovne podatke i stavke.',
      '/offers',
    )
  }

  if (/\b(ponud|ponuda|ponude).*(poslan|nije poslan|neposlan)/.test(n)) {
    const offers = await getOffers()
    const sent = offers.filter((offer) => Boolean(offer.sentAt) || ['Poslano', 'Pregledano', 'Prihvaćeno', 'Odbijeno'].includes(offer.status))
    const unsent = offers.filter((offer) => !sent.includes(offer))
    if (/nije poslan|neposlan/.test(n)) {
      return answer(
        unsent.length ? `Neposlane ponude (${unsent.length}):\n${unsent.map((offer) => `• ${offer.offerNumber} · ${offer.customerName} · ${offer.status}`).join('\n')}` : 'Nema neposlanih ponuda.',
        '/offers',
      )
    }
    return answer(`Poslane ponude: ${sent.length}. Neposlane: ${unsent.length}.`, '/offers')
  }

  if (/\b(zadnja|zadnju|najnovija|posljednja).*(ponud)/.test(n)) {
    const offers = await getOffers()
    const latest = [...offers].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
    return answer(latest ? `Zadnja ponuda je ${latest.offerNumber} · ${latest.customerName} · ${latest.status} · ${money(offerValue(latest))}.` : 'Nema ponuda.', latest ? `/offers/${latest.id}` : '/offers')
  }

  if (/\b(najbolj|najvec|najvrjedn|najvredn).*(ponud)/.test(n)) {
    const offers = await getOffers()
    const ranked = [...offers]
      .map((offer) => ({ offer, value: offerValue(offer) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
    const accepted = ranked.filter(({ offer }) => offer.status === 'Prihvaćeno')
    return answer(
      ranked.length
        ? `Ako “najbolje” gledamo po ukupnoj vrijednosti, vrh je:\n${ranked.map(({ offer, value }, i) => `${i + 1}. ${offer.offerNumber} · ${offer.customerName} · ${money(value)} · ${offer.status}`).join('\n')}\n\nOd ovih je prihvaćeno ${accepted.length}. Mogu ti odvojeno analizirati uspješnost ponuda po stopi prihvaćanja.`
        : 'Nema ponuda za analizu.',
      '/offers',
    )
  }

  if (/\b(vozil|auto|kombi).*(najvise|najvec).*(goriv|trosi|trosak)/.test(n)) {
    const vehicles = await getVehicles()
    const stats = await Promise.all(
      vehicles.map(async (vehicle) => {
        const expenses = await getVehicleExpenses(vehicle.id)
        const fuel = expenses.filter((expense) => expense.category === 'Gorivo')
        return {
          vehicle,
          fuelCost: fuel.reduce((sum, expense) => sum + expense.amount, 0),
          fuelEntries: fuel.length,
        }
      }),
    )
    stats.sort((a, b) => b.fuelCost - a.fuelCost)
    return answer(
      stats.length
        ? `Trošak goriva po vozilima:\n${stats.map((item, i) => `${i + 1}. ${item.vehicle.registration} · ${item.vehicle.make} ${item.vehicle.model}: ${money(item.fuelCost)} (${item.fuelEntries} zapisa)`).join('\n')}\n\nOvo je rang po evidentiranom trošku goriva, ne po l/100 km jer za to trebamo litre i kilometre između točenja.`
        : 'Nema vozila za analizu.',
      '/vehicles',
    )
  }

  if (/\b(provjeri|analiziraj|pregledaj).*(poslov|stanje|probleme|upozorenja)|\bsta nije dobro|\bima li problema/.test(n)) {
    const [orders, offers, invoices, items, vehicles] = await Promise.all([
      getWorkOrders(),
      getOffers(),
      getInvoices<any>(),
      getInventoryItems(),
      getVehicles(),
    ])
    const now = today()
    const last14Start = addDays(now, -13)
    const previousStart = addDays(now, -27)
    const previousEnd = addDays(now, -14)
    const currentCount = orders.filter((order) => order.date >= last14Start && order.date <= now).length
    const previousCount = orders.filter((order) => order.date >= previousStart && order.date <= previousEnd).length
    const dropPct = previousCount > 0 ? Math.round((1 - currentCount / previousCount) * 100) : 0
    const overdueOrders = orders.filter((order) => order.date < now && !['Završen', 'Otkazan'].includes(order.status))
    const incompleteOrders = orders.filter((order) => missingWorkOrderFields(order).length > 0)
    const incompleteOffers = offers.filter((offer) => missingOfferFields(offer).length > 0)
    const lowStock = items.filter((item) => item.quantity <= item.minimumQuantity)
    const unpaidOverdueInvoices = invoices.filter((invoice: any) => !isPaidInvoice(invoice) && String(invoice.dueDate ?? invoice.data?.dueDate ?? '') < now && String(invoice.dueDate ?? invoice.data?.dueDate ?? ''))
    const vehicleWarnings: string[] = []
    await Promise.all(vehicles.map(async (vehicle) => {
      const services = await getVehicleServices(vehicle.id)
      if (vehicle.nextServiceDate && vehicle.nextServiceDate <= addDays(now, 14)) vehicleWarnings.push(`${vehicle.registration}: servis ${vehicle.nextServiceDate}`)
      if (!services.length && vehicle.mileage > 0) vehicleWarnings.push(`${vehicle.registration}: nema evidentiranog servisa`)
    }))
    const lines = ['FERSYS poslovna provjera:']
    if (previousCount >= 4 && dropPct >= 30) lines.push(`• Posla je u zadnjih 14 dana ${dropPct}% manje nego u prethodnih 14 dana (${currentCount} prema ${previousCount} naloga).`)
    if (overdueOrders.length) lines.push(`• ${overdueOrders.length} ranijih radnih naloga još nije završeno.`)
    if (incompleteOrders.length) lines.push(`• ${incompleteOrders.length} radnih naloga nema sve osnovne podatke.`)
    if (incompleteOffers.length) lines.push(`• ${incompleteOffers.length} ponuda nije potpuno popunjeno.`)
    if (lowStock.length) lines.push(`• ${lowStock.length} artikala je na ili ispod minimalne zalihe.`)
    if (unpaidOverdueInvoices.length) lines.push(`• ${unpaidOverdueInvoices.length} računa je dospjelo, a nisu evidentirani kao plaćeni.`)
    vehicleWarnings.slice(0, 5).forEach((warning) => lines.push(`• Vozilo: ${warning}.`))
    if (lines.length === 1) lines.push('• Ne nalazim veće probleme prema trenutno evidentiranim podacima.')
    return answer(lines.join('\n'))
  }

  return null
}
