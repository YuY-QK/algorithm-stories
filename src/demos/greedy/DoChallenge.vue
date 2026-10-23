<script setup lang="ts">
import { computed, ref } from 'vue';
import { CHALLENGE, checkLimit, counterexample, desc } from '../../engine/greedy';

// 做：挑战「贪心靠得住吗」。每套面值先判断：贪心是不是对每个金额都拿到最少？
// 答完用动态规划揭晓：查 1 到「最大两种面值之和」的每个金额，找最小的反例。
const k = ref(0);
const answers = ref<(boolean | null)[]>(CHALLENGE.map(() => null));

const q = computed(() => CHALLENGE[k.value]);
const truth = computed(() => counterexample(q.value.coins));
const mine = computed(() => answers.value[k.value]);
const right = computed(() => mine.value !== null && mine.value === (truth.value === null));
const score = computed(() => answers.value.filter((a, i) => a !== null && a === (counterexample(CHALLENGE[i].coins) === null)).length);
const finished = computed(() => answers.value.every((a) => a !== null));

function answer(alwaysBest: boolean) {
  if (mine.value !== null) return;
  answers.value = answers.value.map((a, i) => (i === k.value ? alwaysBest : a));
}
function next() { if (k.value < CHALLENGE.length - 1) k.value++; }
function restart() {
  answers.value = CHALLENGE.map(() => null);
  k.value = 0;
}
</script>

<template>
  <div class="stage">
    <p>下面每套面值都有 1、数量不限。<b>贪心是不是对每个金额都能拿到最少？</b>先凭感觉判断，再看动态规划揭晓。</p>
    <div class="vars">
      <span class="chip"><small>第</small>{{ k + 1 }} / {{ CHALLENGE.length }} 题</span>
      <span class="chip"><small>答对</small>{{ score }}</span>
    </div>
    <div class="sys" :aria-label="'面值：' + desc(q.coins).join('、')">
      <span v-for="c in desc(q.coins)" :key="c" class="face" aria-hidden="true">{{ c }}</span>
    </div>
    <p class="small-note">{{ q.note }}</p>

    <div v-if="mine === null" class="answers">
      <button type="button" class="btn small" @click="answer(true)">✅ 贪心总是最少</button>
      <button type="button" class="btn small" @click="answer(false)">❌ 有时会多拿</button>
    </div>
    <div v-else class="reveal" aria-live="polite">
      <p class="verdict">{{ right ? '🎯 答对了' : '🤔 没猜中' }}</p>
      <p v-if="truth">
        金额 <b>{{ truth.amount }}</b> 时，贪心拿 {{ truth.greedy.join(' + ') }}（{{ truth.greedy.length }} 枚），
        其实 {{ truth.best.join(' + ') }} 只要 {{ truth.best.length }} 枚。这是最小的反例。
      </p>
      <p v-else>
        动态规划把 1 到 {{ checkLimit(q.coins) - 1 }} 的每个金额都算了一遍，贪心每次都是最少的。
        已经证明：反例如果存在，一定比最大两种面值之和（{{ checkLimit(q.coins) }}）小，所以查到这里就够了。
      </p>
      <button v-if="k < CHALLENGE.length - 1" type="button" class="btn small primary" @click="next">下一题</button>
    </div>

    <div v-if="finished" class="result">
      <h3>{{ score === CHALLENGE.length ? '🏅 全对！' : '答对 ' + score + ' / ' + CHALLENGE.length }}</h3>
      <p>凭感觉很难判断。真要用贪心，先用动态规划把「最大两种面值之和」以内的金额都核对一遍。</p>
      <button type="button" class="btn small" @click="restart">再来一遍</button>
    </div>
  </div>
</template>

<style scoped>
.sys { display: flex; flex-wrap: wrap; gap: 8px; }
.face {
  width: 46px; height: 46px; border-radius: 50%; display: grid; place-items: center;
  font: 700 15px var(--mono); background: var(--mid); color: var(--mid-ink); border: 1.5px solid var(--mid-ink);
}
.reveal { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; border-left: 3px solid var(--accent); padding-left: 12px; }
.verdict { font-weight: 700; }
</style>
