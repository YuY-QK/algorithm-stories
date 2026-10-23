<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { bubbleRounds, randomKids, stars, type Kid } from '../../engine/bubble-sort';
import Lineup from './Lineup.vue';

// 玩法二「谁会冒到最右边」：每一轮开始前，孩子先猜这一轮谁会站到最右边（还没站好的部分），
// 猜对了摄影师才走这一轮，看猜的那个一路冒过去。队伍和答案一开始就算好了，改不了。
// 点错的会摇一摇；同一轮第二次还点错，答案透一点光。学到的是「这一轮最高的那个一定冒到最右边」。
const kids = ref<Kid[]>(randomKids());
const rounds = computed(() => bubbleRounds(kids.value, (k) => k.h));

const r = ref(0);
const line = ref<Kid[]>(kids.value.slice());
const fixedFrom = ref(kids.value.length);
const pair = ref<number | null>(null);
const phase = ref<'ask' | 'run' | 'done'>('ask');
const mistakes = ref(0);
const roundMiss = ref(0);
const glow = ref<string | null>(null);
const shake = ref<[string, number] | null>(null);
const say = ref('');
let timer: ReturnType<typeof setTimeout> | null = null;

const cur = computed(() => rounds.value[r.value]);
const earned = computed(() => stars(mistakes.value));

function ask() {
  phase.value = 'ask';
  roundMiss.value = 0;
  glow.value = null;
  say.value = r.value === 0 ? '🤔 摄影师走完一轮，谁会站到最右边？点他' : '🤔 这一轮，谁会站到 ⭐ 的左边？点他';
}
ask();

function tap(k: number, kid: Kid) {
  if (phase.value !== 'ask') return;
  if (k >= fixedFrom.value) {
    shake.value = [kid.id, (shake.value?.[1] ?? 0) + 1];
    say.value = '⭐ 他已经站好啦，看看还没站好的';
    return;
  }
  if (kid.id !== cur.value.top.id) {
    mistakes.value++;
    roundMiss.value++;
    shake.value = [kid.id, (shake.value?.[1] ?? 0) + 1];
    if (roundMiss.value >= 2) {
      glow.value = null;
      requestAnimationFrame(() => (glow.value = cur.value.top.id));
    }
    say.value = '🤔 摄影师总把高的往右换……谁最高？';
    return;
  }
  glow.value = null;
  say.value = '👀 看看是不是 ' + kid.face + '……';
  run();
}

function run() {
  phase.value = 'run';
  const rd = cur.value;
  let c = 0;
  const tick = () => {
    if (c < rd.compares.length) {
      pair.value = rd.compares[c].j;
      line.value = rd.compares[c].after;
      c++;
      timer = setTimeout(tick, 700);
      return;
    }
    pair.value = null;
    if (rd.quiet || rd.end <= 1) {
      fixedFrom.value = 0;
      phase.value = 'done';
      say.value = rd.quiet ? '🤫 这一轮谁也没换 📸 咔嚓！排好啦 🎉' : '📸 咔嚓！排好啦 🎉';
      return;
    }
    fixedFrom.value = rd.end;
    say.value = '🎉 对啦！' + rd.top.face + ' 冒到这里了 ⭐';
    timer = setTimeout(() => {
      r.value++;
      ask();
    }, 1500);
  };
  timer = setTimeout(tick, 500);
}

function again() {
  if (timer) clearTimeout(timer);
  kids.value = randomKids();
  r.value = 0;
  line.value = kids.value.slice();
  fixedFrom.value = kids.value.length;
  pair.value = null;
  mistakes.value = 0;
  ask();
}

onBeforeUnmount(() => { if (timer) clearTimeout(timer); });
</script>

<template>
  <div class="game">
    <p class="say" aria-live="polite">{{ say }}</p>
    <Lineup
      :line="line" :pair="pair" :fixed-from="fixedFrom" :glow="glow" :shake="shake"
      :clickable="phase === 'ask'" :photo="phase === 'done'" @pick="tap"
    />
    <div v-if="phase === 'done'" class="win">
      <p class="stars" :aria-label="earned + ' 颗星'">
        <span v-for="k in 3" :key="k" :class="{ dim: k > earned }">⭐</span>
      </p>
      <p class="q">🏅 每一轮，最高的那个都会一路冒到最右边！</p>
      <div class="row">
        <button type="button" class="btn primary" @click="again">🔁 再来一局</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game { display: flex; flex-direction: column; gap: 14px; }
.say { font-size: clamp(1.3rem, 5vw, 1.9rem); min-height: 2.6em; }
.win { display: flex; flex-direction: column; gap: 10px; }
.stars { font-size: 2.4rem; line-height: 1; }
.stars .dim { filter: grayscale(1); opacity: 0.3; }
.q { font-size: 1.15rem; }
</style>
