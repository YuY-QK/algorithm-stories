<script setup lang="ts">
import { computed, ref } from 'vue';
import { genPredict, rounds, type Move, type Round } from '../../engine/stack';
import PredictFrame from '../../components/shared/PredictFrame.vue';
import { useStreak } from '../../components/shared/useStreak';
import BracketView from './BracketView.vue';

// 做：猜下一步。每个字符先猜代码会怎么做：入栈、弹出配对，还是 return false；扫完再猜返回值。连对 8 次过关。
const GOAL = 8;

const s = ref('');
const list = ref<Round[]>([]);
const r = ref(0);
const phase = ref<'ask' | 'wrong' | 'end'>('ask');
const { streak, passed, hit, miss } = useStreak(GOAL);

function fresh() {
  s.value = genPredict();
  list.value = rounds(s.value);
  r.value = 0;
  phase.value = 'ask';
}
fresh();

const cur = computed(() => list.value[r.value]);
const atEnd = computed(() => cur.value.i >= s.value.length);

function choose(m: Move) {
  if (phase.value !== 'ask') return;
  if (m === cur.value.correct) {
    hit();
    advance();
  } else {
    miss();
    phase.value = 'wrong';
  }
}

function advance() {
  const m = cur.value.correct;
  if (m === 'fail' || m === 'true' || m === 'false') phase.value = 'end';
  else {
    r.value++;
    phase.value = 'ask';
  }
}

const prompt = computed(() => {
  const d = cur.value;
  if (phase.value === 'end') {
    return d.correct === 'true' ? '✅ 返回 true，这一串全配上了。' : '返回 false：' + (d.correct === 'fail' ? '第 ' + d.i + ' 个字符配不上。' : '扫完栈不空。');
  }
  if (atEnd.value) return '字符都扫完了，栈里有 ' + d.stack.length + ' 个。返回什么？';
  return '轮到第 ' + d.i + ' 个字符 ' + s.value[d.i] + '。代码会做什么？';
});
</script>

<template>
  <PredictFrame
    :streak="streak"
    :goal="GOAL"
    :passed="passed"
    :prompt="prompt"
    :wrong="phase === 'wrong' ? cur.why : null"
    :ended="phase === 'end'"
    @continue="advance"
    @next="fresh"
  >
    <template #board>
      <BracketView :s="s" :i="cur.i" :stack="cur.stack" :bad="phase === 'end' && cur.correct === 'fail'" />
    </template>
    <template #answers>
      <div v-if="phase === 'ask'" class="answers">
        <button v-for="m in cur.options" :key="m.move" type="button" class="btn small mono" @click="choose(m.move)">{{ m.text }}</button>
      </div>
    </template>
  </PredictFrame>
</template>

<style scoped>
.mono { font-family: var(--mono); }
</style>
