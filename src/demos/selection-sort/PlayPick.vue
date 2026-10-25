<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { KID_N, genCandies, minFrom, stars, swapAt } from '../../engine/selection-sort';
import Candies from './Candies.vue';
import CandyPair from './CandyPair.vue';
import { PAUSE_SHORT } from '../../components/shared/timing';
import { useStageStop } from '../../components/shared/usePlayer';

// 玩法一「挑最小的」：每一轮孩子从还没排好的糖果里点出最小的，小熊把它换到最前面。
// 点错了不说错：把点的那颗和真正最小的并排放大，让孩子自己比一比。
// 只剩一颗时问「还要挑吗」，让孩子自己发现最后一颗不用挑。
type Phase = 'pick' | 'compare' | 'moving' | 'last' | 'done';

const a = ref<number[]>(genCandies(KID_N));
const i = ref(0);
const phase = ref<Phase>('pick');
const mistakes = ref(0);
const shake = ref<[number, number] | null>(null);
const glow = ref<number | null>(null);
const pulse = ref<number | null>(null);
const bear = ref<number | null>(null);
/** 比一比：点错的那颗和真正最小的那颗（下标） */
const pair = ref<{ tapped: number; min: number; left: 'tapped' | 'min' } | null>(null);
const pairShake = ref<['l' | 'r', number] | null>(null);
const say = ref('👆 哪颗糖果最小？点它');

const earned = computed(() => stars(mistakes.value));
const rounds = computed(() => a.value.length - 1);

// 所有定时器都登记在这里，切换标签或卸载时一起清掉
const timers = new Set<ReturnType<typeof setTimeout>>();
function later(fn: () => void, ms: number) {
  const t = setTimeout(() => {
    timers.delete(t);
    fn();
  }, ms);
  timers.add(t);
}
function clearTimers() {
  timers.forEach(clearTimeout);
  timers.clear();
}

function wiggle(k: number) {
  shake.value = [k, (shake.value?.[1] ?? 0) + 1];
}

function tap(k: number) {
  if (phase.value === 'last') {
    wiggle(k);
    return;
  }
  if (phase.value !== 'pick') return;
  if (k < i.value) {
    wiggle(k);
    say.value = '🍽️ 盘子上的已经排好啦，看后面的';
    return;
  }
  const m = minFrom(a.value, i.value);
  if (k !== m) {
    mistakes.value++;
    pulse.value = null;
    // 并排时按在队伍里的先后放，不让位置泄露答案
    pair.value = { tapped: k, min: m, left: k < m ? 'tapped' : 'min' };
    phase.value = 'compare';
    say.value = '🤔 比一比，哪颗更小？';
    return;
  }
  pulse.value = null;
  phase.value = 'moving';
  bear.value = k;
  glow.value = k;
  say.value = k === i.value ? '👍 ' + a.value[k] + ' 号最小，已经在最前面啦，不用换' : '🐻 ' + a.value[k] + ' 号最小，换到最前面去 🔄';
  later(() => {
    glow.value = null;
    a.value = swapAt(a.value, i.value, k);
    bear.value = i.value;
    i.value++;
    later(() => {
      bear.value = null;
      if (i.value >= a.value.length - 1) {
        phase.value = 'last';
        say.value = '🤔 只剩一颗了，还要挑吗？';
      } else {
        phase.value = 'pick';
        say.value = '👆 剩下的里面，哪颗最小？';
      }
    }, PAUSE_SHORT);
  }, PAUSE_SHORT);
}

function pickInPair(side: 'l' | 'r') {
  const p = pair.value;
  if (!p || phase.value !== 'compare') return;
  const who = side === 'l' ? p.left : p.left === 'tapped' ? 'min' : 'tapped';
  if (who === 'tapped') {
    pairShake.value = [side, (pairShake.value?.[1] ?? 0) + 1];
    return;
  }
  pair.value = null;
  phase.value = 'pick';
  pulse.value = p.min;
  say.value = '👀 就是它！在队伍里点它';
}

function answerLast(need: boolean) {
  if (phase.value !== 'last') return;
  if (need) {
    wiggle(a.value.length - 1);
    say.value = '👀 数一数，剩下几颗？';
    return;
  }
  i.value = a.value.length;
  phase.value = 'done';
  say.value = '🎉 排好啦！从小到大';
}

function again() {
  a.value = genCandies(KID_N);
  i.value = 0;
  phase.value = 'pick';
  mistakes.value = 0;
  glow.value = null;
  pulse.value = null;
  bear.value = null;
  pair.value = null;
  say.value = '👆 哪颗糖果最小？点它';
}

const pairVals = computed(() => {
  const p = pair.value;
  if (!p) return null;
  const l = p.left === 'tapped' ? p.tapped : p.min;
  const r = p.left === 'tapped' ? p.min : p.tapped;
  return { l: a.value[l], r: a.value[r] };
});
function stopAll() {
  clearTimers();
  if (phase.value === 'moving') again();
}
// 切换标签或卸载时，定时器清掉，正在进行的状态复位到可再次操作
useStageStop(stopAll);
onBeforeUnmount(clearTimers);
</script>

<template>
  <div class="game">
    <p class="small-note">目标：每一轮，点出还没排好的糖果里最小的那一颗，小熊会把它换到最前面。一直点到全部排好。</p>
    <p class="say" aria-live="polite">{{ say }}</p>
    <Candies
      :values="a" :sorted="i" :bear="bear" :glow="glow" :pulse="pulse" :shake="shake"
      :clickable="phase === 'pick' || phase === 'last'" @pick="tap"
    />
    <div v-if="phase === 'compare' && pairVals" class="versus">
      <CandyPair :left="pairVals.l" :right="pairVals.r" clickable :shake="pairShake" @pick="pickInPair" />
    </div>
    <div v-if="phase === 'last'" class="answers">
      <button type="button" class="pad" aria-label="还要挑" @click="answerLast(true)">👆</button>
      <button type="button" class="pad" aria-label="不用挑了" @click="answerLast(false)">🙅</button>
    </div>
    <div v-if="phase === 'done'" class="result">
      <p class="stars" :aria-label="earned + ' 颗星'">
        <span v-for="s in 3" :key="s" :class="{ dim: s > earned }">⭐</span>
      </p>
      <p class="tally">
        <span aria-hidden="true"><span v-for="r in rounds" :key="r">👆</span></span>
        {{ a.length }} 颗糖果，挑了 {{ rounds }} 轮
      </p>
      <div class="row">
        <button type="button" class="btn primary" @click="again">🔁 再来一排</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game { display: flex; flex-direction: column; gap: 16px; }
.say { font-size: clamp(1.3rem, 5vw, 1.9rem); min-height: 1.4em; }
.versus { display: flex; }
.answers { display: flex; gap: 12px; }
.pad {
  font: inherit; font-size: clamp(1.8rem, 8vw, 2.4rem); cursor: pointer; flex: 0 1 3.2em; height: 1.9em;
  border-radius: 16px; border: 1.5px solid var(--line); background: var(--surface);
}
.pad:hover { border-color: var(--accent); }
.pad:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
.stars { font-size: 2.4rem; line-height: 1; }
.stars .dim { filter: grayscale(1); opacity: 0.3; }
.tally { font-size: 1.1rem; display: flex; flex-wrap: wrap; gap: 4px 10px; align-items: center; }
</style>
