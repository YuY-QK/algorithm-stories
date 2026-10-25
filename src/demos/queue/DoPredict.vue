<script setup lang="ts">
import { computed, ref } from 'vue';
import { genPredict, opText, PREDICT_CAP, retText, rounds, type Round } from '../../engine/queue';
import PredictFrame from '../../components/shared/PredictFrame.vue';
import { useStreak } from '../../components/shared/useStreak';
import Cells from './Cells.vue';

// 做：猜下一步。每个操作先猜写进 / 读出哪一格（或者满了、空了），
// 再猜 tail / head 接下来指向哪一格。连对 6 次过关。
const GOAL = 6;
const CAP = PREDICT_CAP;

const list = ref<Round[]>([]);
const r = ref(0);
const phase = ref<'at' | 'next' | 'wrong' | 'end'>('at');
const picked = ref<number | null>(null);
const { streak, passed, hit, miss } = useStreak(GOAL);
/** 答错时停在哪一问，看完解释从这里继续 */
let wrongAt: 'at' | 'next' = 'at';

function fresh() {
  list.value = rounds(CAP, genPredict());
  r.value = 0;
  phase.value = 'at';
  picked.value = null;
}
fresh();

const cur = computed(() => list.value[r.value]);
const ptr = computed(() => (cur.value.op.kind === 'offer' ? 'tail' : 'head'));
/** 画面上的状态：第一问时是操作之前，第二问时数组已经写好、指针还没动 */
const view = computed(() => {
  const c = cur.value;
  if (phase.value === 'end') return { ...list.value[list.value.length - 1].after, touched: null };
  if (phase.value === 'next' || (phase.value === 'wrong' && wrongAt === 'next')) {
    return { ...c.before, cells: c.after.cells, touched: c.at as number };
  }
  return { ...c.before, touched: null };
});

function wrong(where: 'at' | 'next') {
  miss();
  wrongAt = where;
  phase.value = 'wrong';
}

/** 第一问：点格子，或者点「满了 / 空了」 */
function answerAt(a: number | 'full' | 'empty') {
  if (phase.value !== 'at') return;
  picked.value = typeof a === 'number' ? a : null;
  if (a === cur.value.at) {
    hit();
    if (typeof a === 'number') phase.value = 'next';
    else advance();
  } else wrong('at');
}

/** 第二问：指针接下来指向哪一格 */
function answerNext(k: number) {
  if (phase.value !== 'next') return;
  picked.value = k;
  if (k === cur.value.next) {
    hit();
    advance();
  } else wrong('next');
}

function tapCell(k: number) {
  if (phase.value === 'at') answerAt(k);
  else answerNext(k);
}

function advance() {
  picked.value = null;
  if (r.value >= list.value.length - 1) phase.value = 'end';
  else {
    r.value++;
    phase.value = 'at';
  }
}

/** 答错后看完解释，按正确答案继续 */
function goOn() {
  const c = cur.value;
  picked.value = null;
  if (wrongAt === 'at' && typeof c.at === 'number') phase.value = 'next';
  else advance();
}

const prompt = computed(() => {
  if (phase.value === 'end') return '这一串做完了。队里还剩 ' + list.value[list.value.length - 1].after.size + ' 个。';
  const c = cur.value;
  if (phase.value === 'at' || (phase.value === 'wrong' && wrongAt === 'at')) {
    return c.op.kind === 'offer'
      ? opText(c.op) + '：' + c.op.x + ' 会写进哪一格？满了就点「满了」。'
      : 'poll()：会读出哪一格？空了就点「空了」。';
  }
  return '返回 ' + retText(c.ret) + '。' + ptr.value + ' 接下来指向哪一格？';
});

const whyText = computed(() => (phase.value === 'wrong' ? (wrongAt === 'at' ? cur.value.why : cur.value.whyNext) : null));
</script>

<template>
  <PredictFrame
    :streak="streak"
    :goal="GOAL"
    :passed="passed"
    :prompt="prompt"
    :wrong="whyText"
    :ended="phase === 'end'"
    @continue="goOn"
    @next="fresh"
  >
    <template #chips>
      <span class="chip"><small>容量</small>{{ CAP }}</span>
      <span class="chip"><small>size</small>{{ view.size }}</span>
    </template>
    <template #board>
      <ol class="ops" aria-label="操作序列">
        <li v-for="(x, k) in list" :key="k" :class="{ now: k === r && phase !== 'end', past: k < r || phase === 'end' }">
          {{ opText(x.op) }}<b v-if="k < r || phase === 'end'"> → {{ retText(x.ret) }}</b>
        </li>
      </ol>
      <Cells
        :cells="view.cells" :head="view.head" :tail="view.tail" :size="view.size" :touched="view.touched"
        :clickable="phase === 'at' || phase === 'next'"
        :miss="phase === 'wrong' ? picked : null"
        @pick="tapCell"
      />
    </template>
    <template #answers>
      <div v-if="phase === 'at'" class="answers">
        <button type="button" class="btn small mono" @click="answerAt('full')">满了：return false</button>
        <button type="button" class="btn small mono" @click="answerAt('empty')">空了：return null</button>
      </div>
    </template>
  </PredictFrame>
</template>

<style scoped>
.ops { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px; font: 500 13px var(--mono); }
.ops li { padding: 2px 8px; border-radius: 6px; border: 1.5px solid var(--line); background: var(--bg); }
.ops li.past { color: var(--muted); }
.ops li.now { border-color: var(--mid); background: var(--mid); color: var(--mid-ink); }
.mono { font-family: var(--mono); }
</style>
