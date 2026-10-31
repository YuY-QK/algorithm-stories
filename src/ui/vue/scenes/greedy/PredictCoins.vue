<script setup lang="ts">
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import type { PredictView } from '../../../../engine/greedy';

// 做：猜下一步的面值一排和找零盘。可以点的面值点了就 emit('act', 面值)，对错由规则判断。
defineProps<{ view: PredictView; picked: number | null; pickable: boolean; t: (msg: Msg) => string }>();
const emit = defineEmits<{ act: [coin: number] }>();
</script>

<template>
  <div class="faces">
    <button
      v-for="c in view.coins"
      :key="c"
      type="button"
      class="face"
      :class="{ right: view.chosen === c, miss: picked === c }"
      :disabled="!pickable"
      :aria-label="t(m('scene.coin', { c }))"
      @click="emit('act', c)"
    >{{ c }}</button>
  </div>
  <div class="pan" :aria-label="t(m('scene.picked'))">
    <span class="pan-lab">picked</span>
    <span v-for="(x, k) in view.plate" :key="k" class="grp">{{ x.coin }} × {{ x.count }}</span>
  </div>
</template>

<style scoped>
.faces { display: flex; flex-wrap: wrap; gap: 8px; }
.face {
  width: 48px; height: 48px; border-radius: 50%; display: grid; place-items: center; padding: 0; cursor: pointer;
  font: 700 15px var(--mono); font-variant-numeric: tabular-nums;
  background: var(--bg); color: var(--fg); border: 1.5px solid var(--line);
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}
.face:disabled { cursor: default; }
.face:not(:disabled):hover { border-color: var(--accent); }
.face:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
.face.right { background: var(--mid); color: var(--mid-ink); border-color: var(--mid-ink); }
.face.miss { border-color: var(--warn); color: var(--warn); }
.pan {
  display: flex; flex-wrap: wrap; align-items: center; gap: 6px; min-height: 40px;
  padding: 6px 10px; border-radius: 10px; border: 1.5px dashed var(--line);
}
.pan-lab { font: 400 12px var(--mono); color: var(--muted); margin-right: 4px; }
.grp { font: 600 13px var(--mono); padding: 2px 8px; border-radius: 999px; background: var(--mid); color: var(--mid-ink); }
</style>
