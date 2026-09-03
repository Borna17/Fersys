# FERSYS fiscalizacija i multi-country arhitektura

Status: temelj implementiran, produkcijska mrežna predaja namjerno zaključana dok nisu povezani službeni certifikat/posrednik i završena testna provjera.

## 1. Osnovno pravilo

FERSYS nije vezan uz jednu državu. Svaka tvrtka ima vlastitu državu sjedišta, valutu, porezni identifikator i compliance postavke. Država se bira tijekom registracije i može se kasnije administrativno promijeniti bez utjecaja na druge tvrtke korisnika.

Jedan korisnik može biti član više tvrtki. Aktivna tvrtka sprema se po korisniku u `user_company_preferences`; svi postojeći moduli nastavljaju koristiti `current_company_id()`, pa promjena aktivne tvrtke automatski prebacuje podatkovni kontekst bez miješanja podataka.

## 2. Porezni identifikatori

UI koristi opći naziv uz lokalnu oznaku u zagradi:

- Hrvatska: `Porezni broj (OIB)`
- Bosna i Hercegovina: `Porezni broj (JIB)`
- Srbija i Crna Gora: `Porezni broj (PIB)`
- Slovenija: `Porezni broj (davčna številka)`
- Sjeverna Makedonija: `Porezni broj (EDB)`
- Kosovo: `Porezni broj (fiskalni broj)`
- ostale države: `Porezni broj`

Legacy polje `oib` ostaje u TypeScript modelima gdje bi njegovo trenutno preimenovanje moglo razbiti postojeće module. Novi kanonski DB stupac je `tax_id`; za hrvatske zapise `oib` se paralelno održava radi kompatibilnosti.

## 3. Načini rada

`LEARNING` je način za učenje/demonstraciju. Dokumenti se smiju izrađivati, ali ništa se ne šalje poreznoj upravi i dokument mora biti tretiran kao probni kada je takav način rada aktivan.

`BUSINESS` je način registrirane tvrtke. Fiskalni način rada je zaseban:

- `OFF` – bez fiskalne predaje.
- `TEST` – priprema i provjera podataka za testno okruženje; nema tvrdnje da je račun produkcijski fiskaliziran.
- `LIVE` – konfiguracijsko stanje za buduću produkciju. Sam izbor LIVE ne aktivira mrežno slanje.

## 4. Hrvatska

Hrvatski adapter razdvaja B2C/F1 i B2B/eRačun readiness. Poslovni prostor, naplatni uređaj i porezni broj operatora spremaju se jednom po tvrtki. KPD 2025 može se spremiti na artikl/uslugu i ponovno koristiti na stavkama eRačuna.

JIR i ZKI se nikad ne generiraju lokalno kao lažne vrijednosti. Mogu se spremiti tek iz potvrđenog odgovora službenog sustava.

## 5. Produkcijska sigurnosna granica

`fiscalizationGateway.service.ts` je namjerna sigurnosna granica. Dok nema:

1. službenog produkcijskog certifikata ili ugovorenog informacijskog posrednika,
2. stvarnog adaptera prema odgovarajućem endpointu,
3. uspješne testne/conformance provjere,
4. sigurnog čuvanja tajni/certifikata izvan klijentskog bundlea,

`canSubmit` ostaje `false` i pokušaj produkcijske predaje mora završiti jasnom greškom. Time FERSYS ne može korisniku prikazati lažni uspjeh.

## 6. Računi

Kod spremanja računa FERSYS sprema snapshot compliance postavki tvrtke. Time povijesni dokument zna u kojem je režimu i državi nastao čak ako vlasnik kasnije promijeni postavke. `invoice_fiscalization` čuva odvojeno stanje readinessa/predaje i ne miješa se s osnovnim poslovnim podacima računa.

## 7. Backward compatibility

Postojeće hrvatske tvrtke dobivaju `country_code = HR` i `tax_id` se backfilla iz postojećeg OIB-a. Postojeći nazivi TypeScript polja ostaju gdje su široko korišteni. Novi sloj radi preko novih DB polja bez prisilne migracije svih stranica odjednom.

## 8. Što znači “gotovo”

Interni temelj je gotov kada migracija, multi-company izbor, country-aware porezni identitet, KPD spremanje, fiscal settings, invoice snapshot i build prolaze zajedno.

Produkcijska fiskalizacija nije gotova samo zato što postoji LIVE prekidač. Završava tek kada su vanjske vjerodajnice dostupne, adapter implementiran prema aktualnoj službenoj specifikaciji, testno okruženje prošlo i produkcijska predaja potvrđena stvarnim odgovorom nadležnog sustava.
