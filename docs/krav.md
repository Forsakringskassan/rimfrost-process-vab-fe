# Krav — Mikrofrontend för VAB:s processvy (PVABFE)

## Bakgrund och syfte

Handläggaren ska se var i VAB-processen ärendet befinner sig när hen arbetar med en uppgift.
Processen äger sin processvy och levererar den som en egen mikrofrontend, som portalen laddar
bredvid uppgiftens mikrofrontend. Mikrofrontenden hämtar processens steg via sin BFF
(`rimfrost-process-vab-bff`) och visar dem i stegindikatorn, med det pågående steget markerat.

---

## Intressenter och aktörer

| Aktör | Roll |
|---|---|
| Handläggarportalen (`rimfrost-portal-handlaggare`) | Laddar processvyn via module federation och skickar med `handlaggningId` och `aktivitetId` |
| `rimfrost-process-vab-bff` | Hämtar processens steg från process-vab |
| Handläggare | Ser processens steg när en uppgift är öppen i portalen |

---

## Funktionella krav

### PVABFE-FR-01 — Inladdning i portalen

- **PVABFE-FR-01.1** Mikrofrontenden ska exponera processvyn via module federation för
  inladdning i portalen.
- **PVABFE-FR-01.2** Mikrofrontenden ska ta emot `handlaggningId` och `aktivitetId` från
  portalen.

### PVABFE-FR-02 — Processens steg

- **PVABFE-FR-02.1** Mikrofrontenden ska hämta processens steg från sin BFF och visa dem i
  StegIndikatorn, med det pågående steget markerat.
- **PVABFE-FR-02.2** Om stegen inte kan hämtas, eller om aktivitets-ID:t är okänt, ska
  processvyn visa ett neutralt meddelande eller döljas, utan att påverka resten av portalen.

### PVABFE-FR-03 — Understeg i stegvyn

- **PVABFE-FR-03.1** Mikrofrontenden ska ta emot understeg (fältet `steg`) i upp till två
  nivåer under fasen. Ett svar med djupare nivåer eller ogiltiga understeg ska behandlas som ett
  fel enligt PVABFE-FR-02.2.
- **PVABFE-FR-03.2** Understegens status ska visas som den kommer från BFF:en. Fasernas
  markering räknas fram som idag.
- **PVABFE-FR-03.3** En fas eller ett delsteg med understeg ska visa hur många av de närmaste
  understegen som är klara, till exempel "2 av 4 klara".
- **PVABFE-FR-03.4** Cirkeln för en pågående fas med klara understeg ska fyllas grönt i
  proportion till andelen klara understeg, moturs från toppen, så att det klara ligger till
  vänster om det som återstår. Fyllningen ska skala med cirkeln utan att layouten flyttar sig.
  Övriga faser ser ut som idag.
- **PVABFE-FR-03.5** Detaljpanelen ska inte öppnas automatiskt.
- **PVABFE-FR-03.6** Detaljpanelen ska lista fasens delsteg med en markör per status: bock för
  klar, fylld ring och texten "Pågår" för pågående, och tom ring för kommande. Ett pågående
  delsteg ska visa sin beskrivning.
- **PVABFE-FR-03.7** Ett delsteg med egna delsteg ska vara stängt från början och fällas ut på
  plats i panelen. Den inre listan ska vara indragen till förälderns textkolumn och ha mindre
  markörer.
- **PVABFE-FR-03.8** Markören för ett pågående delsteg med klara delsteg ska fyllas enligt
  samma regel som i PVABFE-FR-03.4.

### PVABFE-FR-04 — Stänga och fälla ihop

- **PVABFE-FR-04.1** Ett klick på chevronen mellan fasen och panelen ska stänga panelen, i alla
  layouter.
- **PVABFE-FR-04.2** Vid hovring ska chevronen få en rund bakgrund och vändas mot steget.
  Chevronen för ett utfällt delsteg ska peka uppåt.

### PVABFE-FR-05 — Tooltip

- **PVABFE-FR-05.1** En fas eller ett delsteg med understeg ska ha tooltipen "Öppna vy för
  delsteg". När vyn är öppen ska både steget och chevronen ha tooltipen "Stäng vy för delsteg".
  Steg utan understeg ska inte ha någon tooltip.
- **PVABFE-FR-05.2** Tooltipen ska följa FKUI:s `FTooltip` i utseende: infofärgad bakgrund och
  ram, liten radie och pil. Den ska visas vid hovring och tangentbordsfokus, och Esc ska dölja
  den.

---

## Icke-funktionella krav

### PVABFE-NFR-01 — Kvalitet

- **PVABFE-NFR-01.1** Enhetstester för komponenten, hämtningen och felhanteringen, enligt
  mallens mönster.
- **PVABFE-NFR-01.2** Enhetstester ska täcka typvakten och mappningen för understeg,
  fyllnadsgraden, utfällningen på nivå 3, tooltiptexterna och chevronens stängning.

### PVABFE-NFR-02 — Tillgänglighet

- **PVABFE-NFR-02.1** Knappar som öppnar en vy ska ha `aria-expanded` och `aria-controls`.
  Tooltiptexten ska kopplas med `aria-describedby`, och pågående steg och understeg ska ha
  `aria-current="step"`.
- **PVABFE-NFR-02.2** Chevronerna ska inte vara egna tabbstopp. Med tangentbordet stänger man
  med stegknappen eller Esc.
- **PVABFE-NFR-02.3** Animationerna ska stängas av när användaren har valt minskad rörelse
  (`prefers-reduced-motion`).

---

## API-gränssnitt (översikt)

| API | Riktning | Beskrivning |
|---|---|---|
| Module federation: `processVabApp/ProcessVy` | Portal → mikrofrontend | Vue-komponent med props `handlaggningId` och `aktivitetId` |
| `GET /api/steg?aktivitetId={uuid}` | Mikrofrontend → `rimfrost-process-vab-bff` | Processens steg enligt `GetProcessvyStegResponse` i `rimfrost-framework-process-openapi` (1.1.0: med understeg i fältet `steg`) |
