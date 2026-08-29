import { BellRing, CloudSun, MapPin, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  getWeatherPreferences,
  saveWeatherPreferences,
  searchWeatherCity,
  sendWeatherTestNotification,
  type WeatherPreferences,
} from '../services/weatherPreferences.service'

export default function WeatherNotificationSettings(){
 const [prefs,setPrefs]=useState<WeatherPreferences>({city:'',latitude:null,longitude:null,timezone:'Europe/Zagreb',enabled:true,hour:6})
 const [query,setQuery]=useState(''); const [results,setResults]=useState<Awaited<ReturnType<typeof searchWeatherCity>>>([]); const [busy,setBusy]=useState(false); const [testing,setTesting]=useState(false); const [message,setMessage]=useState('')
 useEffect(()=>{void getWeatherPreferences().then(p=>{setPrefs(p);setQuery(p.city)}).catch(()=>{})},[])
 async function find(){try{setBusy(true);setResults(await searchWeatherCity(query));setMessage('')}catch(e){setMessage(e instanceof Error?e.message:'Pretraga nije uspjela.')}finally{setBusy(false)}}
 async function save(){if(prefs.enabled&&(!prefs.latitude||!prefs.longitude)){setMessage('Prvo odaberi grad iz rezultata pretrage.');return}try{setBusy(true);const saved=await saveWeatherPreferences(prefs);setPrefs(saved);setQuery(saved.city);setMessage('Jutarnja prognoza je spremljena.')}catch(e){setMessage(e instanceof Error?e.message:'Spremanje nije uspjelo.')}finally{setBusy(false)}}
 async function test(){if(!prefs.latitude||!prefs.longitude){setMessage('Prvo odaberi grad iz rezultata pretrage.');return}try{setTesting(true);setMessage('Registriram ovaj uređaj i šaljem testnu prognozu...');const result=await sendWeatherTestNotification(prefs);setMessage(result)}catch(e){setMessage(e instanceof Error?e.message:'Testnu prognozu nije moguće poslati.')}finally{setTesting(false)}}
 return <div className="mt-5 rounded-3xl border border-sky-500/20 bg-slate-900 p-5 sm:p-6">
  <div className="flex items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sky-500/10 text-sky-300"><CloudSun size={22}/></div><div><h2 className="font-black text-white">Jutarnja vremenska prognoza</h2><p className="mt-1 text-sm leading-6 text-slate-400">FERSYS će svaki dan u 06:00 poslati prognozu za odabrani grad. Lokacija se sprema na tvoj korisnički račun i ne prati te u pozadini.</p></div></div>
  <label className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4"><span><span className="block font-bold text-white">Prognoza u 06:00</span><span className="mt-1 block text-xs text-slate-500">Temperatura, kiša, uvjeti i vjetar.</span></span><input type="checkbox" checked={prefs.enabled} onChange={e=>setPrefs(p=>({...p,enabled:e.target.checked}))} className="h-5 w-5 accent-blue-600"/></label>
  <div className="mt-4"><label className="text-xs font-black uppercase tracking-wider text-slate-500">Grad za prognozu</label><div className="mt-2 flex gap-2"><div className="relative flex-1"><MapPin size={17} className="absolute left-3 top-3.5 text-slate-500"/><input value={query} onChange={e=>{setQuery(e.target.value);setPrefs(p=>({...p,city:e.target.value,latitude:null,longitude:null}))}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();void find()}}} placeholder="npr. Zagreb, Split, Slavonski Brod" className="min-h-11 w-full rounded-2xl border border-slate-700 bg-slate-950 pl-10 pr-3 text-sm text-white outline-none focus:border-sky-500"/></div><button type="button" onClick={()=>void find()} disabled={busy||testing} className="rounded-2xl border border-slate-700 px-4 text-sm font-black text-white disabled:opacity-50">Pronađi</button></div>
   {results.length>0&&<div className="mt-2 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">{results.map((r,i)=><button key={`${r.latitude}-${r.longitude}-${i}`} type="button" onClick={()=>{const city=[r.name,r.admin1].filter(Boolean).join(', ');setQuery(city);setPrefs(p=>({...p,city,latitude:r.latitude,longitude:r.longitude,timezone:r.timezone||'Europe/Zagreb'}));setResults([])}} className="block w-full border-b border-slate-800 px-4 py-3 text-left text-sm text-slate-200 last:border-0 hover:bg-slate-900">{r.name}{r.admin1?` · ${r.admin1}`:''}{r.country?` · ${r.country}`:''}</button>)}</div>}
  </div>
  {prefs.latitude&&prefs.longitude?<p className="mt-3 text-xs text-emerald-400">✓ Lokacija spremljena: {prefs.city}</p>:null}
  {message&&<p className="mt-3 text-sm text-sky-200">{message}</p>}
  <div className="mt-5 grid gap-3 sm:grid-cols-2"><button type="button" onClick={()=>void save()} disabled={busy||testing} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 text-sm font-black text-white disabled:opacity-50"><Save size={17}/>{busy?'Spremanje...':'Spremi vremensku prognozu'}</button><button type="button" onClick={()=>void test()} disabled={busy||testing} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-sky-500/30 bg-sky-500/10 px-5 text-sm font-black text-sky-200 disabled:opacity-50"><BellRing size={17}/>{testing?'Šaljem test...':'Pošalji testnu prognozu'}</button></div>
 </div>
}
