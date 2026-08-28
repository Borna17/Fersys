import { CloudSun, MapPin, Search, Send, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getWeatherPreferences, saveWeatherPreferences, searchWeatherCity, type WeatherPreferences } from '../../services/weatherPreferences.service'
import { enablePushNotifications } from '../../services/pushNotifications.service'
import { supabase } from '../../lib/supabase'

type GeoResult = { name:string; latitude:number; longitude:number; timezone?:string; admin1?:string; country?:string }

export default function WeatherMorningSettingsCard() {
  const [prefs,setPrefs]=useState<WeatherPreferences>({city:'',latitude:null,longitude:null,timezone:'Europe/Zagreb',enabled:true,hour:6})
  const [query,setQuery]=useState('')
  const [results,setResults]=useState<GeoResult[]>([])
  const [loading,setLoading]=useState(true)
  const [searching,setSearching]=useState(false)
  const [saving,setSaving]=useState(false)
  const [testing,setTesting]=useState(false)
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')

  useEffect(()=>{ void (async()=>{ try { const value=await getWeatherPreferences(); setPrefs(value); setQuery(value.city) } catch(e){ setError(e instanceof Error?e.message:'Postavke vremena nije moguće učitati.') } finally { setLoading(false) } })() },[])

  async function findCity(){
    if(query.trim().length<2)return
    try { setSearching(true); setError(''); setMessage(''); setResults(await searchWeatherCity(query)) }
    catch(e){ setError(e instanceof Error?e.message:'Grad nije moguće pronaći.') }
    finally { setSearching(false) }
  }

  function chooseCity(city:GeoResult){
    setPrefs({...prefs,city:city.name,latitude:city.latitude,longitude:city.longitude,timezone:city.timezone||'Europe/Zagreb'})
    setQuery(city.name); setResults([]); setMessage(`Odabrano: ${city.name}${city.admin1?`, ${city.admin1}`:''}`)
  }

  async function save(){
    if(!prefs.city||prefs.latitude===null||prefs.longitude===null){ setError('Prvo pronađi i odaberi grad.'); return }
    try { setSaving(true); setError(''); await saveWeatherPreferences(prefs); setMessage('Jutarnja prognoza je spremljena.') }
    catch(e){ setError(e instanceof Error?e.message:'Postavke nije moguće spremiti.') }
    finally { setSaving(false) }
  }

  async function testPush(){
    if(!prefs.city||prefs.latitude===null||prefs.longitude===null){ setError('Prvo spremi grad za prognozu.'); return }
    try {
      setTesting(true); setError(''); setMessage('')
      await saveWeatherPreferences(prefs)

      const pushState = await enablePushNotifications()
      if(pushState !== 'subscribed'){
        if(pushState === 'denied') throw new Error('Obavijesti su blokirane na ovom uređaju. Uključi ih u postavkama telefona ili preglednika pa pokušaj ponovno.')
        if(pushState === 'unsupported') throw new Error('Push obavijesti nisu dostupne na ovom uređaju ili u ovom načinu rada.')
        if(pushState === 'missing-key') throw new Error('Firebase Web Push nije potpuno konfiguriran.')
        throw new Error('FERSYS nije uspio registrirati ovaj uređaj za push obavijesti.')
      }

      const { data, error: invokeError }=await supabase.functions.invoke('weather-morning',{body:{test:true}})
      if(invokeError){
        let detail=''
        const context=(invokeError as {context?:Response}).context
        if(context){
          try {
            const body=await context.clone().json() as {error?:string;message?:string}
            detail=body.error||body.message||''
          } catch { /* response body is optional */ }
        }
        throw new Error(detail||invokeError.message)
      }
      if(!data?.ok)throw new Error(data?.error||data?.message||'Firebase nije prihvatio testnu obavijest ni za jedan uređaj.')
      setMessage(data?.message || `Firebase je prihvatio test za ${data?.sent ?? 1} uređaj(a).`)
    } catch(e){ setError(e instanceof Error?e.message:'Testnu prognozu nije moguće poslati.') }
    finally { setTesting(false) }
  }

  if(loading)return <div className="xl:col-span-2 rounded-3xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">Učitavanje vremenskih postavki...</div>

  return <div className="xl:col-span-2 rounded-3xl border border-blue-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/30 p-5 sm:p-6">
    <div className="flex items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-500/10 text-blue-400"><CloudSun size={23}/></div><div><h3 className="text-lg font-black text-white">Jutarnja vremenska prognoza</h3><p className="mt-1 text-sm leading-6 text-slate-400">FERSYS ti svaki dan u 06:00 šalje prognozu za odabrani grad.</p></div></div>
    <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
      <label className="flex items-center justify-between gap-4"><div><p className="font-bold text-white">Prognoza u 06:00</p><p className="mt-1 text-sm text-slate-400">Automatska push obavijest s temperaturom, kišom i vjetrom.</p></div><input type="checkbox" checked={prefs.enabled} onChange={e=>setPrefs({...prefs,enabled:e.target.checked})} className="h-5 w-5 accent-blue-600"/></label>
    </div>
    <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
      <div><label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">Grad za prognozu</label><div className="relative"><MapPin className="absolute left-3 top-3.5 text-slate-500" size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();void findCity()}}} placeholder="npr. Zagreb, Split, Slavonski Brod" className="h-12 w-full rounded-xl border border-slate-700 bg-slate-950 pl-10 pr-3 text-sm text-white outline-none focus:border-blue-500"/></div></div>
      <button type="button" onClick={()=>void findCity()} disabled={searching||query.trim().length<2} className="mt-auto flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-800 px-5 text-sm font-black text-white disabled:opacity-50"><Search size={17}/>{searching?'Traženje...':'Pronađi'}</button>
    </div>
    {results.length>0&&<div className="mt-3 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">{results.map((r,i)=><button key={`${r.latitude}-${r.longitude}-${i}`} type="button" onClick={()=>chooseCity(r)} className="flex w-full items-center justify-between border-b border-slate-800 px-4 py-3 text-left last:border-0 hover:bg-slate-900"><span><span className="font-bold text-white">{r.name}</span><span className="ml-2 text-sm text-slate-500">{[r.admin1,r.country].filter(Boolean).join(', ')}</span></span><span className="text-xs text-blue-400">Odaberi</span></button>)}</div>}
    {prefs.city&&<div className="mt-4 grid gap-3 sm:grid-cols-3"><Info label="Odabrani grad" value={prefs.city}/><Info label="Vremenska zona" value={prefs.timezone}/><Info label="Vrijeme slanja" value="06:00"/></div>}
    {error&&<p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
    {message&&<p className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{message}</p>}
    <div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={()=>void save()} disabled={saving} className="flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white disabled:opacity-50"><Save size={17}/>{saving?'Spremanje...':'Spremi prognozu'}</button><button type="button" onClick={()=>void testPush()} disabled={testing||!prefs.enabled} className="flex h-11 items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-5 text-sm font-black text-white disabled:opacity-50"><Send size={17}/>{testing?'Registracija i slanje...':'Pošalji testnu prognozu'}</button></div>
  </div>
}

function Info({label,value}:{label:string;value:string}){return <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3"><p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 truncate text-sm font-bold text-white">{value}</p></div>}
