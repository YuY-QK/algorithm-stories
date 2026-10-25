<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { buildTrace, CODE, opText, PRESETS, randomOps, TRACE_CAP, TRACE_OPS, type Op } from '../../engine/queue';
import CodePanel from '../../components/shared/CodePanel.vue';
import Segmented from '../../components/shared/Segmented.vue';
import Transport from '../../components/shared/Transport.vue';
import VarChips from '../../components/shared/VarChips.vue';
import { usePlayer } from '../../components/shared/usePlayer';
import Cells from './Cells.vue';
import Seats from './Seats.vue';

// 做：逐步执行。上面是真实的数组，右边把同一个数组弯成一圈，看 head、tail 怎么绕回。
type Which = 'wrap' | 'full' | 'random';
const which = ref<Which>('wrap');
const cap = ref(4);
const ops = ref<Op[]>(PRESETS[0].ops);

function load() {
  const p = PRESETS.find((x) => x.id === which.value);
  if (p) {
    cap.value = p.cap;
    ops.value = p.ops;
  } else {
    cap.value = TRACE_CAP;
    ops.value = randomOps(TRACE_CAP, TRACE_OPS);
  }
}
watch(which, load);

const steps = computed(() => buildTrace(cap.value, ops.value));
const p = usePlayer(steps);
const s = computed(() => p.step.value);

const n = computed(() => s.value.cells.length);
const live = (k: number) => s.value.size > 0 && (k - s.value.head + n.value) % n.value < s.value.size;
const stale = computed(() => s.value.cells.map((v, k) => (v !== null && !live(k) ? k : -1)).filter((k) => k >= 0));
const tags = computed(() => {
  const t: Record<number, string> = {};
  t[s.value.head] = 'head';
  t[s.value.tail] = s.value.tail === s.value.head ? 'head·tail' : 'tail';
  return t;
});

const vars = computed<[string, string | number][]>(() => [
  ['head', s.value.head], ['tail', s.value.tail], ['size', s.value.size], ['容量', cap.value],
  ['出队', s.value.out.length ? s.value.out.join(' ') : '—'],
]);
</script>

<template>
  <div class="controls">
    <Segmented
      v-model="which" legend="操作序列"
      :options="[{ value: 'wrap', label: '绕一圈' }, { value: 'full', label: '满了、空了' }, { value: 'random', label: '随机' }]"
    />
    <button v-if="which === 'random'" type="button" class="btn small" @click="load">换一串</button>
  </div>

  <div class="stage">
    <ol class="ops" aria-label="操作序列">
      <li v-for="(o, k) in ops" :key="k" :class="{ now: k === s.op, past: k < s.op }">
        {{ opText(o) }}<b v-if="s.rets[k] !== undefined"> → {{ s.rets[k] }}</b>
      </li>
    </ol>
    <div class="views">
      <div class="mem">
        <p class="cap">数组 items</p>
        <Cells :cells="s.cells" :head="s.head" :tail="s.tail" :size="s.size" :touched="s.touched" />
      </div>
      <div class="circle" aria-hidden="true">
        <p class="cap">弯成一圈看</p>
        <Seats :seats="s.cells" ring :tags="tags" :head="s.size ? s.head : null" :tail="s.size < cap ? s.tail : null" :stale="stale" :touched="s.touched" />
      </div>
    </div>
    <VarChips :vars="vars" />
    <p class="note" aria-live="polite">第 {{ p.idx.value + 1 }}/{{ p.total.value }} 步：{{ s.note }}</p>
    <Transport :player="p" />
  </div>

  <CodePanel :lines="CODE" :active="s.line" lang="KOTLIN" />
</template>

<style scoped>
.ops { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px; font: 500 13px var(--mono); }
.ops li { padding: 2px 8px; border-radius: 6px; border: 1.5px solid var(--line); background: var(--bg); }
.ops li.past { color: var(--muted); }
.ops li.now { border-color: var(--mid); background: var(--mid); color: var(--mid-ink); }
.ops b { font-weight: 700; }
.views { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 230px); gap: 16px; align-items: center; }
.mem, .circle { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.cap { font-size: 13px; color: var(--muted); }
@media (max-width: 600px) {
  .views { grid-template-columns: minmax(0, 1fr); }
  .circle { max-width: 240px; }
}
</style>
