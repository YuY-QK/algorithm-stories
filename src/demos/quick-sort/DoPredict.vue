<script setup lang="ts">
import { computed, ref } from 'vue';
import { genArray, makeQuiz, type Question } from '../../engine/quick-sort';
import CallStack from './CallStack.vue';
import PartRow from './PartRow.vue';

// 做：猜下一步。动画停在 partition 里的某一刻，猜接下来会发生什么：
// j 指着的要不要换、换到哪、循环结束标杆落在哪、分区完递归哪两个区间。连对 6 次过关。
const GOAL = 6;
const list = ref<Question[]>([]);
const qi = ref(0);
const phase = ref<'ask' | 'target' | 'wrong'>('ask');
const miss = ref<number | null>(null);
const hit = ref<number | null>(null);
const why = ref('');
const streak = ref(0);
const passed = ref(false);

function fresh() {
  list.value = makeQuiz(genArray(7, 12));
  qi.value = 0;
  begin();
}
function begin() {
  const q = list.value[qi.value];
  phase.value = q.kind === 'land' ? 'target' : 'ask';
  miss.value = null;
  hit.value = null;
}
fresh();

const q = computed(() => list.value[qi.value]);
const st = computed(() => q.value.step);

function good() {
  streak.value++;
  if (streak.value >= GOAL) passed.value = true;
  next();
}
function bad(text: string, showHit: number | null = null) {
  streak.value = 0;
  why.value = text;
  hit.value = showHit;
  phase.value = 'wrong';
}
function next() {
  if (qi.value >= list.value.length - 1) fresh();
  else {
    qi.value++;
    begin();
  }
}

/** swap 题：j 指着的元素和标杆比一比 */
function willText(): string {
  const s = st.value;
  const v = s.arr[s.j!];
  const pv = s.pivot!;
  return v < pv
    ? v + ' < ' + pv + ' 成立：i++，然后 swap(arr, i, j)，把它换进矮队的末尾。'
    : v + (v === pv ? ' 等于 ' : ' 大于 ') + pv + '，arr[j] < pivot 不成立，什么也不做，j 往右走一格。' + (v === pv ? '相等的不进矮队，会留在右边。' : '');
}
function answerWill(yes: boolean) {
  if (q.value.kind !== 'swap') return;
  if (yes !== q.value.will) return bad(willText());
  if (yes) phase.value = 'target';
  else good();
}
function tap(k: number) {
  if (phase.value !== 'target') return;
  const qq = q.value;
  if (qq.kind === 'swap') {
    if (k === qq.target) return good();
    miss.value = k;
    const s = st.value;
    return bad(
      'i 现在是 ' + s.i + '，i++ 之后是 ' + qq.target + '，也就是矮队后面的第一个位置。arr[j] 要和 arr[' + qq.target + '] 交换' +
      (qq.target === s.j ? '（正好是它自己，位置不变）。' : '，原来在那里的 ' + s.arr[qq.target] + ' 不比标杆小，被换到 j 的位置。'),
      qq.target,
    );
  }
  if (qq.kind === 'land') {
    if (k === qq.target) return good();
    miss.value = k;
    const s = st.value;
    return bad(
      '循环结束时 i = ' + s.i + '，下标 ' + s.lo + ' 到 ' + s.i + ' 都是矮队。矮队后面的第一个位置 i + 1 = ' + qq.target + '，标杆和它交换，就落在下标 ' + qq.target + '。' +
      (qq.target === s.hi ? '这里正好是最右边：标杆是最大的，原地不动。' : ''),
      qq.target,
    );
  }
}
function answerRange(ok: boolean) {
  if (q.value.kind !== 'ranges') return;
  if (ok) return good();
  bad('标杆已经站定在下标 ' + q.value.p + '，不用再排。左边是 [lo, p − 1]，右边是 [p + 1, hi]：区间里不能再带上标杆，否则可能永远缩不小。');
}

const prompt = computed(() => {
  const qq = q.value;
  const s = st.value;
  if (qq.kind === 'swap') {
    return phase.value === 'target'
      ? 'i++ 之后 i = ' + qq.target + '。arr[j] 要和哪一格交换？点它。'
      : 'j = ' + s.j + '，arr[j] = ' + s.arr[s.j!] + '，pivot = ' + s.pivot + '。接下来会发生什么？';
  }
  if (qq.kind === 'land') return '循环结束，j = hi，i = ' + s.i + '。最后一行 swap(arr, i + 1, hi)：标杆 ' + s.pivot + ' 会落在哪一格？点它。';
  return 'partition 返回了 p = ' + qq.p + '，标杆 ' + s.arr[qq.p] + ' 已经站定。接下来两行递归，分别处理哪两个区间？';
});
</script>

<template>
  <div class="stage">
    <div class="vars">
      <span class="chip"><small>连对</small>{{ Math.min(streak, GOAL) }} / {{ GOAL }}</span>
      <span v-if="passed" class="chip win">🏅 过关</span>
      <span class="chip"><small>lo, hi</small>{{ st.lo }}, {{ st.hi }}</span>
    </div>
    <PartRow :step="st" :pickable="phase === 'target'" :miss="miss" :hit="hit" @pick="tap" />
    <CallStack :stack="st.stack" />
    <p class="note" aria-live="polite">{{ prompt }}</p>

    <div v-if="phase === 'ask' && q.kind === 'swap'" class="answers">
      <button type="button" class="btn small" @click="answerWill(true)">✅ 比标杆小：i++ 再交换</button>
      <button type="button" class="btn small" @click="answerWill(false)">⏭ 不比标杆小：什么也不做</button>
    </div>
    <div v-if="phase === 'ask' && q.kind === 'ranges'" class="answers">
      <button v-for="o in q.options" :key="o.text" type="button" class="btn small mono" @click="answerRange(o.ok)">{{ o.text }}</button>
    </div>
    <div v-if="phase === 'wrong'" class="oops-box">
      <p>❌ {{ why }}</p>
      <button type="button" class="btn small" @click="next">知道了，下一题</button>
    </div>
  </div>
</template>

<style scoped>
.mono { font-family: var(--mono); }
.answers .btn { flex: 0 1 auto; text-align: left; }
.win { border-color: var(--accent); color: var(--accent); }
.oops-box { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; border-left: 3px solid var(--warn); padding-left: 12px; }
.note { overflow-wrap: anywhere; }
</style>
