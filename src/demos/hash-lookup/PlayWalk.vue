<script setup lang="ts">
import { computed, ref } from 'vue';
import { KID_CAP, PLAY_BOOKS, bucketOf, emptyChains, playBooks, restText, walkHops } from '../../engine/hash-lookup';
import { FILL_STEP, FLASH_MS } from '../../components/shared/timing';
import { play } from '../../components/shared/sound';
import { useStageStop } from '../../components/shared/usePlayer';
import Shelves from './Shelves.vue';

// 玩法一「直接走到书架」：书上有大数字书号，孩子点书架放书。
// 引导：点错会晃一下；点「数给我看」管理员从 0 号架一格格数；点错两次自动数给你看；
// 后半段换成「余数」按钮（转了几圈、还剩几格）。答案固定：书号除以 7 的余数。
const BIG_FROM = 3; // 第几本起换成「余数」按钮
let books = [...PLAY_BOOKS];
const r = ref(0);
const piles = ref(emptyChains(KID_CAP));
const keeper = ref<number | null>(null);
const count = ref(0);
const glow = ref<number | null>(null);
const shake = ref<[number, number] | null>(null);
const wrong = ref(0);
const placed = ref(false);
const walking = ref(false);
const say = ref('');
const finished = ref(false);

let timer: ReturnType<typeof setInterval> | null = null;
let glowTimer: ReturnType<typeof setTimeout> | null = null;
function stopAll() {
  if (timer) clearInterval(timer);
  if (glowTimer) clearTimeout(glowTimer);
  timer = glowTimer = null;
  walking.value = false;
  glow.value = null;
}
useStageStop(stopAll);

const book = computed(() => books[r.value]);
const useRest = computed(() => r.value >= BIG_FROM);

function begin() {
  stopAll();
  piles.value = emptyChains(KID_CAP);
  keeper.value = null;
  count.value = 0;
  wrong.value = 0;
  placed.value = false;
  say.value = '📕 ' + book.value + ' 号书。它该放在哪个书架？点一个书架。';
}
begin();

function walk() {
  stopAll();
  const hops = walkHops(book.value);
  let k = 0;
  walking.value = true;
  keeper.value = 0;
  count.value = 0;
  say.value = '🚶 从 0 号架出发，一格一格数 ' + book.value + ' 下，数过 6 号就回到 0 号';
  timer = setInterval(() => {
    keeper.value = hops[k];
    count.value = k + 1;
    k++;
    if (k >= hops.length) {
      stopAll();
      keeper.value = hops[hops.length - 1];
      glow.value = keeper.value;
      say.value = '数到 ' + book.value + ' 下，停在 ' + keeper.value + ' 号架 👆 点它';
      glowTimer = setTimeout(() => (glow.value = null), FLASH_MS);
    }
  }, FILL_STEP);
}

function rest() {
  stopAll();
  const b = bucketOf(book.value);
  keeper.value = null;
  glow.value = b;
  say.value = '🎯 ' + restText(book.value) + '。点亮着的书架';
  glowTimer = setTimeout(() => (glow.value = null), FLASH_MS);
}

function tap(i: number) {
  if (placed.value || walking.value) return;
  if (i === bucketOf(book.value)) {
    stopAll();
    play('right');
    piles.value = piles.value.map((c, k) => (k === i ? [book.value] : []));
    keeper.value = i;
    placed.value = true;
    say.value = '👍 ' + book.value + ' 号书放进 ' + i + ' 号架';
  } else {
    play('wrong');
    wrong.value++;
    shake.value = [i, wrong.value];
    if (wrong.value >= 2) {
      say.value = '🤔 让我数给你看';
      walk();
    } else {
      say.value = '🤔 再数数看。' + (useRest.value ? '点「余数」按钮看看' : '点「数给我看」试试');
    }
  }
}

function next() {
  if (r.value >= books.length - 1) {
    finished.value = true;
    play('win');
    stopAll();
    keeper.value = null;
    piles.value = emptyChains(KID_CAP);
    return;
  }
  r.value++;
  begin();
}

function again() {
  books = playBooks();
  r.value = 0;
  finished.value = false;
  begin();
}
</script>

<template>
  <div class="game">
    <p class="small-note">目标：每本书上有一个书号。想一想它该放在几号书架，点那个书架。数一数就知道了。</p>
    <template v-if="!finished">
      <div class="top">
        <span class="held" aria-label="手里的书">📕 {{ book }}</span>
        <span v-if="count" class="chip"><small>数到</small>{{ count }}</span>
        <span class="chip"><small>第</small>{{ r + 1 }} / {{ books.length }}</span>
      </div>
      <p class="say" aria-live="polite">{{ say }}</p>
      <Shelves :piles="piles" :keeper="keeper" :glow="glow" :shake="shake" :clickable="!placed && !walking" @pick="tap" />
      <div class="row">
        <button v-if="!placed && !useRest" type="button" class="btn" :disabled="walking" @click="walk">🐾 数给我看</button>
        <button v-if="!placed && useRest" type="button" class="btn" :disabled="walking" @click="rest">🎯 余数</button>
        <button v-if="!placed && useRest && wrong >= 1" type="button" class="btn" :disabled="walking" @click="walk">🐾 数给我看</button>
        <button v-if="placed" type="button" class="btn primary" @click="next">{{ r >= books.length - 1 ? '🏅 完成' : '下一本 ▶' }}</button>
      </div>
    </template>
    <div v-else class="result">
      <h3>🏅 六本书都放对了！</h3>
      <p>你发现了吗？书号是几，就决定了放哪个书架。书号除以 7，数一圈剩下几格，就是书架号。</p>
      <button type="button" class="btn" @click="again">🔁 再放六本</button>
    </div>
  </div>
</template>

<style scoped>
.game { display: flex; flex-direction: column; gap: 14px; }
.top { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.held { font: 700 1.6rem var(--mono); padding: 4px 14px; border-radius: 10px; border: 1.5px solid var(--line); background: var(--surface); }
.say { font-size: clamp(1.1rem, 4vw, 1.5rem); min-height: 2.8em; }
</style>
