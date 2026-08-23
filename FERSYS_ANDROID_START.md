# FERSYS Mobile – Android Phase 1

Ovaj paket priprema postojeći FERSYS React/Vite projekt za Capacitor 8 i Android.

## Važno

`appId` je trenutno:

`hr.fersys.app`

Možemo ga promijeniti sve dok aplikacija prvi put ne bude objavljena u Google Playu.
Nakon objave package/application ID treba tretirati kao trajan.

## 1. Zamijeni/dodaj fajlove iz paketa

- `package.json` – zamijeni
- `capacitor.config.ts` – novi
- `src/lib/platform.ts` – novi
- `src/main.tsx` – zamijeni

## 2. Instalacija paketa

U root folderu projekta:

```powershell
npm install
```

## 3. Provjera web builda

```powershell
npm run build
```

## 4. Kreiranje Android projekta – radi se samo prvi put

```powershell
npx cap add android
```

Nakon toga će se u projektu pojaviti novi folder:

`android/`

## 5. Kopiranje aktualnog FERSYS builda u Android

```powershell
npx cap sync android
```

ili ubuduće jednom naredbom:

```powershell
npm run mobile:build
```

## 6. Otvaranje u Android Studiju

```powershell
npm run android:open
```

Sljedeća faza je podešavanje Android projekta: naziv, ikone, splash, kamera, mikrofon,
push obavijesti, PDF/download/share, Google login/deep link i test na stvarnom telefonu.
