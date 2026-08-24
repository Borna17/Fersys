# FERSYS Google Play Release – Phase 1

Trenutni release:
- applicationId: hr.fersys.app
- versionCode: 1
- versionName: 1.0.0
- targetSdk: API 36
- Google Play format: AAB

## 1. Zamijeni/dodaj fajlove
Zamijeni:
- package.json
- .gitignore
- android/app/build.gradle

Dodaj:
- android/keystore.properties.example

## 2. Provjeri aplikaciju
npm install
npm run mobile:build

Ponovno pokreni FERSYS na Samsungu i provjeri login, AI mikrofon, slike, PDF/share i push.

## 3. Napravi signing key
U Android Studiju:
Build > Generate Signed App Bundle or APK > Android App Bundle > Next > Create new...

Preporučeni path:
android/fersys-upload-key.jks

Alias:
fersys

Lozinke spremi izvan GitHuba i napravi sigurnosnu kopiju.

## 4. Napravi android/keystore.properties
Kopiraj:
android/keystore.properties.example

u:
android/keystore.properties

i upiši stvarne lozinke.

## 5. Izradi AAB
npm run android:bundle

Gotova datoteka:
android/app/build/outputs/bundle/release/app-release.aab

## 6. Google Play
Prvo koristi Internal testing. Nakon toga Closed testing.

Za novi osobni Play developer račun Production pristup traži najmanje 12 testera
koji su uključeni kontinuirano 14 dana.

## 7. Ne commitati
- android/fersys-upload-key.jks
- android/keystore.properties
- .env
- bilo koju signing lozinku
