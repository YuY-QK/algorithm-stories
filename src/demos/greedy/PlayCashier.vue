<script setup lang="ts">
import { computed, ref } from 'vue';
import { KID_COINS, canTake, cashierAmount, cashierStars, desc, greedyNext, minCoins } from '../../engine/greedy';
import { play } from '../../components/shared/sound';
import Shop from './Shop.vue';

// 玩法一「当收银员」：孩子一枚一枚点硬币放进找零盘。金额一开始就定好。
// 引导：太大的硬币弹回、摇头；凑齐后数枚数，比最少的多就问「能更少吗？」，
// 同一个金额再找时，最大能拿的那枚一闪一闪；第一次拿到三颗星后问「每次先拿哪个？」。
const COINS = desc(KID_COINS);
const CUSTOMERS = ['🐰', '🦊', '🐼', '🐱', '🐸', '🦉'];

const amount = ref(cashierAmount());
const customer = ref(CUSTOMERS[0]);
const plate = ref<number[]>([]);
const left = computed(() => amount.value - plate.value.reduce((s, x) => s + x, 0));
const done = computed(() => left.value === 0);
const shake = ref<[number, number] | null>(null);
const say = ref('');
const tries = ref(0);
const asked = ref(false);
const quiz = ref<'ask' | 'right' | 'wrong' | null>(null);

const best = computed(() => minCoins(COINS, amount.value));
const earned = computed(() => cashierStars(plate.value.length, best.value));
/** 同一个金额第二次找时给提示：最大能拿的那枚一闪一闪 */
const pulse = computed(() => (tries.value >= 1 && !done.value ? greedyNext(COINS, left.value) : null));

function greet() {
  say.value = customer.value + ' 要找 ' + amount.value + '，点硬币放进盘子 🪙';
}
greet();

function tap(c: number) {
  if (done.value) return;
  if (!canTake(left.value, c)) {
    shake.value = [c, (shake.value?.[1] ?? 0) + 1];
    play('wrong');
    say.value = '🙅 ' + c + ' 比还要找的 ' + left.value + ' 大，放进去就找多了，换小一点的';
    return;
  }
  plate.value = [...plate.value, c];
  if (left.value === 0) finish();
  else {
    play('right');
    say.value = '放进 ' + c + '，还要找 ' + left.value;
  }
}

function undo() {
  if (done.value || !plate.value.length) return;
  const back = plate.value[plate.value.length - 1];
  plate.value = plate.value.slice(0, -1);
  say.value = '把 ' + back + ' 拿回钱盒，还要找 ' + left.value;
}

function finish() {
  const n = plate.value.length;
  play('win');
  if (n <= best.value) {
    say.value = '🎉 找好啦！' + n + ' 枚，最少！';
    if (!asked.value) {
      asked.value = true;
      quiz.value = 'ask';
    }
  } else {
    say.value = '找好啦，' + n + ' 枚。能更少吗？🤔';
  }
}

function answerQuiz(r: 'right' | 'wrong') {
  play(r);
  quiz.value = r;
}

function retry() {
  tries.value++;
  plate.value = [];
  say.value = '💡 再找一次 ' + amount.value + '，先看一闪一闪的那枚';
}

function nextCustomer() {
  let a = amount.value;
  while (a === amount.value) a = cashierAmount();
  amount.value = a;
  customer.value = CUSTOMERS[(CUSTOMERS.indexOf(customer.value) + 1) % CUSTOMERS.length];
  plate.value = [];
  tries.value = 0;
  if (quiz.value !== 'ask') quiz.value = null;
  greet();
}
</script>

<template>
  <div class="game">
    <p class="small-note">目标：把客人要找的钱凑够，用的硬币越少越好。点钱盒里的硬币，放进找零盘。</p>
    <p class="say" aria-live="polite">{{ say }}</p>
    <Shop
      :coins="COINS" :left="left" :plate="plate" who="🐻"
      :pulse="pulse" :shake="shake" :clickable="!done" @pick="tap"
    />
    <div v-if="!done" class="row">
      <button type="button" class="btn small" :disabled="!plate.length" aria-label="拿回最后一枚" @click="undo">↩️ 拿回一枚</button>
    </div>

    <div v-if="done" class="result">
      <p class="stars" :aria-label="earned + ' 颗星'">
        <span v-for="s in 3" :key="s" :class="{ dim: s > earned }">⭐</span>
      </p>

      <div v-if="quiz === 'ask'" class="quiz">
        <p class="q">🤔 每次先拿哪一枚？</p>
        <div class="choices">
          <button type="button" class="choice" aria-label="最小的" @click="answerQuiz('wrong')"><span class="mini"><b class="s" /><i /><i /></span>最小的</button>
          <button type="button" class="choice" aria-label="随便哪个" @click="answerQuiz('wrong')"><span class="mini"><i /><b class="m" /><i /></span>随便哪个</button>
          <button type="button" class="choice" aria-label="能拿的最大的" @click="answerQuiz('right')"><span class="mini"><i /><i /><b class="l" /></span>能拿的最大的</button>
        </div>
      </div>
      <p v-else-if="quiz === 'right'" class="q">🏅 对啦！每次都拿能拿的最大的，这就是「贪心」。</p>
      <p v-else-if="quiz === 'wrong'" class="q">🤔 下一位客人，试试每次都那样拿，数数要几枚？</p>

      <div class="row">
        <button v-if="plate.length > best" type="button" class="btn primary" @click="retry">🔁 再找一次</button>
        <button type="button" class="btn" :class="{ primary: plate.length <= best }" @click="nextCustomer">👋 下一位客人</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game { display: flex; flex-direction: column; gap: 16px; }
.say { font-size: clamp(1.3rem, 5vw, 1.9rem); min-height: 2.6em; }
.result { display: flex; flex-direction: column; gap: 14px; }
.stars { font-size: 2.4rem; line-height: 1; }
.stars .dim { filter: grayscale(1); opacity: 0.3; }
.quiz { display: flex; flex-direction: column; gap: 10px; }
.q { font-size: 1.2rem; max-width: 30em; }
.choices { display: flex; flex-wrap: wrap; gap: 10px; }
.choice {
  font: inherit; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 10px 14px; border-radius: 12px; border: 1.5px solid var(--line); background: var(--surface); color: var(--fg);
}
.choice:hover { border-color: var(--accent); }
.choice:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
.mini { display: flex; gap: 4px; align-items: center; height: 26px; }
.mini i, .mini b { border-radius: 50%; border: 1.5px solid var(--line); width: 14px; height: 14px; }
.mini b { background: var(--mid); border-color: var(--mid-ink); }
.mini .s { width: 12px; height: 12px; }
.mini .m { width: 18px; height: 18px; }
.mini .l { width: 24px; height: 24px; }
</style>
