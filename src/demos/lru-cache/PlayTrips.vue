<script setup lang="ts">
import { computed, ref } from 'vue';
import { BOOK_EMOJI, TRIP_BIG_CAP, TRIP_BOOKS, TRIP_CAP, TRIP_SEQ, simulate } from '../../engine/lru-cache';
import Desk from './Desk.vue';

// 玩法二「猜猜去几趟书架」：每借一本，先猜桌上有没有，猜对了才继续，一路数跑了几趟书架。
// 猜错不扣分：被猜错的按钮晃一下；书其实在桌上时它会一闪一闪；其实不在时提醒再数数桌上的书。
// 最后换一张大书桌再来一遍，比一比哪次跑得少。
const cap = ref(TRIP_CAP);
const acc = computed(() => simulate(TRIP_SEQ, cap.value));

const i = ref(0);
const desk = ref<number[]>([]);
const count = ref(0);
const pulse = ref<number | null>(null);
const shaky = ref<'hit' | 'miss' | null>(null);
const tick = ref(0);
const say = ref('');
const done = computed(() => i.value >= acc.value.length);
const small = ref<number | null>(null);

const cur = computed(() => acc.value[Math.min(i.value, acc.value.length - 1)]);
const em = (b: number) => BOOK_EMOJI[b] + b + ' 号';

function start(c: number) {
  cap.value = c;
  i.value = 0;
  desk.value = [];
  count.value = 0;
  pulse.value = null;
  say.value = '要 ' + em(TRIP_SEQ[0]) + '。桌上有吗？';
}
start(TRIP_CAP);

function guess(g: 'hit' | 'miss') {
  if (done.value) return;
  const a = cur.value;
  if ((g === 'hit') === a.hit) {
    shaky.value = null;
    pulse.value = null;
    if (!a.hit) count.value++;
    desk.value = a.desk;
    i.value++;
    if (done.value) {
      say.value = '🎉 借完啦！';
      if (cap.value === TRIP_CAP) small.value = count.value;
    } else {
      say.value = '对！' + em(a.book) + (a.hit ? '桌上有 🙌' : '桌上没有，去了一趟书架 🚶') + ' 下一本：' + em(TRIP_SEQ[i.value]) + '，桌上有吗？';
    }
  } else {
    shaky.value = g;
    tick.value++;
    if (a.hit) {
      pulse.value = a.book;
      say.value = '再看看桌上，有一本一闪一闪 ✨';
    } else {
      pulse.value = null;
      say.value = '桌上的书挨个看看，有 ' + em(a.book) + '吗？🧐';
    }
  }
}

const saved = computed(() => (small.value === null ? 0 : small.value - count.value));
</script>

<template>
  <div class="game">
    <p class="small-note">目标：每借一本书，先猜它在不在桌上，一路数一共要跑几趟书架。</p>
    <p class="say" aria-live="polite">{{ say }}</p>
    <div class="queue" aria-label="要借的书">
      <span v-for="(b, k) in TRIP_SEQ" :key="k" :class="{ done: k < i, now: k === i }">{{ BOOK_EMOJI[b] }}</span>
    </div>
    <Desk :cap="cap" :desk="desk" :books="TRIP_BOOKS" :pulse="pulse" :ruler="false" />
    <p class="trips" :aria-label="'已经跑了 ' + count + ' 趟书架'">
      <span v-for="t in count" :key="t">🚶</span>
      <small v-if="!count">还没去过书架</small>
    </p>

    <div v-if="!done" class="answers">
      <button
        :key="'h' + tick" type="button" class="btn big-btn" :class="{ wiggle: shaky === 'hit' }"
        aria-label="桌上有这本书" @click="guess('hit')"
      >🙌 桌上有</button>
      <button
        :key="'m' + tick" type="button" class="btn big-btn" :class="{ wiggle: shaky === 'miss' }"
        aria-label="桌上没有，要去书架" @click="guess('miss')"
      >🚶 去书架</button>
    </div>

    <div v-else class="result">
      <p class="q">一共跑了 <b>{{ count }}</b> 趟书架 🚶<span v-if="cap !== TRIP_CAP && small !== null">，比小书桌少了 {{ saved }} 趟！</span></p>
      <p v-if="cap === TRIP_CAP" class="small-note">要是书桌大一点呢？放得下 {{ TRIP_BIG_CAP }} 本，再借一遍同样的书，会少跑几趟？</p>
      <p v-else class="small-note">桌子越大，越少跑书架。但桌子不能无限大，所以才要想「满了放回谁」。</p>
      <div class="row">
        <button v-if="cap === TRIP_CAP" type="button" class="btn primary" @click="start(TRIP_BIG_CAP)">🪑 换张大书桌再借一遍</button>
        <button type="button" class="btn" :class="{ primary: cap !== TRIP_CAP }" @click="start(TRIP_CAP)">🔁 小书桌再玩一遍</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
.say { font-size: clamp(1.2rem, 4.6vw, 1.7rem); min-height: 2.8em; }
.queue { display: flex; flex-wrap: wrap; gap: 4px; font-size: 1.3rem; }
.queue span { opacity: 0.35; filter: grayscale(1); }
.queue span.done { opacity: 1; filter: none; }
.queue span.now { opacity: 1; filter: none; outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 6px; }
.trips { min-height: 1.8em; font-size: 1.2rem; display: flex; flex-wrap: wrap; gap: 2px; align-items: center; }
.trips small { font-size: 13px; color: var(--muted); }
.big-btn { font-size: 1.15rem; padding: 14px 16px; }
.big-btn.wiggle { animation: wiggle 0.5s; border-color: var(--warn); }
.result { display: flex; flex-direction: column; gap: 12px; }
.q { font-size: 1.2rem; max-width: 30em; }
@keyframes wiggle { 20% { transform: translateX(-7px); } 40% { transform: translateX(7px); } 60% { transform: translateX(-5px); } 80% { transform: translateX(5px); } }
@media (prefers-reduced-motion: reduce) { .big-btn.wiggle { animation: none; } }
</style>
