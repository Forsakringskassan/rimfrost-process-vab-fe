<script setup lang="ts">
import ProcessVy from './components/ProcessVy.vue';
import { FLayoutApplicationTemplate, FLayoutLeftPanel, FPageHeader } from '@fkui/vue';

const props = defineProps<{
    handlaggningId?: string | null;
    aktivitetId?: string | null;
}>();

const isDev = import.meta.env.DEV;
const handlaggningId = props.handlaggningId || import.meta.env.VITE_DEV_HANDLAGGNING_ID || null;
const aktivitetId = props.aktivitetId || import.meta.env.VITE_DEV_AKTIVITET_ID || null;
</script>

<template>
    <f-layout-application-template v-if="isDev">
        <template #header>
            <f-page-header />
        </template>
        <f-layout-left-panel>
            <ProcessVy :handlaggningId="handlaggningId" :aktivitetId="aktivitetId" />
        </f-layout-left-panel>
    </f-layout-application-template>
    <ProcessVy v-else :handlaggningId="handlaggningId" :aktivitetId="aktivitetId" />
</template>

<style scoped></style>
