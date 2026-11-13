<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useId,
  useTemplateRef,
  watch,
} from "vue";
import { FIcon } from "@fkui/vue";
import StegDetaljer from "./StegDetaljer.vue";
import StegTooltip from "./StegTooltip.vue";
import UnderstegLista from "./UnderstegLista.vue";
import { OPPNA_TEXT, STANG_TEXT, type Steg, type StegStatus, statusText } from "./steg";

/**
 * horisontell: stegen på en rad, panelen under.
 * vertikal: stegen i en kolumn, panelen till höger.
 * kompakt: stegen i en kolumn, panelen under det valda steget. Används när
 * det inte finns plats för en panel bredvid stegen.
 */
export type Layout = "horisontell" | "vertikal" | "kompakt";

/** Index för steget vars detaljer visas, eller null när panelen är stängd. */
const valtSteg = defineModel<number | null>("valtSteg", { default: null });

const props = withDefaults(
  defineProps<{
    steg: Steg[];
    /** Index (0-baserat) för steget som pågår. Stegen före räknas som klara. */
    aktivtSteg: number;
    /** Tvinga en riktning. "auto" väljer utifrån tillgänglig bredd. */
    orientering?: "auto" | "horisontell" | "vertikal";
    /** Minsta bredd i px som varje steg behöver för att visas horisontellt. */
    minStegBredd?: number;
    /** Under denna bredd i px visas panelen under steget i stället för bredvid. */
    kompaktBredd?: number;
    /** Tillgänglig etikett för hela stegindikatorn. */
    etikett?: string;
  }>(),
  {
    orientering: "auto",
    minStegBredd: 128,
    kompaktBredd: 480,
    etikett: "Steg",
  },
);

defineSlots<{
  detaljer?(props: { steg: Steg; index: number; status: StegStatus }): unknown;
}>();

const baseId = useId();
const rot = useTemplateRef<HTMLElement>("rot");
const lista = useTemplateRef<HTMLOListElement>("lista");
const knappar = useTemplateRef<HTMLButtonElement[]>("knappar");
const tillgangligBredd = ref<number | null>(null);
const panelForskjutning = ref(0);

const layout = computed<Layout>(() => {
  const bredd = tillgangligBredd.value;
  if (props.orientering === "horisontell") {
    return "horisontell";
  }
  if (props.orientering === "auto") {
    const rymsHorisontellt =
      bredd === null || bredd >= props.steg.length * props.minStegBredd;
    if (rymsHorisontellt) {
      return "horisontell";
    }
  }
  return bredd !== null && bredd < props.kompaktBredd ? "kompakt" : "vertikal";
});

const valt = computed(() => {
  const index = valtSteg.value;
  const steg = index === null ? undefined : props.steg[index];
  if (index === null || !steg) {
    return null;
  }
  return { steg, index, status: statusFor(index) };
});

function statusFor(index: number): StegStatus {
  if (index < props.aktivtSteg) {
    return "klar";
  }
  if (index === props.aktivtSteg) {
    return "aktiv";
  }
  return "kommande";
}

function understegKlara(s: Steg): number {
  return s.understeg?.filter((u) => u.status === "klar").length ?? 0;
}

/**
 * Andelen klara understeg i det pågående steget, som cirkeln fylls med.
 * Undefined när det inte finns något att visa, så att cirkeln ser ut som vanligt.
 */
function framstegStil(s: Steg, index: number): Record<string, string> | undefined {
  const antal = s.understeg?.length ?? 0;
  const klara = understegKlara(s);
  if (statusFor(index) !== "aktiv" || antal === 0 || klara === 0) {
    return undefined;
  }
  return { "--framsteg": `${(klara / antal) * 100}%` };
}

/** Hovringstext för steg med understeg. Steg utan understeg har ingen. */
function tooltipFor(s: Steg, index: number): string {
  if (!s.understeg?.length) {
    return "";
  }
  return valtSteg.value === index ? STANG_TEXT : OPPNA_TEXT;
}

const chevronTooltip = computed(() =>
  valt.value?.steg.understeg?.length ? STANG_TEXT : "",
);

function knappId(index: number): string {
  return `${baseId}-steg-${index}`;
}

const panelId = `${baseId}-detaljer`;

function vaxla(index: number): void {
  valtSteg.value = valtSteg.value === index ? null : index;
}

function stang(): void {
  const index = valtSteg.value;
  valtSteg.value = null;
  if (index !== null) {
    knappar.value?.[index]?.focus();
  }
}

/**
 * I vertikalt läge ligger panelen till höger om listan. Den förskjuts nedåt
 * så att chevronen hamnar i höjd med cirkeln för det valda steget.
 */
