<script setup lang="ts">
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import { zoneOf, type QuickStep } from '../../../../engine/quick-sort';

// 「做」里的数组：一排格子，标出 i、j、标杆，按矮队 / 高队 / 标杆 / 已站定上色，当前调用的区间 [lo, hi] 外的格子变淡。
// 逐步执行、找 bug、猜下一步共用。pickable 时格子能点（猜下一步用）。
const props = defineProps<{
  step: QuickStep;
  pickable?: boolean;
  /** 点错的格子 */
  miss?: number | null;
  /** 点对的格子 */
  hit?: number | null;
  t: (msg: Msg) => string;
}>();
const emit = defineEmits<{ pick: [k: number] }>();

function tags(s: QuickStep, k: number) {
  const t: string[] = [];
  if (k === s.i) t.push('i');
  if (k === s.j) t.push('j');
  if (s.pivot !== null && k === s.pivotAt && !s.pdone) t.push('🚩');
  return t.join('·');
}
const canPick = (k: number) => props.pickable && props.step.lo !== null && k >= props.step.lo && k <= props.step.hi!;
</script>

<template>
  <div class="prow" :style="{ '--n': step.arr.length }" :aria-hidden="pickable ? undefined : true">
    <component
      :is="pickable ? 'button' : 'div'"
      v-for="(v, k) in step.arr"
      :key="k"
      :type="pickable ? 'button' : undefined"
      :disabled="pickable ? !canPick(k) : undefined"
      class="col"
      :aria-label="pickable ? t(m('scene.cell', { k, v })) : undefined"
      @click="pickable && emit('pick', k)"
    >
      <span class="tg">{{ tags(step, k) }}</span>
      <span
        class="val"
        :class="[zoneOf(step, k), { swapped: step.swapped && (step.swapped[0] === k || step.swapped[1] === k), miss: miss === k, hit: hit === k }]"
      >{{ v }}</span>
      <span class="ix">{{ k }}</span>
    </component>
  </div>
</template>

<style scoped>
.prow { display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); gap: 6px; max-width: calc(var(--n) * 56px); }
.col { font: inherit; background: none; border: 0; padding: 0; color: var(--fg); display: flex; flex-direction: column; align-items: center; gap: 3px; min-width: 0; }
button.col:not(:disabled) { cursor: pointer; }
button.col:disabled { cursor: default; }
button.col:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; border-radius: 6px; }
.tg { height: 18px; font: 700 12px/18px var(--mono); color: var(--accent); white-space: nowrap; }
.val {
  width: 100%; height: 40px; display: grid; place-items: center; box-sizing: border-box;
  font: 600 14px var(--mono); font-variant-numeric: tabular-nums;
  border: 1.5px solid var(--line); border-radius: 6px; background: var(--bg); color: var(--fg);
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}
.ix { font: 400 11px var(--mono); color: var(--muted); }
button.col:not(:disabled):hover .val { border-color: var(--accent); }
.val.low { background: color-mix(in srgb, var(--accent) 40%, var(--bg)); border-color: var(--accent); }
.val.high { background: color-mix(in srgb, var(--mid) 55%, var(--bg)); border-color: var(--mid); }
.val.pivot { background: var(--warn); border-color: var(--warn); color: var(--bg); }
.val.placed { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
.val.dim { opacity: 0.4; }
.val.swapped { box-shadow: 0 0 0 2px var(--fg); }
.val.miss { border-color: var(--warn); box-shadow: 0 0 0 2px var(--warn); }
.val.hit { box-shadow: 0 0 0 2px var(--accent); }
</style>
