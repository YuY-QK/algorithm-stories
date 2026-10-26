<script setup lang="ts">
import type { BinaryStep } from '../../engine/binary-search';
import { TRACE_SIZES, type TraceAction, type TraceInput } from '../../levels/binary-search/flows';
import Segmented from '../../components/shared/Segmented.vue';
import { t } from '../../i18n/runtime';

// 逐步执行的画面：输入控件（part=controls）和数组（part=board）。播放条、变量、代码面板在共享的 TraceHost
const props = defineProps<{ input: TraceInput; send: (a: TraceAction) => void; step: BinaryStep; part: 'controls' | 'board' }>();

function tagFor(k: number) {
  const s = props.step;
  const tags: string[] = [];
  if (k === s.lo) tags.push('lo');
  if (k === s.mid) tags.push('mid');
  if (k === s.hi) tags.push('hi');
  return tags.join('·');
}
</script>

<template>
  <template v-if="part === 'controls'">
    <Segmented
      :model-value="input.size" :legend="t('do.trace.size')" :options="TRACE_SIZES.map((n) => ({ value: n, label: String(n) }))"
      @update:model-value="(size: number) => send({ type: 'size', size })"
    />
    <div class="field">
      <label for="bs-target">{{ t('do.trace.target') }}</label>
      <input id="bs-target" type="number" inputmode="numeric" step="1" :value="input.target" @input="send({ type: 'target', value: ($event.target as HTMLInputElement).value })">
    </div>
    <div class="field">
      <span class="lab">{{ t('do.trace.quick') }}</span>
      <div class="inline">
        <button type="button" class="btn small" @click="send({ type: 'pickIn' })">{{ t('do.trace.pickIn') }}</button>
        <button type="button" class="btn small" @click="send({ type: 'pickOut' })">{{ t('do.trace.pickOut') }}</button>
        <button type="button" class="btn small" @click="send({ type: 'fresh' })">{{ t('do.trace.fresh') }}</button>
      </div>
    </div>
  </template>

  <div v-else class="arr" aria-hidden="true">
    <div
      v-for="(v, k) in input.arr"
      :key="k"
      class="cell"
      :class="{ out: k < step.lo || k > step.hi, mid: k === step.mid, found: k === step.found }"
    >
      <div class="tag">{{ tagFor(k) }}</div>
      <div class="val">{{ v }}</div>
      <div class="idx">{{ k }}</div>
    </div>
  </div>
</template>

<style scoped>
.arr { display: grid; grid-template-columns: repeat(auto-fill, minmax(44px, 1fr)); gap: 10px 6px; }
.cell { display: flex; flex-direction: column; align-items: center; gap: 3px; min-width: 0; }
.val {
  width: 100%; height: 40px; display: grid; place-items: center;
  font: 600 14px var(--mono); font-variant-numeric: tabular-nums;
  border: 1.5px solid var(--line); border-radius: 6px; background: var(--bg); color: var(--fg);
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}
.cell.out .val { background: var(--out); color: var(--out-ink); border-color: transparent; }
.cell.mid .val { background: var(--mid); color: var(--mid-ink); border-color: var(--mid); }
.cell.found .val { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
</style>