function uppdateraPanelForskjutning(): void {
  const index = valtSteg.value;
  if (layout.value !== "vertikal" || index === null || !lista.value) {
    panelForskjutning.value = 0;
    return;
  }
  const knapp = knappar.value?.[index];
  if (!knapp) {
    return;
  }
  panelForskjutning.value =
    knapp.getBoundingClientRect().top - lista.value.getBoundingClientRect().top;
}

let observer: ResizeObserver | null = null;

onMounted(() => {
  if (!rot.value || typeof ResizeObserver === "undefined") {
    return;
  }
  observer = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (!entry) {
      return;
    }
    tillgangligBredd.value = entry.contentRect.width;
    // Radbrytningar i rubrikerna ändrar höjden på stegen.
    nextTick(uppdateraPanelForskjutning);
  });
  observer.observe(rot.value);
});

onBeforeUnmount(() => {
  observer?.disconnect();
});

watch(
  () => [valtSteg.value, layout.value, props.steg.length] as const,
  () => nextTick(uppdateraPanelForskjutning),
);

watch(
  () => props.steg.length,
  (antal) => {
    if (valtSteg.value !== null && valtSteg.value >= antal) {
      valtSteg.value = null;
    }
  },
);
</script>

<template>
  <nav
    ref="rot"
    class="steg-indikator"
    :class="`steg-indikator--${layout}`"
    :aria-label="etikett"
    :style="{ '--steg-antal': steg.length }"
  >
    <ol ref="lista" class="steg-indikator__lista">
      <li
        v-for="(s, index) in steg"
        :key="s.id"
        class="steg-indikator__steg"
        :class="[
          `steg-indikator__steg--${statusFor(index)}`,
          { 'steg-indikator__steg--valt': valtSteg === index },
        ]"
      >
        <StegTooltip
          v-slot="{ tooltipId }"
          :text="tooltipFor(s, index)"
          :justering="layout === 'horisontell' ? 'mitten' : 'start'"
        >
          <button
            :id="knappId(index)"
            ref="knappar"
            type="button"
            class="steg-indikator__knapp"
            :aria-expanded="valtSteg === index"
            :aria-controls="panelId"
            :aria-current="statusFor(index) === 'aktiv' ? 'step' : undefined"
            :aria-describedby="tooltipFor(s, index) ? tooltipId : undefined"
            @click="vaxla(index)"
          >
            <span
              class="steg-indikator__cirkel"
              :class="{ 'steg-indikator__cirkel--delvis': framstegStil(s, index) }"
              :style="framstegStil(s, index)"
              aria-hidden="true"
            >
              <svg
                v-if="statusFor(index) === 'klar'"
                class="steg-indikator__bock"
                viewBox="0 0 24 24"
                focusable="false"
              >
                <polyline points="5 12.5 10 17.5 19 7.5" />
              </svg>
              <FIcon
                v-else-if="s.ikon"
                :name="s.ikon"
                class="steg-indikator__ikon"
              />
              <span v-else class="steg-indikator__nummer">{{ index + 1 }}</span>
            </span>
            <span class="steg-indikator__rubrik">
              {{ s.rubrik }}
              <span v-if="s.understeg?.length" class="steg-indikator__framsteg">
                {{ understegKlara(s) }} av {{ s.understeg.length }} klara
              </span>
              <span class="sr-only">
                , steg {{ index + 1 }} av {{ steg.length }},
                {{ statusText[statusFor(index)] }}
              </span>
            </span>
          </button>
        </StegTooltip>

        <StegDetaljer
          v-if="layout === 'kompakt' && valt?.index === index"
          :id="panelId"
          :key="valt.steg.id"
          class="steg-indikator__detaljer"
          :etikett-id="knappId(index)"
          :rubrik="valt.steg.rubrik"
          :status="valt.status"
          :stang-text="chevronTooltip"
          pil="ned"
          @stang="stang"
        >
          <slot name="detaljer" v-bind="valt">
            <p v-if="valt.steg.beskrivning">{{ valt.steg.beskrivning }}</p>
            <UnderstegLista
              v-if="valt.steg.understeg?.length"
              :understeg="valt.steg.understeg"
            />
          </slot>
        </StegDetaljer>
      </li>
    </ol>

    <!-- Chevronen stänger panelen med musen. Tangentbordet använder stegknappen eller Esc. -->
    <div
      v-if="valt && layout === 'horisontell'"
      class="steg-indikator__chevronrad"
      aria-hidden="true"
    >
      <StegTooltip
        :key="valt.index"
        class="steg-indikator__chevronplats"
        :style="{ gridColumn: valt.index + 1 }"
        :text="chevronTooltip"
      >
        <button
          type="button"
          class="steg-indikator__chevronknapp"
          tabindex="-1"
          aria-hidden="true"
          @click="stang"
        >
          <svg class="steg-indikator__chevron" viewBox="0 0 24 24" focusable="false">
            <polyline points="5 8 12 15 19 8" />
          </svg>
        </button>
      </StegTooltip>
    </div>

    <StegDetaljer
      v-if="valt && layout !== 'kompakt'"
      :id="panelId"
      :key="valt.steg.id"
      class="steg-indikator__detaljer"
      :etikett-id="knappId(valt.index)"
      :rubrik="valt.steg.rubrik"
      :status="valt.status"
      :stang-text="chevronTooltip"
      :pil="layout === 'vertikal' ? 'hoger' : 'ingen'"
      :style="
        layout === 'vertikal' ? { marginTop: `${panelForskjutning}px` } : {}
      "
      @stang="stang"
    >
      <slot name="detaljer" v-bind="valt">
        <p v-if="valt.steg.beskrivning">{{ valt.steg.beskrivning }}</p>
        <UnderstegLista
          v-if="valt.steg.understeg?.length"
          :understeg="valt.steg.understeg"
        />
      </slot>
    </StegDetaljer>
  </nav>
