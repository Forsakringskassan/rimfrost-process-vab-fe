<script setup lang="ts">
import { onBeforeUnmount, ref, useId } from "vue";

/**
 * Kort hovringstext för ett reglage. FKUI saknar en sådan: FTooltip är en
 * infoknapp som fäller ut hjälptext. Bubblan följer därför FTooltips utseende
 * (infofärger, 2px ram, liten radie, 20×10 pil) men visas vid hovring och
 * tangentbordsfokus. Esc döljer den. Bubblan går inte att hovra över, så den
 * uppfyller bara delvis WCAG 1.4.13.
 */
withDefaults(
  defineProps<{
    /** Tom text: ingen bubbla, bara innehållet. */
    text?: string;
    /** "mitten": bubblan centreras över innehållet. "start": vänsterställd, pilen över cirkeln. */
    justering?: "mitten" | "start";
  }>(),
  { text: "", justering: "mitten" },
);

defineSlots<{
  default(props: { tooltipId: string }): unknown;
}>();

const tooltipId = `${useId()}-tooltip`;
const visas = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;

function visaEfterPaus(): void {
  clearTimeout(timer);
  timer = setTimeout(() => (visas.value = true), 300);
}

function dolj(): void {
  clearTimeout(timer);
  visas.value = false;
}

/** Esc döljer bara bubblan. Panelen runt omkring stängs först vid nästa Esc. */
function esc(event: KeyboardEvent): void {
  if (visas.value) {
    event.stopPropagation();
    dolj();
  }
}

function fokus(event: FocusEvent): void {
  // Bara synligt fokus: ett musklick ska inte låta bubblan ligga kvar.
  if ((event.target as HTMLElement).matches?.(":focus-visible")) {
    clearTimeout(timer);
    visas.value = true;
  }
}

onBeforeUnmount(() => clearTimeout(timer));
</script>

<template>
  <span
    class="steg-tooltip"
    :class="`steg-tooltip--${justering}`"
    @mouseenter="visaEfterPaus"
    @mouseleave="dolj"
    @focusin="fokus"
    @focusout="dolj"
    @click="dolj"
    @keydown.esc="esc"
  >
    <slot :tooltip-id="tooltipId"></slot>
    <span v-if="text" v-show="visas" :id="tooltipId" role="tooltip" class="steg-tooltip__bubbla">
      {{ text }}
    </span>
  </span>
</template>

<style scoped>
.steg-tooltip {
  --pil-bredd: 1.25rem;
  --pil-hojd: 0.625rem;
  --ram: 2px;
  --farg-ram: var(--fkds-color-feedback-border-info, #4a52b6);
  --farg-bakgrund: var(--fkds-color-feedback-background-info, #eceefa);

  position: relative;
  display: block;
}

.steg-tooltip__bubbla {
  position: absolute;
  bottom: calc(100% + var(--pil-hojd) + 0.125rem);
  z-index: 1;
  width: max-content;
  max-width: 16rem;
  padding: 0.375rem 0.625rem;
  border: var(--ram) solid var(--farg-ram);
  border-radius: var(--f-border-radius-small, 0.25rem);
  background: var(--farg-bakgrund);
  color: var(--fkds-color-text-primary, #1b1e23);
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.3;
  text-align: left;
  pointer-events: none;
}

/* Pilen nedåt: en yttre triangel i ramfärg och en inre i bakgrundsfärg. */
.steg-tooltip__bubbla::before,
.steg-tooltip__bubbla::after {
  content: "";
  position: absolute;
  top: 100%;
  left: var(--pil-x);
  translate: -50% 0;
  border-style: solid;
  border-color: transparent;
}

.steg-tooltip__bubbla::before {
  border-width: var(--pil-hojd) calc(var(--pil-bredd) / 2) 0;
  border-top-color: var(--farg-ram);
}

.steg-tooltip__bubbla::after {
  margin-top: calc(-1 * var(--ram) - 1px);
  border-width: calc(var(--pil-hojd) - 1px) calc(var(--pil-bredd) / 2 - 2px) 0;
  border-top-color: var(--farg-bakgrund);
}

.steg-tooltip--mitten .steg-tooltip__bubbla {
  left: 50%;
  translate: -50% 0;
  --pil-x: 50%;
}

/* Pilen hamnar över stegets cirkel, som ligger först i knappen. */
.steg-tooltip--start .steg-tooltip__bubbla {
  left: 0;
  --pil-x: var(--tooltip-pil-x, 1.5rem);
}

@media (prefers-reduced-motion: no-preference) {
  .steg-tooltip__bubbla {
    animation: steg-tooltip-in 0.12s ease-out;
  }
}

@keyframes steg-tooltip-in {
  from {
    opacity: 0;
  }
}
</style>
