# FERSYS – Fiskalizacija, faza 1

## Cilj

Faza 1 ne šalje račune Poreznoj upravi i ne koristi produkcijski certifikat. Cilj je da model računa i aplikacijska logika budu spremni za kasniju Fiskalizaciju u krajnjoj potrošnji (F1) i eRačun/Fiskalizaciju 2.0 bez prepisivanja modula računa.

## Trenutni račun već sadrži

- broj računa
- datum izdavanja
- datum usluge/isporuke
- datum dospijeća
- primatelja/investitora i OIB
- adresu i kontakt
- način plaćanja
- IBAN, model i poziv na broj
- stavke, količinu, jedinicu, cijenu, popust i PDV
- odgovornu osobu
- vezu s ponudom/radnim nalogom
- status i povijest računa
- HUB3/2D barkod u PDF sloju

## Dodani fiskalni readiness model

`src/services/fiscalizationReadiness.service.ts` uvodi:

- B2C/B2B klasifikaciju
- kanal `F1` ili `E_INVOICE`
- provjeru podataka prije buduće fiskalizacije
- poslovni prostor
- oznaku naplatnog uređaja
- OIB operatora
- status fiskalizacije
- mjesta za JIR i ZKI
- KPD 2025 oznaku po stavci za eRačun
- jasan readiness report: `ready`, `needs-data`, `blocked`

## Sigurnosno pravilo

Faza 1 nikada ne tvrdi da je račun fiskaliziran. `canSubmitFiscalization` je namjerno `false` dok ne postoji stvarna integracija s testnim/produkcijskim sustavom, certifikatom ili odabranim informacijskim posrednikom.

## Sljedeća faza

1. spremiti fiskalne postavke po tvrtki (poslovni prostor, uređaj, operator)
2. dodati KPD 2025 polje/katalog na stavke računa i artikle
3. napraviti Fiscalization Core adapter
4. F1 testno slanje prema EDUC okruženju
5. eRačun UBL 2.1 generator + validator
6. integracija informacijskog posrednika ili vlastite pristupne točke
7. tek nakon stvarnih podataka/certifikata omogućiti produkcijsko slanje

## Referentna dokumentacija

Implementacija se mora držati aktualne dokumentacije Porezne uprave. U rujnu 2026. relevantne su Tehnička specifikacija za korisnike fiskalizacije računa u krajnjoj potrošnji v2.7, dokumentacija Fiskalizacije 2.0/eIzvještavanja, Specifikacija osnovne uporabe eRačuna s proširenjima i UBL 2.1 sheme.
