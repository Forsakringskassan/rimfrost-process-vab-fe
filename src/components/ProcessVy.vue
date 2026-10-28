<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { StegIndikator } from "./StegIndikator";
import { type HamtaStegResultat, fetchProcessSteg } from "../utils/fetchProcessSteg";
import { tillStegIndikator } from "../utils/processSteg";

/**
 * Processvyn som portalen laddar bredvid uppgiftens mikrofrontend. Visar var i
 * VAB-processen ärendet befinner sig, utifrån aktiviteten som uppgiften skapades i.
 */
const props = defineProps<{
  /** Tas emot från portalen. Används inte ännu, stegen bestäms av aktivitetId. */
  handlaggningId?: string | null;
  aktivitetId?: string | null;
}>();

const resultat = ref<HamtaStegResultat | null>(null);
let pagaende: AbortController | null = null;

async function hamtaSteg(aktivitetId: string | null | undefined): Promise<void> {
  pagaende?.abort();
  pagaende = null;
  resultat.value = null;

  // En uppgift som inte skapats i en processaktivitet har inget aktivitets-ID.
  if (!aktivitetId) {
    return;
  }

  const controller = new AbortController();
  pagaende = controller;
  const svar = await fetchProcessSteg(aktivitetId, controller.signal);
  // Ett senare anrop (nytt aktivitetId) har tagit över, eller vyn är borttagen.
  if (controller.signal.aborted) {
    return;
  }
  resultat.value = svar;
}

watch(() => props.aktivitetId, hamtaSteg, { immediate: true });

onBeforeUnmount(() => {
  pagaende?.abort();
});

const visning = computed(() => {
  const r = resultat.value;
  if (r?.typ !== "ok" || r.data.steg.length === 0) {
    return null;
  }
  return { processnamn: r.data.processnamn, ...tillStegIndikator(r.data) };
});
</script>

<template>
  <div v-if="visning || resultat?.typ === 'fel'" class="process-vy">
    <StegIndikator
      v-if="visning"
      :steg="visning.steg"
      :aktivt-steg="visning.aktivtSteg"
      :etikett="`Steg i processen ${visning.processnamn}`"
    />
    <p v-else class="process-vy__meddelande">
      Processens steg kan inte visas just nu.
    </p>
  </div>
</template>

<style scoped>
.process-vy__meddelande {
  margin: 0;
  color: var(--fkds-color-text-secondary, #5c5e62);
}
</style>
