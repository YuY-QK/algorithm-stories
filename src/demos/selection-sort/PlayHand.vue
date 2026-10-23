<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  HAND_N, genCandies, handInit, handNeed, handPlace, handRoundOver, handStep, stars,
  type HandChoice, type HandState,
} from '../../engine/selection-sort';
import Candies from './Candies.vue';
import CandyPair from './CandyPair.vue';

// 玩法二「小熊的手」：小熊手里拿着目前最小的那颗，一颗一颗看后面的。
// 孩子决定「换成新的」还是「留着」。答案由引擎判定，答错时更小的那颗透光。
// 一轮看完，手里的就是最小的，小熊把它放到最前面。这就是代码里的 minIdx。
const s = ref<HandState>(handInit(genCandies(HAND_N)));
const mistakes = ref(0);
const glow = ref<'l' | 'r' | null>(null);
const busy = ref(false);
const say = ref('🐻 小熊先拿起第一颗。👀 新的这颗，要换吗？');

const earned = computed(() => stars(mistakes.value));
const asking = computed(() => !s.value.done && !handRoundOver(s.value) && !busy.value);

function answer(c: HandChoice) {
  if (!asking.value) return;
  const n = handStep(s.value, c);
  if (!n) {
    mistakes.value++;
    glow.value = null;
    requestAnimationFrame(() => (glow.value = handNeed(s.value) === 'take' ? 'r' : 'l'));
    say.value = '🤔 小熊只要小的，哪颗更小？';
    return;
  }
  glow.value = null;
  s.value = n;
  if (handRoundOver(n)) {
    busy.value = true;
    say.value = '👐 看完啦！手里的就是最小的';
    setTimeout(() => {
      s.value = handPlace(s.value);
      say.value = s.value.done ? '🎉 排好啦！最后一颗不用挑' : '🔄 放到最前面。下一轮，再拿起第一颗';
      setTimeout(() => {
        busy.value = false;
        if (!s.value.done) say.value = '👀 新的这颗，要换吗？';
      }, 1100);
    }, 1100);
  } else {
    say.value = c === 'take' ? '🔄 换成小的啦。👀 下一颗呢？' : '✋ 留着。👀 下一颗呢？';
  }
}

function again() {
  s.value = handInit(genCandies(HAND_N));
  mistakes.value = 0;
  glow.value = null;
  busy.value = false;
  say.value = '🐻 小熊先拿起第一颗。👀 新的这颗，要换吗？';
}
</script>

<template>
  <div class="game">
    <p class="say" aria-live="polite">{{ say }}</p>
    <Candies
      :values="s.a" :sorted="s.done ? s.a.length : s.i"
      :bear="s.done ? null : s.held" :eye="asking ? s.j : null"
    />
    <div v-if="asking" class="duel">
      <CandyPair :left="s.a[s.held]" :right="s.a[s.j]" left-tag="🐻" right-tag="👀" :glow="glow" />
      <div class="answers">
        <button type="button" class="pad" aria-label="换成新的" @click="answer('take')">🔄</button>
        <button type="button" class="pad" aria-label="留着手里的" @click="answer('keep')">✋</button>
      </div>
    </div>
    <div v-if="s.done" class="result">
      <p class="stars" :aria-label="earned + ' 颗星'">
        <span v-for="k in 3" :key="k" :class="{ dim: k > earned }">⭐</span>
      </p>
      <p>小熊比了 {{ s.compares }} 次，每一轮手里最后拿着的，都是剩下里面最小的。</p>
      <div class="row">
        <button type="button" class="btn primary" @click="again">🔁 再来一排</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game { display: flex; flex-direction: column; gap: 16px; }
.say { font-size: clamp(1.3rem, 5vw, 1.9rem); min-height: 2.6em; }
.duel { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; }
.answers { display: flex; flex-direction: column; gap: 12px; }
.pad {
  font: inherit; font-size: clamp(1.8rem, 8vw, 2.4rem); cursor: pointer; width: 2.4em; height: 1.9em;
  border-radius: 16px; border: 1.5px solid var(--line); background: var(--surface);
}
.pad:hover { border-color: var(--accent); }
.pad:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
.stars { font-size: 2.4rem; line-height: 1; }
.stars .dim { filter: grayscale(1); opacity: 0.3; }
</style>
