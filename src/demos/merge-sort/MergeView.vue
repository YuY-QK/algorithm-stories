<script setup lang="ts">
import { computed } from 'vue';
import { suitOf, type MergeStep } from '../../engine/merge-sort';

// 「做」里的数组：上面一排是 a（亮的是当前区间，橙色竖线是 mid），下面一排是临时数组 tmp，
// 标出 i、j 两个队头。逐步执行、猜下一步、找 bug 共用。suits 为真时每个元素带上花色，用来看稳定性。
const props = defineProps<{ step: MergeStep; suits?: boolean }>();

const n = computed(() => props.step.arr.length);

function tag(k: number) {
  const s = props.step;
  const t: string[] = [];
  if (k === s.i) t.push('i');
  if (k === s.j) t.push('j');
  return t.join('·');
}

/** 已经取走、放进 tmp 的格子（合并还没抄回去之前） */
function taken(k: number) {
  const s = props.step;
  if (s.line < 7 || s.line > 15 || s.i === null || s.j === null || s.mid === null) return false;
  if (!s.tmp.length) return false;
  return (k >= s.lo && k < s.i) || (k >= s.mid && k < s.j);
}

function tmpCell(k: number) {
  const s = props.step;
  const t = k - s.lo;
  if (!s.tmp.length || t < 0 || t >= s.tmp.length) return null;
  return { v: s.tmp[t], id: s.tmpIds[t], put: s.put === t };
}

const inRange = (k: number) => k >= props.step.lo && k < props.step.hi;
</script>

<template>
  <div class="mv" :style="{ '--n': n }" aria-hidden="true">
    <div class="calls">
      <span class="lab">调用栈</span>
      <span v-for="(r, x) in step.stack" :key="x" class="call" :class="{ top: x === step.stack.length - 1 }">[{{ r[0] }}, {{ r[1] }})</span>
    </div>
    <div class="grid tags">
      <div v-for="(_, k) in step.arr" :key="k" class="tag">{{ tag(k) }}</div>
    </div>
    <div class="grid">
      <div
        v-for="(v, k) in step.arr"
        :key="k"
        class="val"
        :class="{
          out: !inRange(k),
          sorted: step.sorted[k],
          taken: taken(k),
          vs: step.cmp !== null && (k === step.cmp[0] || k === step.cmp[1]),
          mid: step.mid !== null && k === step.mid && inRange(k),
        }"
      >{{ v }}<small v-if="suits">{{ suitOf(step.ids[k]) }}</small></div>
    </div>
    <div class="grid">
      <div v-for="(_, k) in step.arr" :key="k" class="idx">{{ k }}</div>
    </div>
    <div class="cap">{{ step.tmp.length ? 'tmp（临时数组，长度 ' + step.tmp.length + '）' : '' }}</div>
    <div class="grid">
      <template v-for="(_, k) in step.arr" :key="k">
        <div
          v-if="tmpCell(k)"
          class="val t"
          :class="{ empty: tmpCell(k)!.v === null, put: tmpCell(k)!.put }"
        >{{ tmpCell(k)!.v ?? '' }}<small v-if="suits && tmpCell(k)!.v !== null">{{ suitOf(tmpCell(k)!.id!) }}</small></div>
        <div v-else class="gap" />
      </template>
    </div>
  </div>
</template>

<style scoped>
.mv { display: flex; flex-direction: column; gap: 3px; max-width: calc(var(--n) * 58px); }
.grid { display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); gap: 4px; }
.calls { display: flex; flex-wrap: wrap; gap: 4px 6px; align-items: center; margin-bottom: 8px; }
.calls .lab { font: 400 11px var(--mono); color: var(--muted); margin-right: 4px; }
.call { font: 600 12px var(--mono); padding: 1px 7px; border-radius: 5px; border: 1.5px solid var(--line); background: var(--bg); }
.call.top { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
.tags .tag { text-align: center; }
.val {
  height: 38px; display: grid; place-items: center; box-sizing: border-box; min-width: 0;
  font: 600 14px var(--mono); font-variant-numeric: tabular-nums;
  border: 1.5px solid var(--line); border-radius: 6px; background: var(--bg); color: var(--fg);
  transition: background 0.2s, color 0.2s, border-color 0.2s, opacity 0.2s;
}
small { font-size: 10px; line-height: 1; display: block; margin-top: -3px; }
.val.out { opacity: 0.35; }
.val.sorted { border-color: var(--accent); }
.val.mid { border-left: 4px solid var(--mid); }
.val.taken { border-style: dashed; color: var(--out-ink); }
.val.vs { background: var(--mid); color: var(--mid-ink); border-color: var(--mid); }
.val.t { border-color: var(--accent); }
.val.t.empty { border-style: dashed; border-color: var(--line); background: transparent; }
.val.t.put { background: var(--accent); color: var(--accent-ink); }
.gap { height: 38px; }
.cap { font: 400 11px var(--mono); color: var(--muted); min-height: 14px; margin-top: 4px; }
</style>
