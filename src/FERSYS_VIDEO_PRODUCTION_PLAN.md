# FERSYS – plan profesionalnih video tutorijala

## Vizualni standard

Svi tutorijali trebaju koristiti isti format kako bi djelovali kao jedna serija. Preporuka je 1920×1080, 30 fps, bez vidljivog desktop taskbara i bez privatnih podataka. Uvod neka traje oko 1,5 sekundu: FERSYS logo → naziv modula. Kursor treba biti velik i čist, a svaki klik može imati mali ripple. Zoom na aktivni dio ekrana neka bude blag, otprilike 110–125 %, bez naglih rezova.

Tekst na videu neka bude vrlo kratak: maksimalno jedna poruka u trenutku, npr. **“1. Odaberi investitora”**, **“2. Dodaj stavke”**, **“3. Preuzmi PDF”**. Zadnje 2 sekunde svakog videa: FERSYS logo + “Pomoć je uvijek dostupna u aplikaciji”.

## Preporučeni stil govora

Voice-over nije obavezan. Ako ga koristiš, neka rečenice budu kratke i praktične. Primjer za Ponude: “Odaberi investitora. Dodaj stavke i cijene. Provjeri izgled dokumenta. Kada je ponuda spremna, preuzmi PDF ili je pošalji investitoru.”

## Popis videa

1. FERSYS pregled – 60 s
2. Dashboard – 30 s
3. Investitori – 35 s
4. Radni nalozi – 45 s
5. Ponude – 40 s
6. Izlazni računi – 40 s
7. Ulazni računi / AI sken – 40 s
8. Kalendar – 30 s
9. Skladište / QR – 45 s
10. Otpremnice – 50 s
11. Vozila – 30 s
12. AI pomoćnik – 35 s
13. Postavke – 40 s

Detaljni kadar-po-kadar storyboard za svaki video već je ugrađen u `src/tutorials/videoTutorials.ts` i prikazuje se i unutar FERSYS Video pomoći dok konkretni MP4 još nije dodan.

## Kako ubaciti gotov video

Nakon montaže samo izvezi MP4 i nazovi ga točno prema `public/tutorials/README.txt`.

Primjer za Ponude:

`public/tutorials/offers.mp4`

Nije potrebno ponovno programirati modal niti pojedinu stranicu. Nakon build/deploya odgovarajući video se automatski prikazuje na ruti Ponude.
