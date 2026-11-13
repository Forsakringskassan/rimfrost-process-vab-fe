<script setup lang="ts">
import { ref, useId } from "vue";
import StegTooltip from "./StegTooltip.vue";
import { OPPNA_TEXT, STANG_TEXT, type Understeg, statusText } from "./steg";

/**
 * Understegen i ett steg, som en vertikal minilista i detaljpanelen. Ett
 * understeg med egna understeg kan fällas ut och visar dem indraget under sig.
 */
withDefaults(
  defineProps<{
    understeg: Understeg[];
    /** 1 för stegets understeg, 2 för understegens understeg. */
    niva?: number;
  }>(),
  { niva: 1 },
);

const baseId = useId();
const oppna = ref<Set<string>>(new Set());

function vaxla(id: string): void {
  const nya = new Set(oppna.value);
  if (!nya.delete(id)) {
    nya.add(id);
  }
  oppna.value = nya;
}

function klara(u: Understeg): number {
  return u.understeg?.filter((d) => d.status === "klar").length ?? 0;
}

/** Som för stegen: ett pågående understeg fylls med andelen klara under det. */
function framstegStil(u: Understeg): Record<string, string> | undefined {
  const antal = u.understeg?.length ?? 0;
  if (u.status !== "aktiv" || antal === 0 || klara(u) === 0) {
    return undefined;
  }
  return { "--framsteg": `${(klara(u) / antal) * 100}%` };
}

function listId(id: string): string {
  return `${baseId}-${id}`;
}
</script>

<template>
  <ol class="understeg" :class="`understeg--niva-${niva}`">
    <li
      v-for="(u, index) in understeg"
      :key="u.id"
      class="understeg__steg"
      :class="[`understeg__steg--${u.status}`, { 'understeg__steg--oppen': oppna.has(u.id) }]"
      :aria-current="u.status === 'aktiv' ? 'step' : undefined"
    >
      <StegTooltip
        v-if="u.understeg?.length"
        v-slot="{ tooltipId }"
        :text="oppna.has(u.id) ? STANG_TEXT : OPPNA_TEXT"
        justering="start"
        class="understeg__tooltip"
      >
        <button
          type="button"
          class="understeg__rad understeg__knapp"
          :aria-expanded="oppna.has(u.id)"
          :aria-controls="listId(u.id)"
          :aria-describedby="tooltipId"
          @click="vaxla(u.id)"
        >
          <span
            class="understeg__markor"
            :class="{ 'understeg__markor--delvis': framstegStil(u) }"
            :style="framstegStil(u)"
            aria-hidden="true"
          >
            <svg v-if="u.status === 'klar'" viewBox="0 0 24 24" focusable="false">
              <polyline points="5 12.5 10 17.5 19 7.5" />
            </svg>
          </span>
          <span class="understeg__text">
            <span class="understeg__rubrik">{{ u.rubrik }}</span>
            <span class="sr-only">
              , understeg {{ index + 1 }} av {{ understeg.length }},
              {{ statusText[u.status] }}
            </span>
            <span v-if="u.status === 'aktiv'" class="understeg__status" aria-hidden="true">
              {{ statusText[u.status] }}
            </span>
            <svg
              class="understeg__chevron"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <polyline points="5 8 12 15 19 8" />
            </svg>
            <span class="understeg__framsteg">
              {{ klara(u) }} av {{ u.understeg.length }} klara
            </span>
          </span>
        </button>
      </StegTooltip>

      <div v-else class="understeg__rad">
        <span class="understeg__markor" aria-hidden="true">
          <svg v-if="u.status === 'klar'" viewBox="0 0 24 24" focusable="false">
            <polyline points="5 12.5 10 17.5 19 7.5" />
          </svg>
        </span>
        <span class="understeg__text">
          <span class="understeg__rubrik">{{ u.rubrik }}</span>
          <span class="sr-only">
            , understeg {{ index + 1 }} av {{ understeg.length }},
            {{ statusText[u.status] }}
          </span>
          <span v-if="u.status === 'aktiv'" class="understeg__status" aria-hidden="true">
            {{ statusText[u.status] }}
          </span>
          <span v-if="u.status === 'aktiv' && u.beskrivning" class="understeg__beskrivning">
            {{ u.beskrivning }}
          </span>
        </span>
      </div>

      <p
        v-if="u.understeg?.length && u.status === 'aktiv' && u.beskrivning"
        class="understeg__beskrivning understeg__beskrivning--utfalld"
      >
        {{ u.beskrivning }}
      </p>
      <template v-if="u.understeg?.length && oppna.has(u.id)">
        <UnderstegLista
          :id="listId(u.id)"
          :understeg="u.understeg"
          :niva="niva + 1"
          class="understeg__inre"
        />
      </template>
    </li>
  </ol>
</template>

<style scoped>
.understeg {
  --markor: 1.25rem;
  --linje: 0.125rem;
  --text-avstand: 0.625rem;

  list-style: none;
  margin: 0.75rem 0 0;
  padding: 0;
}

/* Innersta nivån: mindre markörer, indragen till förälderns textkolumn. */
.understeg--niva-2 {
  --markor: 1rem;
  --text-avstand: 0.5rem;
}

.understeg__inre {
  margin: 0.5rem 0 0 calc(1.25rem + 0.625rem);
}

