<script setup lang="ts">
import { ref } from 'vue';
import { binaryWorst, challengeAverage, CHALLENGE_GAMES, genChallenge, judgeAverage, judgeWorst, simulate } from '../../engine/linear-search';
import { play } from '../../components/shared/sound';

// 做：挑战。n 个箱子，先猜最坏要开几个，再猜平均要开几个，最后让程序藏 200 次小熊来验证。
const n = ref(0);
const step = ref<'worst' | 'avg' | 'sim'>('worst');
const input = ref('');
const msg = ref('');
const ok = ref('');
const result = ref<{ average: number; best: number; worst: number } | null>(null);

function fresh() {
  n.value = genChallenge().n;
  step.value = 'worst';
  input.value = '';
  msg.value = '';
  ok.value = '';
  result.value = null;
}
fresh();

function guess() {
  const g = parseInt(input.value, 10);
  if (isNaN(g) || g < 1) {
    msg.value = '请输入一个大于 0 的整数。';
    return;
  }
  const j = step.value === 'worst' ? judgeWorst(n.value, g) : judgeAverage(n.value, g);
  input.value = '';
  if (!j.ok) {
    msg.value = j.why;
    play('wrong');
    return;
  }
  msg.value = '';
  ok.value = j.why;
  play('right');
  step.value = step.value === 'worst' ? 'avg' : 'sim';
}

function run() {
  result.value = simulate(n.value, CHALLENGE_GAMES);
  play('win');
}
</script>

<template>
  <div class="stage">
    <p>一排 <b>{{ n }}</b> 个箱子，小熊藏在其中一个里，每个位置的可能一样大。从第 1 个开始一个个开，找到就停。</p>

    <form v-if="step !== 'sim'" class="inline" @submit.prevent="guess">
      <label for="ls-guess">{{ step === 'worst' ? '最倒霉的时候，要开几个？' : '平均下来，大约要开几个？' }}</label>
      <input id="ls-guess" v-model="input" type="number" inputmode="numeric" min="1" placeholder="你猜">
      <button type="submit" class="btn small primary">确定</button>
    </form>
    <p v-if="msg" class="oops">{{ msg }}</p>
    <p v-if="ok" class="note">✅ {{ ok }}</p>

    <div v-if="step === 'sim'" class="sim">
      <button v-if="!result" type="button" class="btn primary" @click="run">🧸 藏 {{ CHALLENGE_GAMES }} 次小熊，看看平均开几个</button>
      <div v-else class="result">
        <h3>🏅 挑战成功！</h3>
        <div class="vars">
          <span class="chip"><small>平均开了</small>{{ result.average.toFixed(1) }} 个</span>
          <span class="chip"><small>算出来</small>{{ challengeAverage(n) }} 个</span>
          <span class="chip"><small>最少</small>{{ result.best }} 个</span>
          <span class="chip"><small>最多</small>{{ result.worst }} 个</span>
        </div>
        <p>平均是总数的一半多一点，所以顺序查找是 O(n)。同样 {{ n }} 个箱子，要是排好了顺序，二分查找最多只要看 {{ binaryWorst(n) }} 个。</p>
        <div class="row">
          <button type="button" class="btn small" @click="run">再藏 {{ CHALLENGE_GAMES }} 次</button>
          <button type="button" class="btn small" @click="fresh">换一排</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.inline { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.inline input { width: 6em; }
.sim { display: flex; flex-direction: column; gap: 12px; }
</style>
