<script setup lang="ts">
import { computed } from 'vue';
import { KID_N } from '../../engine/binary-search';
import type { HideAction, HideState } from '../../levels/binary-search/flows';
import { t } from '../../i18n/runtime';
import Street from './Street.vue';

// 玩法一「藏信」的画面：信箱街和三个指路按钮。规则在 flows.ts 的 hideFlow
const props = defineProps<{ s: HideState; send: (a: HideAction) => void }>();
const letter = computed(() => (props.s.phase === 'hiding' || props.s.phase === 'done' ? props.s.secret : null));
const covered = computed(() => (props.s.phase === 'guide' || props.s.phase === 'walking' ? props.s.secret : null));
const asking = computed(() => props.s.phase === 'guide' || props.s.phase === 'walking');
</script>

<template>
  <Street
    :n="KID_N" :lo="s.lo" :hi="s.hi" :postman="s.at" :doors="s.doors"
    :letter="letter" :covered="covered" :glow="s.glow"
    :clickable="s.phase === 'hide'" @pick="(i) => send({ type: 'hide', i })"
  />
  <div v-if="asking" class="answers">
    <button type="button" class="pad" :disabled="s.phase !== 'guide'" :aria-label="t('play.hide.padLeft')" @click="send({ type: 'answer', d: 'left' })">⬅️</button>
    <button type="button" class="pad" :disabled="s.phase !== 'guide'" :aria-label="t('play.hide.padHit')" @click="send({ type: 'answer', d: 'hit' })">🎉</button>
    <button type="button" class="pad" :disabled="s.phase !== 'guide'" :aria-label="t('play.hide.padRight')" @click="send({ type: 'answer', d: 'right' })">➡️</button>
  </div>
  <div v-if="s.phase === 'done'" class="row">
    <button type="button" class="btn primary" @click="send({ type: 'again' })">{{ t('play.hide.again') }}</button>
  </div>
</template>

<style scoped>
.answers { display: flex; gap: 12px; }
.pad {
  font: inherit; font-size: clamp(1.8rem, 8vw, 2.4rem); cursor: pointer; flex: 0 1 3.2em; height: 1.9em;
  border-radius: 16px; border: 1.5px solid var(--line); background: var(--surface);
}
.pad:disabled { opacity: 0.4; cursor: default; }
.pad:not(:disabled):hover { border-color: var(--accent); }
.pad:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
</style>
