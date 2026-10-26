<script setup lang="ts">
import { computed, ref } from 'vue';
import { BOOK_EMOJI, EVICT_BOOKS, EVICT_SEQ, KID_CAP, judgeEvict, playStars, simulate } from '../../engine/lru-cache';
import { play } from '../../components/shared/sound';
import Desk from './Desk.vue';

// 玩法一「当管理员」：按借书顺序，孩子自己把书拿上桌、翻一翻、满了挑一本放回书架。
// 引导：要点的书一闪一闪；点错了那本晃一下，桌上最久没碰的那本透光（带蜘蛛网）；
// 点错一次以后才出现「最久没碰 ←→ 刚碰过」的刻度，让孩子自己发现「放回最左边」。
const acc = simulate(EVICT_SEQ, KID_CAP);

const i = ref(0);
const desk = ref<number[]>([]);
const phase = ref<'fetch' | 'evict' | 'done'>('fetch');
const mistakes = ref(0);
const evicted = ref(0);
const glow = ref<number | null>(null);
const shake = ref<[number, number] | null>(null);
const say = ref('');

const cur = computed(() => acc[Math.min(i.value, acc.length - 1)]);
const needEvict = computed(() => cur.value.evicted !== null);
const ruler = computed(() => mistakes.value > 0 || evicted.value >= 2);
const stars = computed(() => playStars(mistakes.value));
const em = (b: number) => BOOK_EMOJI[b] + b + ' 号';

function ask() {
  const a = cur.value;
  glow.value = null;
  if (a.hit) {
    phase.value = 'fetch';
    say.value = '要 ' + em(a.book) + '：桌上就有！点它 👆';
  } else if (a.evicted !== null) {
    phase.value = 'evict';
    say.value = '要 ' + em(a.book) + '，桌子满了！放回书架哪一本？🤔';
  } else {
    phase.value = 'fetch';
    say.value = '要 ' + em(a.book) + '：去书架拿，点它 👆';
  }
}
ask();

function advance(prefix = '') {
  desk.value = cur.value.desk;
  play(i.value >= acc.length - 1 ? 'win' : 'right');
  if (i.value >= acc.length - 1) {
    phase.value = 'done';
    glow.value = null;
    say.value = prefix + '🎉 借完啦！';
    return;
  }
  i.value++;
  ask();
  say.value = prefix + say.value;
}

function wiggle(b: number) {
  play('wrong');
  shake.value = [b, (shake.value?.[1] ?? 0) + 1];
}

function pick(b: number, where: 'desk' | 'shelf') {
  const a = cur.value;
  if (phase.value === 'fetch') {
    if (a.hit && where === 'desk' && b === a.book) return advance('✅ ' + em(a.book) + '翻了一下，挪到最右边。');
    if (!a.hit && where === 'shelf' && b === a.book) return advance('✅ ' + em(a.book) + '从书架拿上了桌，放在最右边。');
    wiggle(b);
    say.value = '要的是 ' + em(a.book) + ' 哦，看看一闪一闪的那本 ✨';
  } else if (phase.value === 'evict' && where === 'desk') {
    const v = judgeEvict(desk.value, b);
    if (v === 'right') {
      evicted.value++;
      advance('放回' + em(a.evicted!) + ' ✅ 它最久没碰！' + em(a.book) + '坐到最右边。');
    } else {
      mistakes.value++;
      wiggle(b);
      glow.value = desk.value[0];
      say.value = v === 'just-touched' ? '它刚被翻过呀！看，发光的那本好久没被翻过啦 🕸️' : '再看看，发光的那本好久没被翻过啦 🕸️';
    }
  }
}

function again() {
  i.value = 0;
  desk.value = [];
  mistakes.value = 0;
  evicted.value = 0;
  shake.value = null;
  ask();
}
</script>

<template>
  <div class="game">
    <p class="small-note">目标：按顺序借书；桌子放不下时，把最久没碰（桌上最左边）的那本放回书架。</p>
    <p class="say" aria-live="polite">{{ say }}</p>
    <Desk
      :cap="KID_CAP" :desk="desk" :books="EVICT_BOOKS"
      :pulse="phase === 'fetch' ? cur.book : null" :glow="glow" :shake="shake" :ruler="ruler"
      :desk-clickable="phase !== 'done'" :shelf-clickable="phase === 'fetch' && !cur.hit"
      @pick="pick"
    />
    <p class="progress" aria-label="借书进度">
      <span v-for="(a, k) in acc" :key="k" :class="{ done: k < i || phase === 'done', now: k === i && phase !== 'done' }">{{ BOOK_EMOJI[a.book] }}</span>
    </p>

    <div v-if="phase === 'done'" class="result">
      <p class="stars" :aria-label="stars + ' 颗星'">
        <span v-for="s in 3" :key="s" :class="{ dim: s > stars }">⭐</span>
      </p>
      <p class="q">🏅 每次都放回「最久没碰」的那本，这就是 LRU！</p>
      <p v-if="stars < 3" class="small-note">再来一局，争取一次都不点错。</p>
      <div class="row">
        <button type="button" class="btn primary" @click="again">🔁 再来一局</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
.say { font-size: clamp(1.2rem, 4.6vw, 1.7rem); min-height: 2.8em; }
.progress { display: flex; flex-wrap: wrap; gap: 4px; font-size: 1.1rem; }
.progress span { opacity: 0.3; filter: grayscale(1); }
.progress span.done { opacity: 1; filter: none; }
.progress span.now { opacity: 1; filter: none; outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 4px; }
.result { display: flex; flex-direction: column; gap: 12px; }
.stars { font-size: 2.4rem; line-height: 1; }
.stars .dim { filter: grayscale(1); opacity: 0.3; }
.q { font-size: 1.2rem; max-width: 30em; }
</style>