.understeg__steg {
  position: relative;
}

.understeg__steg:not(:last-child) {
  padding-bottom: 0.75rem;
}

.understeg--niva-2 > .understeg__steg:not(:last-child) {
  padding-bottom: 0.5rem;
}

/* Linjen mellan markörerna. Den löper förbi en utfälld lista till nästa understeg. */
.understeg__steg:not(:last-child)::after {
  content: "";
  position: absolute;
  left: calc(var(--markor) / 2 - var(--linje) / 2);
  top: calc(var(--markor) + 0.1875rem);
  bottom: 0.1875rem;
  width: var(--linje);
  background: var(--farg-linje, #e4e5f4);
}

.understeg__steg--klar:not(:last-child)::after {
  background: var(--farg-klar, #35805b);
}

.understeg__rad {
  display: flex;
  gap: var(--text-avstand);
  align-items: flex-start;
}

.understeg__knapp {
  all: unset;
  box-sizing: border-box;
  display: flex;
  gap: var(--text-avstand);
  align-items: flex-start;
  cursor: pointer;
  border-radius: var(--f-border-radius-small, 0.25rem);
}

.understeg__knapp:focus-visible {
  outline: 2px solid var(--f-color-focus, #4a52b6);
  outline-offset: 2px;
}

.understeg__tooltip {
  --tooltip-pil-x: calc(var(--markor) / 2);
  width: fit-content;
}

.understeg__markor {
  box-sizing: border-box;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--markor);
  height: var(--markor);
  border-radius: 50%;
  border: 2px solid var(--farg-linje, #e4e5f4);
  background: var(--farg-bakgrund, #fff);
}

.understeg__steg--klar > * > .understeg__markor,
.understeg__steg--klar > .understeg__tooltip .understeg__markor {
  border-color: var(--farg-klar, #35805b);
  background: var(--farg-klar, #35805b);
  color: var(--fkds-color-text-inverted, #fff);
}

.understeg__steg--aktiv > * > .understeg__markor,
.understeg__steg--aktiv > .understeg__tooltip .understeg__markor {
  border-color: var(--farg-aktiv, #4a52b6);
  box-shadow: inset 0 0 0 0.1875rem var(--farg-bakgrund, #fff);
  background: var(--farg-aktiv, #4a52b6);
}

/* Moturs från toppen, som stegens cirkel: grönt till vänster om blått. Den vita
   innerringen tas bort, annars blir fyllningen för liten för att synas. */
.understeg__steg--aktiv > .understeg__tooltip .understeg__markor--delvis {
  box-shadow: none;
  background: conic-gradient(
    var(--farg-aktiv, #4a52b6) calc(100% - var(--framsteg)),
    var(--farg-klar, #35805b) calc(100% - var(--framsteg))
  );
}

.understeg__knapp:hover .understeg__markor {
  box-shadow:
    inset 0 0 0 0.1875rem var(--farg-bakgrund, #fff),
    0 0 0 0.125rem var(--fkds-color-border-strong, #1b1e23);
}

.understeg__steg--kommande .understeg__knapp:hover .understeg__markor,
.understeg__steg--klar .understeg__knapp:hover .understeg__markor,
.understeg__knapp:hover .understeg__markor--delvis {
  box-shadow: 0 0 0 0.125rem var(--fkds-color-border-strong, #1b1e23);
}

.understeg__markor svg {
  width: 0.75rem;
  height: 0.75rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 3.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.understeg--niva-2 .understeg__markor svg {
  width: 0.625rem;
  height: 0.625rem;
}

.understeg__text {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  column-gap: 0.5rem;
  min-width: 0;
  font-size: 0.875rem;
  line-height: var(--markor);
}

.understeg--niva-2 .understeg__text {
  font-size: 0.8125rem;
}

.understeg__steg--aktiv > * > .understeg__text .understeg__rubrik,
.understeg__steg--aktiv > .understeg__tooltip .understeg__rubrik {
  font-weight: 600;
}

.understeg__steg--kommande .understeg__rubrik {
  color: var(--fkds-color-text-secondary, #5c5e62);
}

.understeg__knapp:hover .understeg__rubrik {
  text-decoration: underline;
}

.understeg__status {
  font-size: 0.8125rem;
  color: var(--farg-aktiv, #4a52b6);
}

.understeg__chevron {
  align-self: center;
  width: 1rem;
  height: 1rem;
  fill: none;
  stroke: var(--fkds-color-border-strong, #1b1e23);
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* Samma signal som stegens chevron: uppåt betyder att ett klick fäller ihop. */
.understeg__steg--oppen > .understeg__tooltip .understeg__chevron {
  rotate: 180deg;
}

@media (prefers-reduced-motion: no-preference) {
  .understeg__chevron {
    transition: rotate 0.2s ease;
  }
}

.understeg__framsteg {
  flex-basis: 100%;
  font-size: 0.8125rem;
  line-height: 1.4;
  color: var(--fkds-color-text-secondary, #5c5e62);
}

.understeg__beskrivning {
  flex-basis: 100%;
  line-height: 1.4;
  color: var(--fkds-color-text-secondary, #5c5e62);
}

.understeg__beskrivning--utfalld {
  margin: 0.25rem 0 0 calc(var(--markor) + var(--text-avstand));
  font-size: 0.875rem;
}
</style>
