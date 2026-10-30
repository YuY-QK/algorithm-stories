<script setup lang="ts">
import { computed } from 'vue';
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import type { QueueStep, TraceInput } from '../../../../engine/queue';
import Cells from './Cells.vue';
import Ops from './Ops.vue';
import Seats from './Seats.vue';
import { seatLabel } from './seatLabel';

// 做：逐步执行的画面。上面是真实的数组，右边把同一个数组弯成一圈，看 head、tail 怎么绕回。
const props = defineProps<{ input: TraceInput; step: QueueStep; t: (msg: Msg) => string }>();

const n = computed(() => props.step.cells.length);
const live = (k: number) => props.step.size > 0 && (k - props.step.head + n.value) % n.value < props.step.size;
/** 出队后还留在格子里的旧值 */
const stale = computed(() => props.step.cells.map((v, k) => (v !== null && !live(k) ? k : -1)).filter((k) => k >= 0));
const tags = computed(() => {
  const s = props.step;
  const out: Record<number, string> = {};
  out[s.head] = 'head';
  out[s.tail] = s.tail === s.head ? 'head·tail' : 'tail';
  return out;
});
const labels = computed(() => props.step.cells.map((v, i) => seatLabel(props.t, i, v, null)));
</script>

<template>
  <Ops :ops="input.ops" :now="step.op" :past="step.op" :rets="step.rets" :t="t" />
  <div class="views">
    <div class="mem">
      <p class="cap">{{ t(m('trace.array')) }}</p>
      <Cells :cells="step.cells" :head="step.head" :tail="step.tail" :size="step.size" :touched="step.touched" :t="t" />
    </div>
    <div class="circle" aria-hidden="true">
      <p class="cap">{{ t(m('trace.circle')) }}</p>
      <Seats
        :seats="step.cells" ring :tags="tags" :head="step.size ? step.head : null" :tail="step.size < input.cap ? step.tail : null"
        :stale="stale" :touched="step.touched" :labels="labels"
      />
    </div>
  </div>
</template>

<style scoped>
.views { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 230px); gap: 16px; align-items: center; }
.mem, .circle { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.cap { font-size: 13px; color: var(--muted); }
@media (max-width: 600px) {
  .views { grid-template-columns: minmax(0, 1fr); }
  .circle { max-width: 240px; }
}
</style>
