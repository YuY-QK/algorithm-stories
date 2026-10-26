<script setup lang="ts">
import { computed, ref } from 'vue';
import { countChoices, dealHand, nextAction, stars, toCards } from '../../engine/insertion-sort';
import Hand from './Hand.vue';
import { play } from '../../components/shared/sound';

// 玩法二「挪一挪」：孩子自己当小熊，一张一张地挪。
// 只看空位左边那张：比新牌大就点它，它往右挪一格，罐子里多一枚硬币；不大就点空位，把新牌放下。
// 牌发好后就固定了。点错时那张牌晃一晃、正确的地方透光；最后数一数罐子里有几枚硬币，就是一共挪了几次。
const N = 5;
const values = ref<number[]>([]);
const cards = computed(() => toCards(values.value));
const slots = ref<(number | null)[]>([]);
const i = ref(1);
const hole = ref(1);
const coins = ref(0);
const mistakes = ref(0);
const phase = ref<'play' | 'count' | 'done'>('play');
const shake = ref<[number, number] | null>(null);
const glow = ref<number | null>(null);
const say = ref('');
const wrongChoice = ref<number | null>(null);
const coinPulse = ref(false);

const key = computed(() => values.value[i.value]);
const row = computed(() => slots.value.map((id) => (id === null ? 0 : values.value[id])));

function lift() {
  slots.value = slots.value.map((id, s) => (s === i.value ? null : id));
  hole.value = i.value;
  say.value = i.value === 1
    ? '🐻 摸到 ' + key.value + '。空位左边的牌比它大，就点它挪开 ➡️'
    : '🐻 摸到 ' + key.value;
}

function fresh() {
  values.value = dealHand(N);
  slots.value = values.value.map((_, id) => id);
  i.value = 1;
  coins.value = 0;
  mistakes.value = 0;
  phase.value = 'play';
  glow.value = null;
  wrongChoice.value = null;
  lift();
}
fresh();

function hint(id: number) {
  glow.value = null;
  requestAnimationFrame(() => (glow.value = id));
}
function wobble(id: number) {
  shake.value = [id, (shake.value?.[1] ?? 0) + 1];
}

function tapCard(id: number) {
  if (phase.value !== 'play') return;
  const s = slots.value.indexOf(id);
  if (s !== hole.value - 1) {
    play('wrong');
    wobble(id);
    hint(slots.value[hole.value - 1] ?? -1);
    say.value = hole.value === 0 ? '👀 左边没有牌了，点空位放下 ' + key.value + ' ⬇️' : '👀 先看紧挨着空位左边的那张，它和 ' + key.value + ' 比大小';
    return;
  }
  if (nextAction(row.value, hole.value, key.value) === 'drop') {
    mistakes.value++;
    play('wrong');
    wobble(id);
    hint(-1);
    say.value = '🤔 ' + values.value[id] + ' 比 ' + key.value + ' 小，不用挪，点空位把 ' + key.value + ' 放下';
    return;
  }
  const next = [...slots.value];
  next[hole.value] = id;
  next[hole.value - 1] = null;
  slots.value = next;
  hole.value--;
  coins.value++;
  play('right');
  glow.value = null;
  say.value = '🪙 ' + values.value[id] + ' 比 ' + key.value + ' 大，往右挪了一格。' + (hole.value === 0 ? '左边没有牌了，点空位放下 ' + key.value : '再看空位左边那张');
}

function tapHole() {
  if (phase.value !== 'play') return;
  if (nextAction(row.value, hole.value, key.value) === 'shift') {
    mistakes.value++;
    play('wrong');
    const left = slots.value[hole.value - 1]!;
    wobble(left);
    hint(left);
    say.value = '🤔 ' + values.value[left] + ' 比 ' + key.value + ' 大，要点它往右挪，给 ' + key.value + ' 让位';
    return;
  }
  const next = [...slots.value];
  next[hole.value] = i.value;
  slots.value = next;
  glow.value = null;
  play('right');
  if (i.value + 1 >= N) {
    phase.value = 'count';
    say.value = '🎉 理好啦！罐子里有几枚 🪙？';
    return;
  }
  i.value++;
  lift();
}

