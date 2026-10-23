<script setup lang="ts">
import { computed, ref } from 'vue';
import { decisions, pairOf, predictString, type Decision, type Move } from '../../engine/stack';
import BracketView from './BracketView.vue';

// 做：猜下一步。每个字符先猜代码会怎么做：入栈、弹出配对，还是 return false；扫完再猜返回值。连对 8 次过关。
const GOAL = 8;
const CHAR_MOVES: { move: Move; text: string }[] = [
  { move: 'push', text: 'stack.addLast(c)' },
  { move: 'pop', text: '弹出栈顶，配上了' },
  { move: 'fail', text: 'return false' },
];
const END_MOVES: { move: Move; text: string }[] = [
  { move: 'true', text: 'return stack.isEmpty() → true' },
  { move: 'false', text: 'return stack.isEmpty() → false' },
];

const s = ref('');
const list = ref<Decision[]>([]);
const r = ref(0);
const phase = ref<'ask' | 'wrong' | 'end'>('ask');
const why = ref('');
const streak = ref(0);
const passed = ref(false);

function fresh() {
  s.value = predictString();
  list.value = decisions(s.value);
  r.value = 0;
  phase.value = 'ask';
}
fresh();

const cur = computed(() => list.value[r.value]);
const atEnd = computed(() => cur.value.i >= s.value.length);
const options = computed(() => (atEnd.value ? END_MOVES : CHAR_MOVES));

function explain(d: Decision): string {
  const c = s.value[d.i];
  const top = d.stack[d.stack.length - 1];
  switch (d.move) {
    case 'push': return c + ' 是左括号，直接入栈，等后面的右括号来配。';
    case 'pop': return c + ' 是右括号，栈顶 ' + top + ' 正好是它的另一半：弹出栈顶，配上了。';
    case 'fail': return top === undefined
      ? c + ' 是右括号，可栈是空的，没有左括号能配：return false。'
      : '栈顶 ' + top + ' 要配 ' + pairOf(top) + '，来的却是 ' + c + '：return false。';
    case 'true': return '扫完了，栈是空的，每个左括号都配上了：返回 true。';
    default: return '扫完了，栈里还剩 ' + d.stack.length + ' 个左括号没配上：返回 false。';
  }
}

function choose(m: Move) {
  if (phase.value !== 'ask') return;
  if (m === cur.value.move) {
    streak.value++;
    if (streak.value >= GOAL) passed.value = true;
    advance();
  } else {
    streak.value = 0;
    why.value = explain(cur.value);
    phase.value = 'wrong';
  }
}

function advance() {
  const m = cur.value.move;
  if (m === 'fail' || m === 'true' || m === 'false') phase.value = 'end';
  else {
    r.value++;
    phase.value = 'ask';
  }
}

const prompt = computed(() => {
  const d = cur.value;
  if (phase.value === 'end') {
    return d.move === 'true' ? '✅ 返回 true，这一串全配上了。' : '返回 false：' + (d.move === 'fail' ? '第 ' + d.i + ' 个字符配不上。' : '扫完栈不空。');
  }
  if (atEnd.value) return '字符都扫完了，栈里有 ' + d.stack.length + ' 个。返回什么？';
  return '轮到第 ' + d.i + ' 个字符 ' + s.value[d.i] + '。代码会做什么？';
});
</script>

<template>
  <div class="stage">
    <div class="vars">
      <span class="chip"><small>连对</small>{{ Math.min(streak, GOAL) }} / {{ GOAL }}</span>
      <span v-if="passed" class="chip win">🏅 过关</span>
    </div>
    <BracketView :s="s" :i="cur.i" :stack="cur.stack" :bad="phase === 'end' && cur.move === 'fail'" />
    <p class="note" aria-live="polite">{{ prompt }}</p>
    <div v-if="phase === 'ask'" class="answers">
      <button v-for="m in options" :key="m.move" type="button" class="btn small mono" @click="choose(m.move)">{{ m.text }}</button>
    </div>
    <div v-if="phase === 'wrong'" class="oops-box">
      <p>❌ {{ why }}</p>
      <button type="button" class="btn small" @click="advance">知道了，继续</button>
    </div>
    <div v-if="phase === 'end'" class="row">
      <button type="button" class="btn small primary" @click="fresh">下一题</button>
    </div>
  </div>
</template>

<style scoped>
.mono { font-family: var(--mono); }
.win { border-color: var(--accent); color: var(--accent); }
.oops-box { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; border-left: 3px solid var(--warn); padding-left: 12px; }
</style>
