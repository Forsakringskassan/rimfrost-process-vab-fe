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

---

## Icke-funktionella krav

### PVABFE-NFR-01 — Kvalitet

- **PVABFE-NFR-01.1** Enhetstester för komponenten, hämtningen och felhanteringen, enligt
  mallens mönster.

---

## API-gränssnitt (översikt)

| API | Riktning | Beskrivning |
|---|---|---|
| Module federation: `processVabApp/ProcessVy` | Portal → mikrofrontend | Vue-komponent med props `handlaggningId` och `aktivitetId` |
| `GET /api/steg?aktivitetId={uuid}` | Mikrofrontend → `rimfrost-process-vab-bff` | Processens steg enligt `GetProcessvyStegResponse` i `rimfrost-framework-process-openapi` |
