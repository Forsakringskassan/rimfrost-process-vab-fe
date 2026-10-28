# rimfrost-process-vab-fe

Mikrofrontend för VAB:s processvy. Portalen (`rimfrost-portal-handlaggare`) laddar den bredvid
uppgiftens mikrofrontend när en uppgift är öppen, och den visar var i VAB-processen ärendet
befinner sig. Stegen hämtas från `rimfrost-process-vab-bff` och visas i stegindikatorn, med det
pågående steget markerat.

Repot är skapat från `rimfrost-template-micro-fe`. Krav finns i [docs/krav.md](docs/krav.md)
och teknisk beskrivning i [docs/teknisk-spec.md](docs/teknisk-spec.md).

## Props

Den exponerade komponenten `ProcessVy` tar emot:

| Prop | Typ | Beskrivning |
|---|---|---|
| `aktivitetId` | `string \| null` | Aktiviteten i `vab.bpmn` som uppgiften skapades i. Stegen hämtas utifrån den. Saknas den visas ingen processvy |
| `handlaggningId` | `string \| null` | Handläggningen som uppgiften hör till. Tas emot men används inte ännu |

Processvyn påverkar aldrig resten av portalen:

- Okänt aktivitets-ID (`404` från BFF:en), saknat aktivitets-ID eller en process utan steg: processvyn döljs.
- Andra fel (BFF:en svarar med fel, går inte att nå eller svarar med oväntat format): ett neutralt meddelande, "Processens steg kan inte visas just nu.", visas.

## Så laddas mikrofrontenden

Mikrofrontenden exponerar `./ProcessVy` under scope `processVabApp`. Portalen slår upp
processvy-länken (`/process/vab`) i sitt route-manifest, laddar modulen via module federation
och renderar den som en vanlig Vue-komponent:

```json
"vab": {
  "scope": "processVabApp",
  "module": "ProcessVy",
  "devEntry": "http://localhost:3043/mf-manifest.json",
  "prodEntry": "https://<värd>/mf-manifest.json"
}
```

```vue
<component :is="ProcessVy" :handlaggning-id="handlaggningId" :aktivitet-id="aktivitetId" />
```

Vid körning som remote läser mikrofrontenden in sin egen `runtime-config.js` från sitt eget
ursprung, så att BFF-url:en (`window.__PROCESS_VAB_FE_ENV__.RUNTIME_BFF_URL`) inte blandas ihop
med portalens konfiguration.

## Konfiguration

| Variabel | Beskrivning | Standardvärde |
|---|---|---|
| `VITE_BFF_URL` | BFF-url vid lokal utveckling. Tom i `.env.development`, så att anropen går via Vite-proxyn till `http://localhost:9006` | — |
| `RUNTIME_BFF_URL` | BFF-url vid körning i container, sätts i `runtime-config.js` | — |
| `VITE_DEV_AKTIVITET_ID` | Aktivitets-ID i fristående utvecklingsläge. Saknas det visas ingen processvy | Manuell kontroll i `vab.bpmn` |
| `VITE_DEV_HANDLAGGNING_ID` | Handläggnings-ID i fristående utvecklingsläge | — |

Se [.env.example](.env.example).

## Bygga och köra

```sh
npm ci
npm run dev       # fristående utvecklingsläge på port 3042, mot BFF:en på 9006
npm run build     # vue-tsc + vite build
npm run serve     # förhandsgranska bygget på port 3043 (det portalen laddar lokalt)
npm test          # vitest
```
