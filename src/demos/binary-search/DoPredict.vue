<script setup lang="ts">
import { computed, ref } from 'vue';
import { genPredict, rounds, type Round } from '../../engine/binary-search';
import PredictFrame from '../../components/shared/PredictFrame.vue';
import { useStreak } from '../../components/shared/useStreak';

// 做：猜下一步。每一轮循环先点出 mid，再选接下来怎么走。连对 5 次过关。
const GOAL = 5;
type Move = Round['move'];
const MOVES: { move: Move; text: string }[] = [
  { move: 'found', text: '找到了：return mid' },
  { move: 'right', text: 'lo = mid + 1' },
  { move: 'left', text: 'hi = mid - 1' },
];

const arr = ref<number[]>([]);
const target = ref(0);
const list = ref<Round[]>([]);
const r = ref(0);
const phase = ref<'mid' | 'move' | 'wrong' | 'end'>('mid');
const picked = ref<number | null>(null);
const why = ref('');
const { streak, passed, hit, miss: resetStreak } = useStreak(GOAL);

function fresh() {
  const q = genPredict();
  arr.value = q.arr;
  target.value = q.target;
  list.value = rounds(arr.value, target.value);
  r.value = 0;
  phase.value = 'mid';
  picked.value = null;
}
fresh();

const cur = computed(() => list.value[r.value]);
/** 结束时（找到或范围为空）的 lo、hi */
const endState = computed(() => {
  const last = list.value[list.value.length - 1];
  if (last.move === 'found') return { lo: last.lo, hi: last.hi, found: last.mid };
  return last.move === 'right' ? { lo: last.mid + 1, hi: last.hi, found: -1 } : { lo: last.lo, hi: last.mid - 1, found: -1 };
});
const view = computed(() => (phase.value === 'end' ? { ...endState.value, mid: null } : { lo: cur.value.lo, hi: cur.value.hi, mid: phase.value === 'mid' ? null : cur.value.mid, found: -1 }));

function miss(text: string) {
  resetStreak();
  why.value = text;
  phase.value = 'wrong';
}

function tapCell(k: number) {
  if (phase.value !== 'mid') return;
  picked.value = k;
  if (k === cur.value.mid) {
    hit();
    phase.value = 'move';
  } else {
    miss(cur.value.whyMid);
  }
}

function chooseMove(m: Move) {
  if (phase.value !== 'move') return;
  if (m === cur.value.move) {
    hit();
    advance();
  } else {
    miss(cur.value.why);
  }
}

function advance() {
  picked.value = null;
  if (cur.value.move === 'found' || r.value >= list.value.length - 1) phase.value = 'end';
  else {
    r.value++;
    phase.value = 'mid';
  }
}

/** 答错后看完解释，按正确答案继续 */
function goOn() {
  if (picked.value !== null && picked.value !== cur.value.mid) {
    picked.value = null;
    phase.value = 'move';
  } else advance();
}

const prompt = computed(() => {
  if (phase.value === 'end') {
    const e = endState.value;
    return e.found >= 0 ? '找到了，返回 ' + e.found + '。' : 'lo = ' + e.lo + ' > hi = ' + e.hi + '，范围空了，返回 -1。';
  }
  const { lo, hi, mid } = cur.value;
  if (phase.value === 'mid') return 'lo = ' + lo + '，hi = ' + hi + '。mid 是哪一格？点它。';
  return 'arr[' + mid + '] = ' + arr.value[mid] + '，target = ' + target.value + '。接下来？';
});
</script>

<template>
  <PredictFrame
    :streak="streak"
    :goal="GOAL"
    :passed="passed"
    :prompt="prompt"
    :wrong="phase === 'wrong' ? why : null"
    :ended="phase === 'end'"
    @continue="goOn"
    @next="fresh"
  >
    <template #chips>
      <span class="chip"><small>target</small>{{ target }}</span>
    </template>
    <template #board>
      <div class="arr">
        <button
          v-for="(v, k) in arr"
          :key="k"
          type="button"
          class="cell"
          :class="{
            out: k < view.lo || k > view.hi,
            mid: k === view.mid,
            found: k === view.found,
            miss: phase === 'wrong' && k === picked && k !== cur.mid,
          }"
          :disabled="phase !== 'mid'"
          :aria-label="'下标 ' + k + '，值 ' + v"
          @click="tapCell(k)"
        >
          <span class="tag">{{ k === view.lo ? 'lo' : '' }}{{ k === view.lo && k === view.hi ? '·' : '' }}{{ k === view.hi ? 'hi' : '' }}</span>
          <span class="val">{{ v }}</span>
          <span class="idx">{{ k }}</span>
        </button>
      </div>
    </template>
    <template #answers>
      <div v-if="phase === 'move'" class="answers">
        <button v-for="m in MOVES" :key="m.move" type="button" class="btn small mono" @click="chooseMove(m.move)">{{ m.text }}</button>
      </div>
    </template>
  </PredictFrame>
</template>

<style scoped>
.arr { display: grid; grid-template-columns: repeat(auto-fill, minmax(40px, 1fr)); gap: 10px 5px; }
.cell { font: inherit; background: none; border: 0; padding: 0; display: flex; flex-direction: column; align-items: center; gap: 3px; min-width: 0; color: var(--fg); cursor: pointer; }
.cell:disabled { cursor: default; }
.cell:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; border-radius: 6px; }
.val {
  width: 100%; height: 40px; display: grid; place-items: center;
  font: 600 14px var(--mono); font-variant-numeric: tabular-nums;
  border: 1.5px solid var(--line); border-radius: 6px; background: var(--bg);
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}
.cell:not(:disabled):hover .val { border-color: var(--accent); }
.cell.out .val { background: var(--out); color: var(--out-ink); border-color: transparent; }
.cell.mid .val { background: var(--mid); color: var(--mid-ink); border-color: var(--mid); }
.cell.found .val { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
.cell.miss .val { border-color: var(--warn); color: var(--warn); }
.mono { font-family: var(--mono); }
</style>
