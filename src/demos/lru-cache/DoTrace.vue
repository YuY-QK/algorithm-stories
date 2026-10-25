<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { buildTrace, CODE, genOps, opText, type Op } from '../../engine/lru-cache';
import CodePanel from '../../components/shared/CodePanel.vue';
import Segmented from '../../components/shared/Segmented.vue';
import Transport from '../../components/shared/Transport.vue';
import VarChips from '../../components/shared/VarChips.vue';
import { usePlayer } from '../../components/shared/usePlayer';
import ListView from './ListView.vue';

// 做：逐步执行。链表、哈希表、代码行同步。
const CLASSIC: Op[] = [
  { t: 'put', k: 1, v: 1 }, { t: 'put', k: 2, v: 2 }, { t: 'get', k: 1 }, { t: 'put', k: 3, v: 3 },
  { t: 'get', k: 2 }, { t: 'put', k: 4, v: 4 }, { t: 'get', k: 1 }, { t: 'get', k: 3 }, { t: 'get', k: 4 },
];
const cap = ref(2);
const ops = ref<Op[]>(CLASSIC);
const steps = computed(() => buildTrace(cap.value, ops.value));
const p = usePlayer(steps, [
  { label: '慢', ms: 1300 },
  { label: '中', ms: 800 },
  { label: '快', ms: 350 },
]);
const s = computed(() => p.step.value);

function randomOps() { ops.value = genOps(9, cap.value + 2); }
watch(cap, () => { ops.value = cap.value === 2 ? CLASSIC : genOps(9, cap.value + 2); });

/** 到目前为止每个操作的返回值 */
const rets = computed(() => {
  const out: Record<number, number> = {};
  for (const st of steps.value.slice(0, p.idx.value + 1)) if (st.opEnd && st.ret !== null && ops.value[st.op].t === 'get') out[st.op] = st.ret;
  return out;
});

const vars = computed<[string, string | number][]>(() => [
  ['操作', s.value.opLabel], ['capacity', cap.value], ['map.size', s.value.mapKeys.length], ['返回', s.value.ret ?? '—'],
]);
</script>

<template>
  <div class="controls">
    <Segmented v-model="cap" legend="容量 capacity" :options="[2, 3].map((n) => ({ value: n, label: String(n) }))" />
    <div class="field">
      <span class="lab">操作序列</span>
      <div class="inline">
        <button type="button" class="btn small" @click="cap = 2; ops = CLASSIC">经典例子</button>
        <button type="button" class="btn small" @click="randomOps">换一串</button>
      </div>
    </div>
  </div>

  <div class="stage">
    <ol class="ops" aria-label="操作序列">
      <li v-for="(o, k) in ops" :key="k" :class="{ now: k === s.op, past: k < s.op }">
        <span class="mono">{{ opText(o) }}</span><span v-if="rets[k] !== undefined" class="r">= {{ rets[k] }}</span>
      </li>
    </ol>
    <ListView :list="s.list" :cap="cap" :map-keys="s.mapKeys" :hand="s.hand" :focus="s.focus" :evicted="s.evicted" />
    <VarChips :vars="vars" />
    <p class="note" aria-live="polite">第 {{ p.idx.value + 1 }}/{{ p.total.value }} 步：{{ s.note }}</p>
    <Transport :player="p" />
  </div>

  <CodePanel :lines="CODE" :active="s.line" lang="KOTLIN" />
</template>

<style scoped>
.ops { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; padding: 0; list-style: none; }
.ops li { font: 500 13px var(--mono); padding: 3px 8px; border: 1.5px solid var(--line); border-radius: 6px; background: var(--bg); color: var(--muted); }
.ops li.past { color: var(--fg); }
.ops li.now { background: var(--mid); color: var(--mid-ink); border-color: var(--mid); }
.ops .r { margin-left: 4px; font-weight: 700; }
.note { overflow-wrap: anywhere; }
</style>
