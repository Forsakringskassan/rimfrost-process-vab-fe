<script setup lang="ts">
import { type StegStatus, statusText } from "./steg";

/**
 * Detaljpanelen för ett steg i StegIndikator. Är en egen komponent eftersom
 * den renderas på olika platser beroende på layout.
 */
defineProps<{
  id: string;
  /** Id för knappen som öppnade panelen. */
  etikettId: string;
  rubrik: string;
  status: StegStatus;
  /** Chevron som pekar från steget mot panelen. "ingen" när föräldern ritar den. */
  pil: "ingen" | "hoger" | "ned";
}>();

defineEmits<{ stang: [] }>();
</script>

<template>
  <section
    :id
    class="steg-detaljer"
    :class="`steg-detaljer--pil-${pil}`"
    :aria-labelledby="etikettId"
    tabindex="-1"
    @keydown.esc="$emit('stang')"
  >
    <svg
      v-if="pil !== 'ingen'"
      class="steg-detaljer__chevron"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <polyline v-if="pil === 'hoger'" points="8 5 15 12 8 19" />
      <polyline v-else points="5 8 12 15 19 8" />
    </svg>
    <div class="steg-detaljer__innehall">
      <p class="steg-detaljer__rubrik">
        {{ rubrik }}
        <span class="steg-detaljer__status">{{ statusText[status] }}</span>
      </p>
      <slot></slot>
    </div>
  </section>
</template>

<style scoped>
.steg-detaljer {
  position: relative;
  min-width: 0;
  outline: none;
}

.steg-detaljer__innehall {
  padding: 1rem 1.25rem;
  border: 1px solid var(--fkds-color-border-weak, #d1d2d3);
  border-radius: var(--f-border-radius-medium, 0.5rem);
  background: var(--fkds-color-background-primary, #fff);
  overflow-wrap: break-word;
}

.steg-detaljer__rubrik {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.25rem 0.75rem;
  margin: 0 0 0.5rem;
  font-weight: 600;
}

.steg-detaljer__status {
  font-size: 0.875rem;
  font-weight: 400;
  color: var(--fkds-color-text-secondary, #5c5e62);
}

.steg-detaljer :deep(p:last-child) {
  margin-bottom: 0;
}

.steg-detaljer__chevron {
  display: block;
  width: var(--chevron, 1.5rem);
  height: var(--chevron, 1.5rem);
  fill: none;
  stroke: var(--fkds-color-border-strong, #1b1e23);
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* Chevronen ligger i mellanrummet till vänster om panelen, i höjd med cirkeln. */
.steg-detaljer--pil-hoger .steg-detaljer__chevron {
  position: absolute;
  left: calc(-1 * (var(--chevron, 1.5rem) + 0.375rem));
  top: var(--chevron-top, 0.5rem);
}

.steg-detaljer--pil-ned .steg-detaljer__chevron {
  margin: 0 0 0.25rem;
}

@media (prefers-reduced-motion: no-preference) {
  .steg-detaljer {
    animation: steg-detaljer-in 0.15s ease-out;
  }
}

@keyframes steg-detaljer-in {
  from {
    opacity: 0;
  }
}
</style>
