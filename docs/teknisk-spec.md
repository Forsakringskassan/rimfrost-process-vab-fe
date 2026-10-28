# Teknisk spec — Mikrofrontend för VAB:s processvy (PVABFE)

## Översikt

Vue 3 + TypeScript-mikrofrontend som portalen laddar via module federation. Den hämtar
processens steg från `rimfrost-process-vab-bff` och visar dem i stegindikatorn. Ingen egen
routing, inget eget tillstånd utöver komponentens, ingen databas och ingen meddelandeintegration.
Repot är skapat från `rimfrost-template-micro-fe`.

## Komponentstruktur

```text
src/
├── App.vue                    # Fristående dev-skal som simulerar portalens layout
├── components/
│   ├── ProcessVy.vue          # Exponerad komponent: hämtar och visar processens steg
│   └── StegIndikator/         # Responsiv stegindikator (från mallen)
├── utils/
│   ├── fetchProcessSteg.ts    # Anrop mot BFF:en, felhantering
│   └── processSteg.ts         # Svarstyper, validering och översättning till StegIndikatorn
└── config/env.ts              # Enhetlig läsning av bygg-/körtidskonfiguration
```

## Module federation

| Egenskap | Värde |
|---|---|
| Scope | `processVabApp` |
| Exponerad modul | `./ProcessVy` |
| Props | `handlaggningId?: string \| null`, `aktivitetId?: string \| null` |
| Delade singletons | `vue`, `@fkui/vue` |

## API-specifikationer

| Metod | Sökväg | Beskrivning |
|---|---|---|
| GET | `/api/steg?aktivitetId={uuid}` | Processens steg. `404` betyder att aktiviteten är okänd |

## Visningslogik

| Läge | Visning |
|---|---|
| `aktivitetId` saknas | Inget anrop, processvyn döljs |
| Hämtning pågår | Inget visas |
| `200` med steg | Stegindikatorn, med steget som har status `PAGAR` markerat |
| `200` utan steg | Processvyn döljs |
| `404` (okänd aktivitet) | Processvyn döljs |
| Övriga fel (felstatus, nätverksfel, oväntat svar) | Neutralt meddelande: "Processens steg kan inte visas just nu." |

Saknas ett steg med status `PAGAR` markeras första steget som inte är `KLAR`. Är alla steg
klara markeras inget steg som pågående. När `aktivitetId` ändras avbryts en pågående hämtning
och svaret från den ignoreras.

## Kafka-integration

Ingen.

## Konfiguration

| Egenskap | Beskrivning | Standardvärde |
|---|---|---|
| `VITE_BFF_URL` | BFF-url vid lokal utveckling. Tom i `.env.development`, så att anropen går via Vite-proxyn till `http://localhost:9006` | — |
| `RUNTIME_BFF_URL` (`window.__PROCESS_VAB_FE_ENV__`) | BFF-url vid körning i container | — |
| `VITE_DEV_HANDLAGGNING_ID` | Fallback-id vid fristående utvecklingsläge | — |
| `VITE_DEV_AKTIVITET_ID` | Fallback-aktivitets-ID vid fristående utvecklingsläge | — |

## Liveness

Ingen egen hälsokontroll — statisk frontend, hälsa avgörs av webbservern som serverar den.

## Kända begränsningar och framtida arbete

| Begränsning | Föreslagen åtgärd |
|---|---|
| Anropet till BFF:en skickar ingen `Authorization`-header, på samma sätt som reglernas mikrofrontends | Skicka med handläggarens token när portalen erbjuder det till mikrofrontends |
| `handlaggningId` tas emot men används inte | Använd när processvyn behöver ärendespecifik information |
| `vue-router` är ett beroende men används inte (ärvt från mallen) | Ta bort beroendet |