const choices = computed(() => countChoices(coins.value));
function answer(c: number) {
  if (phase.value !== 'count') return;
  if (c !== coins.value) {
    wrongChoice.value = null;
    requestAnimationFrame(() => (wrongChoice.value = c));
    coinPulse.value = false;
    play('wrong');
    requestAnimationFrame(() => (coinPulse.value = true));
    say.value = '🤔 一枚一枚数数看';
    return;
  }
  phase.value = 'done';
  play('win');
  say.value = '🏅 对啦！一共挪了 ' + coins.value + ' 次';
}

const earned = computed(() => stars(mistakes.value));
</script>

<template>
  <div class="game">
    <p class="small-note">目标：你来当小熊。新牌拿在手上，空位左边那张比它大，就点那张牌让它往右挪；不比它大，就点空位把新牌放下。全部理好后，数一数罐子里的硬币。</p>
    <p class="say" aria-live="polite">{{ say }}</p>
    <Hand
      :cards="cards" :slots="slots" :held="phase === 'play' ? i : null" :held-at="hole"
      :in-hand="phase === 'play' ? i + 1 : N" :shake="shake" :glow="glow"
      :pickable="phase === 'play'" @card="tapCard" @hole="tapHole"
    />
    <div class="jar" :class="{ pulse: coinPulse }" :aria-label="'罐子：' + coins + ' 枚硬币'">
      <span class="jar-icon" aria-hidden="true">🫙</span>
      <span v-for="c in coins" :key="c" class="coin" aria-hidden="true">🪙</span>
    </div>

    <div v-if="phase === 'count'" class="answers">
      <button
        v-for="c in choices"
        :key="c"
        type="button"
        class="pad"
        :class="{ nope: wrongChoice === c }"
        :aria-label="c + ' 枚'"
        @click="answer(c)"
      >{{ c }}</button>
    </div>

    <div v-if="phase === 'done'" class="result">
      <p class="stars" :aria-label="earned + ' 颗星'">
        <span v-for="s in 3" :key="s" :class="{ dim: s > earned }">⭐</span>
      </p>
      <p>🐻 牌越乱，挪得越多。猜猜下一局要挪几次？</p>
      <button type="button" class="btn primary" @click="fresh">🔁 再来一局</button>
    </div>
  </div>
</template>

<style scoped>
.game { display: flex; flex-direction: column; gap: 16px; }
.say { font-size: clamp(1.3rem, 5vw, 1.9rem); min-height: 2.6em; }
.jar {
  display: flex; flex-wrap: wrap; align-items: center; gap: 4px; min-height: 2.6rem;
  padding: 6px 12px; border-radius: 12px; border: 1.5px solid var(--line); background: var(--surface);
  font-size: 1.6rem; line-height: 1; align-self: flex-start; max-width: 100%; box-sizing: border-box;
}
.jar-icon { margin-right: 6px; }
.coin { animation: drop 0.4s ease-out; }
.jar.pulse .coin { animation: pop 0.5s ease-in-out 2; }
.pad {
  font: 700 clamp(1.6rem, 7vw, 2.2rem) var(--mono); cursor: pointer; flex: 0 1 3em; height: 1.9em;
  border-radius: 16px; border: 1.5px solid var(--line); background: var(--surface); color: var(--fg);
}
.pad:hover { border-color: var(--accent); }
.pad:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
.pad.nope { animation: shake 0.5s ease-in-out; opacity: 0.5; }
.stars { font-size: 2.4rem; line-height: 1; }
.stars .dim { filter: grayscale(1); opacity: 0.3; }

@keyframes drop {
  from { transform: translateY(-24px); opacity: 0; }
}
@keyframes pop {
  50% { transform: scale(1.3); }
}
@keyframes shake {
  20%, 60% { transform: translateX(-5px); }
  40%, 80% { transform: translateX(5px); }
}
@media (prefers-reduced-motion: reduce) {
  .coin, .jar.pulse .coin, .pad.nope { animation: none; }
}
</style>
