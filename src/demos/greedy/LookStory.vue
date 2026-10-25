<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { KID_COINS, LOOK_AMOUNT, ODD, bestPicks, cashierTrace, desc } from '../../engine/greedy';
import { STAGE_CHANGE_EVENT } from '../../components/shared/usePlayer';
import Shop from './Shop.vue';

// 看：会动的绘本。画面全部由 cashierTrace 生成，和真实的贪心过程一致。
interface Frame {
  say: string;
  coins: number[];
  left: number;
  plate: number[];
  focus: number | null;
  dim: number[];
  compare: number[] | null;
}

/** 一段找零过程的画面：每看一枚硬币一页 */
function play(coins: number[], amount: number): Frame[] {
  const out: Frame[] = [];
  let plate: number[] = [];
  let dim: number[] = [];
  for (const m of cashierTrace(coins, amount)) {
    if (m.action === 'skip') {
      dim = [...dim, m.coin];
      out.push({ say: m.coin + ' 比 ' + m.left + ' 大，找多啦 🙅', coins, left: m.left, plate, focus: m.coin, dim, compare: null });
    } else {
      plate = [...plate, m.coin];
      const left = m.left - m.coin;
      out.push({ say: '拿 ' + m.coin + '！' + (left ? '还要找 ' + left : '找完啦'), coins, left, plate, focus: m.coin, dim, compare: null });
    }
  }
  return out;
}

const frames = computed<Frame[]>(() => {
  const kid = desc(KID_COINS);
  const odd = desc(ODD.coins);
  const a = play(kid, LOOK_AMOUNT);
  const b = play(odd, ODD.amount);
  const lastA = a[a.length - 1];
  const lastB = b[b.length - 1];
  const best = bestPicks(odd, ODD.amount)!;
  return [
    { say: '🐰 买了蜂蜜，小熊要找她 ' + LOOK_AMOUNT, coins: kid, left: LOOK_AMOUNT, plate: [], focus: null, dim: [], compare: null },
    { say: '小熊的秘诀：每次拿最大的、不超过剩下的 🪙', coins: kid, left: LOOK_AMOUNT, plate: [], focus: kid[0], dim: [], compare: null },
    ...a,
    { ...lastA, say: '只用了 ' + lastA.plate.length + ' 枚，最少！🎉', focus: null, dim: [] },
    { say: '咦？换一盒奇怪的硬币，找 ' + ODD.amount, coins: odd, left: ODD.amount, plate: [], focus: null, dim: [], compare: null },
    ...b,
    { ...lastB, say: '贪心用了 ' + lastB.plate.length + ' 枚……', focus: null, dim: [] },
    { ...lastB, say: best.join(' + ') + ' 只要 ' + best.length + ' 枚！😮', focus: null, dim: [], compare: best },
    { ...lastB, say: '眼前最大的，不一定最少 🤔', focus: null, dim: [], compare: best },
  ];
});

const k = ref(0);
const f = computed(() => frames.value[Math.min(k.value, frames.value.length - 1)]);
const last = computed(() => k.value >= frames.value.length - 1);

const timer = ref<ReturnType<typeof setInterval> | null>(null);
function stop() {
  if (timer.value) clearInterval(timer.value);
  timer.value = null;
}
function play2() {
  if (timer.value) return stop();
  if (last.value) k.value = 0;
  timer.value = setInterval(() => (last.value ? stop() : k.value++), 2200);
}
function next() { stop(); if (!last.value) k.value++; }
function prev() { stop(); if (k.value > 0) k.value--; }
function again() { stop(); k.value = 0; }

onMounted(() => window.addEventListener(STAGE_CHANGE_EVENT, stop));
onBeforeUnmount(() => { stop(); window.removeEventListener(STAGE_CHANGE_EVENT, stop); });
</script>

<template>
  <div class="book">
    <p class="say" aria-live="polite">{{ f.say }}</p>
    <Shop
      :coins="f.coins" :left="f.left" :plate="f.plate" :focus="f.focus" :dim="f.dim"
      :compare="f.compare" compare-icon="✨"
    />
    <div class="dots" aria-hidden="true">
      <span v-for="(_, i) in frames" :key="i" :class="{ on: i === k }" />
    </div>
    <div class="nav">
      <button type="button" class="big-btn" :disabled="k === 0" aria-label="上一页" @click="prev">◀</button>
      <button type="button" class="big-btn main" :aria-label="timer ? '暂停' : '自动播放'" @click="play2">{{ timer ? '⏸' : '▶️' }}</button>
      <button type="button" class="big-btn" :disabled="last" aria-label="下一页" @click="next">▶</button>
    </div>
    <div v-if="last" class="row">
      <button type="button" class="btn" @click="again">🔁 从头再看</button>
      <button type="button" class="btn primary" data-goto="play">🎮 去玩</button>
    </div>
  </div>
</template>

<style scoped>
.book { display: flex; flex-direction: column; gap: 16px; align-items: flex-start; }
.say { font-size: clamp(1.3rem, 5vw, 1.9rem); min-height: 2.6em; }
.dots { display: flex; flex-wrap: wrap; gap: 6px; }
.dots span { width: 8px; height: 8px; border-radius: 50%; background: var(--line); }
.dots span.on { background: var(--accent); }
.nav { display: flex; gap: 12px; }
.big-btn {
  font: inherit; font-size: 1.4rem; width: 3.2em; height: 2.4em; cursor: pointer;
  border-radius: 14px; border: 1.5px solid var(--line); background: var(--surface); color: var(--fg);
}
.big-btn.main { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
.big-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.big-btn:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
</style>
