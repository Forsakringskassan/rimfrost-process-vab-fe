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
│   └── StegIndikator/         # Responsiv stegindikator (från mallen), med understeg
│       ├── StegIndikator.vue  # Faserna, fyllnadsgrad och chevron
│       ├── StegDetaljer.vue   # Detaljpanelen för den valda fasen
│       ├── UnderstegLista.vue # Delstegen i panelen, utfällbara i en nivå till
│       └── StegTooltip.vue    # Hovringstext i FTooltips utseende
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

### Understeg

Ett steg kan ha understeg i fältet `steg`, högst två nivåer under svarets `steg[]` (fas →
delsteg → delsteg). Ett svar med djupare nivåer eller ogiltiga understeg räknas som oväntat
svar och ger det neutrala meddelandet. Understegens status visas som den kommer från BFF:en.
Fasernas markering räknas fram ur `PAGAR` som för ett platt svar.

| Del | Visning |
|---|---|
| Fas eller delsteg med understeg | "x av y klara" under rubriken, tooltip "Öppna vy för delsteg" / "Stäng vy för delsteg" |
| Pågående fas eller delsteg med klara understeg | Cirkeln eller markören fylls grönt moturs från toppen (`conic-gradient`, `--framsteg`) |
| Detaljpanel | Öppnas först vid klick. Delstegen listas med bock, fylld ring och "Pågår", eller tom ring. Pågående delsteg visar sin beskrivning |
| Delsteg med egna delsteg | Stängt från början, fälls ut indraget på plats. Chevronen pekar uppåt när det är utfällt |
| Chevron mellan fas och panel | Stänger panelen i alla layouter. Inte ett eget tabbstopp |

Tooltipen är en egen komponent i FTooltips utseende, eftersom FKUI saknar en hovringstooltip
(NEST-Q3). Animationerna stängs av med `prefers-reduced-motion`.

## Kafka-integration

Ingen.

## Konfiguration

| Egenskap | Beskrivning | Standardvärde |
|---|---|---|
| `VITE_BFF_URL` | BFF-url vid lokal utveckling. `http://localhost:9006` i `.env` (bygget som portalen laddar). Tom i `.env.development`, så att `npm run dev` går via Vite-proxyn | — |
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
| VAB:s processbeskrivning har inga understeg ännu, så understegen syns bara i enhetstesterna | Lägg till understeg när FK har bestämt strukturen (NEST-Q1) |