</template>

<style scoped>
.steg-indikator {
  --cirkel: 2.5rem;
  --ring: 0.3125rem;
  --linje: 0.25rem;
  --linje-avstand: 0.375rem;
  --chevron: 1.5rem;
  --chevron-top: calc(var(--ring) + var(--cirkel) / 2 - var(--chevron) / 2);

  --farg-klar: var(--fkds-color-feedback-background-positive-strong, #35805b);
  --farg-aktiv: var(--fkds-color-action-background-primary-default, #4a52b6);
  --farg-bakgrund: var(--fkds-color-background-primary, #fff);
  --farg-kommande-bakgrund: color-mix(
    in srgb,
    var(--farg-aktiv) 12%,
    var(--farg-bakgrund)
  );
  --farg-kommande-text: var(--fkds-color-action-text-primary-default, #4a52b6);
  --farg-linje: color-mix(in srgb, var(--farg-aktiv) 18%, var(--farg-bakgrund));

  width: 100%;
  min-width: 0;
  color: var(--fkds-color-text-primary, #1b1e23);
}

.steg-indikator__lista {
  list-style: none;
  margin: 0;
  padding: 0;
}

.steg-indikator__steg {
  position: relative;
  min-width: 0;
}

/* Knappen omsluter cirkel och rubrik så att hela steget är klickbart. */
.steg-indikator__knapp {
  all: unset;
  box-sizing: border-box;
  display: flex;
  gap: 0.5rem;
  cursor: pointer;
  color: inherit;
  font: inherit;
  border-radius: var(--f-border-radius-medium, 0.5rem);
}

.steg-indikator__knapp:focus-visible {
  outline: 2px solid var(--f-color-focus, #4a52b6);
  outline-offset: 2px;
}

.steg-indikator__cirkel {
  box-sizing: border-box;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--cirkel);
  height: var(--cirkel);
  border-radius: 50%;
  font-weight: 600;
}

@media (prefers-reduced-motion: no-preference) {
  .steg-indikator__cirkel {
    transition: box-shadow 0.15s ease;
  }
}

.steg-indikator__steg--klar .steg-indikator__cirkel {
  background: var(--farg-klar);
  color: var(--fkds-color-text-inverted, #fff);
  box-shadow:
    0 0 0 0.1875rem var(--farg-bakgrund),
    0 0 0 var(--ring) color-mix(in srgb, var(--farg-klar) 35%, transparent);
}

.steg-indikator__steg--aktiv .steg-indikator__cirkel {
  background: var(--farg-aktiv);
  color: var(--fkds-color-text-inverted, #fff);
  box-shadow:
    0 0 0 0.1875rem var(--farg-bakgrund),
    0 0 0 var(--ring) color-mix(in srgb, var(--farg-aktiv) 35%, transparent);
}

/* Pågående steg med klara understeg: cirkeln fylls moturs från toppen, så att
   det klara (grönt) ligger till vänster om det som återstår (blått). */
.steg-indikator__steg--aktiv .steg-indikator__cirkel--delvis {
  background: conic-gradient(
    var(--farg-aktiv) calc(100% - var(--framsteg)),
    var(--farg-klar) calc(100% - var(--framsteg))
  );
}

.steg-indikator__steg--kommande .steg-indikator__cirkel {
  background: var(--farg-kommande-bakgrund);
  color: var(--farg-kommande-text);
}

.steg-indikator__knapp:hover .steg-indikator__cirkel,
.steg-indikator__steg--valt .steg-indikator__cirkel {
  box-shadow:
    0 0 0 0.1875rem var(--farg-bakgrund),
    0 0 0 var(--ring) var(--fkds-color-border-strong, #1b1e23);
}

.steg-indikator__bock {
  width: 1.25rem;
  height: 1.25rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.steg-indikator__ikon {
  width: 1.25rem;
  height: 1.25rem;
}

.steg-indikator__rubrik {
  font-size: 0.875rem;
  line-height: 1.3;
  overflow-wrap: break-word;
}

.steg-indikator__framsteg {
  display: block;
  font-size: 0.8125rem;
  font-weight: 400;
  color: var(--fkds-color-text-secondary, #5c5e62);
}

.steg-indikator__steg--valt .steg-indikator__rubrik {
  font-weight: 600;
}

/* Linjen mellan stegen. Färgen visar om nästa steg är nått. */
.steg-indikator__steg:not(:last-child)::after {
  content: "";
  position: absolute;
  border-radius: calc(var(--linje) / 2);
  background: var(--farg-linje);
}

.steg-indikator__steg--klar:not(:last-child)::after {
  background: var(--farg-klar);
}

.steg-indikator__chevron {
  width: var(--chevron);
  height: var(--chevron);
  fill: none;
  stroke: var(--fkds-color-border-strong, #1b1e23);
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* ---------- Horisontell ---------- */

.steg-indikator--horisontell .steg-indikator__lista,
.steg-indikator--horisontell .steg-indikator__chevronrad {
  display: grid;
  grid-template-columns: repeat(var(--steg-antal), minmax(0, 1fr));
}

/* Tooltipens pil pekar på cirkeln i vertikal och kompakt layout. */
.steg-indikator {
  --tooltip-pil-x: calc(var(--ring) + var(--cirkel) / 2);
}

.steg-indikator--horisontell .steg-indikator__knapp {
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: var(--ring) 0.25rem 0.25rem;
  text-align: center;
}

.steg-indikator--horisontell .steg-indikator__steg:not(:last-child)::after {
  top: calc(var(--ring) + var(--cirkel) / 2 - var(--linje) / 2);
  left: calc(50% + var(--cirkel) / 2 + var(--ring) + var(--linje-avstand));
  right: calc(-50% + var(--cirkel) / 2 + var(--ring) + var(--linje-avstand));
  height: var(--linje);
}

.steg-indikator__chevronknapp {
  all: unset;
  display: block;
  cursor: pointer;
  border-radius: 50%;
}

.steg-indikator__chevronknapp:hover {
  background: var(--farg-kommande-bakgrund);
}

/* Vid hovring vänds chevronen uppåt: ett klick fäller ihop vyn. */
.steg-indikator__chevronknapp:hover .steg-indikator__chevron {
  rotate: 180deg;
}

@media (prefers-reduced-motion: no-preference) {
  .steg-indikator__chevronknapp .steg-indikator__chevron {
    transition: rotate 0.2s ease;
  }
}

.steg-indikator--horisontell .steg-indikator__chevronplats {
  justify-self: center;
  margin-top: 0.25rem;
}

.steg-indikator--horisontell .steg-indikator__chevron {
  display: block;
}

.steg-indikator--horisontell .steg-indikator__detaljer {
  margin-top: 0.25rem;
}

@media (prefers-reduced-motion: no-preference) {
  .steg-indikator__chevron {
    animation: steg-indikator-in 0.15s ease-out;
  }
}

@keyframes steg-indikator-in {
  from {
    opacity: 0;
  }
}

/* ---------- Vertikal och kompakt ---------- */

.steg-indikator--vertikal {
  display: grid;
  grid-template-columns: fit-content(45%) minmax(0, 1fr);
  column-gap: calc(var(--chevron) + 0.75rem);
  align-items: start;
}

.steg-indikator--vertikal .steg-indikator__lista {
  position: relative;
}

.steg-indikator--vertikal .steg-indikator__steg:not(:last-child),
.steg-indikator--kompakt .steg-indikator__steg:not(:last-child) {
  padding-bottom: 2rem;
}

.steg-indikator--vertikal .steg-indikator__knapp,
.steg-indikator--kompakt .steg-indikator__knapp {
  flex-direction: row;
  align-items: center;
  gap: 0.75rem;
  padding: var(--ring);
  text-align: left;
}

.steg-indikator--vertikal .steg-indikator__steg:not(:last-child)::after,
.steg-indikator--kompakt .steg-indikator__steg:not(:last-child)::after {
  left: calc(var(--ring) + var(--cirkel) / 2 - var(--linje) / 2);
  /* Från cirkelns underkant till nästa cirkels överkant, minus avståndet. */
  top: calc(var(--ring) + var(--cirkel) + var(--linje-avstand));
  bottom: calc(var(--linje-avstand) - var(--ring));
  width: var(--linje);
}

/* Panelen läggs i rubrikens kolumn, till höger om linjen. */
.steg-indikator--kompakt .steg-indikator__detaljer {
  margin: 0.25rem 0 0 calc(var(--ring) + var(--cirkel) + 0.75rem);
}
</style>
