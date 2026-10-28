# Krav — Mikrofrontend för VAH:s processvy (PVAHFE)

## Bakgrund och syfte

Handläggaren ska se var i VAH-processen ärendet befinner sig när hen arbetar med en uppgift.
Processen äger sin processvy och levererar den som en egen mikrofrontend, som portalen laddar
bredvid uppgiftens mikrofrontend. Mikrofrontenden hämtar processens steg via sin BFF
(`rimfrost-process-vah-bff`) och visar dem i stegindikatorn, med det pågående steget markerat.

---

## Intressenter och aktörer

| Aktör | Roll |
|---|---|
| Handläggarportalen (`rimfrost-portal-handlaggare`) | Laddar processvyn via module federation och skickar med `handlaggningId` och `aktivitetId` |
| `rimfrost-process-vah-bff` | Hämtar processens steg från process-vah |
| Handläggare | Ser processens steg när en uppgift är öppen i portalen |

---

## Funktionella krav

### PVAHFE-FR-01 — Inladdning i portalen

- **PVAHFE-FR-01.1** Mikrofrontenden ska exponera processvyn via module federation för
  inladdning i portalen.
- **PVAHFE-FR-01.2** Mikrofrontenden ska ta emot `handlaggningId` och `aktivitetId` från
  portalen.

### PVAHFE-FR-02 — Processens steg

- **PVAHFE-FR-02.1** Mikrofrontenden ska hämta processens steg från sin BFF och visa dem i
  StegIndikatorn, med det pågående steget markerat.
- **PVAHFE-FR-02.2** Om stegen inte kan hämtas, eller om aktivitets-ID:t är okänt, ska
  processvyn visa ett neutralt meddelande eller döljas, utan att påverka resten av portalen.

---

## Icke-funktionella krav

### PVAHFE-NFR-01 — Kvalitet

- **PVAHFE-NFR-01.1** Enhetstester för komponenten, hämtningen och felhanteringen, enligt
  mallens mönster.

---

## API-gränssnitt (översikt)

| API | Riktning | Beskrivning |
|---|---|---|
| Module federation: `processVahApp/ProcessVy` | Portal → mikrofrontend | Vue-komponent med props `handlaggningId` och `aktivitetId` |
| `GET /api/steg?aktivitetId={uuid}` | Mikrofrontend → `rimfrost-process-vah-bff` | Processens steg enligt `GetProcessvyStegResponse` i `rimfrost-framework-process-openapi` |
