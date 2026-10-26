<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import {
  STORY_KIDS, randomKids, shootAnswer, shootInit, shootNextRound, shootQuiet, stars,
  type Choice, type Kid, type ShootState,
} from '../../engine/bubble-sort';
import Lineup from './Lineup.vue';
import { play } from '../../components/shared/sound';
import { PAUSE_ROUND } from '../../components/shared/timing';
import { useStageStop } from '../../components/shared/usePlayer';

// 玩法一「当摄影师」：孩子看挨着的两个，决定换不换。
// 答案由身高决定，孩子改不了；判断不对时高的那个透光、左边的摇一摇，让孩子自己再比一比。
// 一轮谁也没换时，问孩子还要不要再看一轮：学到「没人换就是排好了」。
const byH = (k: Kid) => k.h;

const s = ref<ShootState<Kid>>(shootInit(STORY_KIDS));
const mistakes = ref(0);
const busy = ref(false);
const glow = ref<string | null>(null);
const shake = ref<[string, number] | null>(null);
const hintQuiet = ref(false);
const say = ref('📷 你是摄影师！看 👀 这两个，要换吗？');

const pairIdx = computed(() => (s.value.phase === 'pair' ? s.value.j : null));
const earned = computed(() => stars(mistakes.value));

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

function blink(id: string) {
  glow.value = null;
  requestAnimationFrame(() => (glow.value = id));
}

function answer(c: Choice) {
  if (busy.value || s.value.phase !== 'pair') return;
  const L = s.value.line[s.value.j];
  const R = s.value.line[s.value.j + 1];
  const n = shootAnswer(s.value, c, byH);
  if (!n) {
    mistakes.value++;
    play('wrong');
    blink(L.h > R.h ? L.id : R.id);
    shake.value = [L.id, (shake.value?.[1] ?? 0) + 1];
    say.value = L.h > R.h ? '🤔 谁更高？高的站在左边对吗？' : '🤔 谁更高？矮的已经在左边了吗？';
    return;
  }
  glow.value = null;
  s.value = n;
  if (n.phase !== 'done') play('right');
  if (n.phase === 'pair') say.value = c === 'swap' ? L.face + ' 比 ' + R.face + ' 高，换了位置 🔄 下一对 👀' : L.face + ' 没有 ' + R.face + ' 高，不用换 👍 下一对 👀';
  else if (n.phase === 'next') {
    const top = n.line[n.end];
    say.value = (n.round === 0 ? '🫧 最高的 ' : '🫧 ') + top.face + ' 冒到右边啦，站好不动 ⭐';
    busy.value = true;
    later(() => {
      s.value = shootNextRound(s.value);
      say.value = '👀 再从最左边开始看';
      busy.value = false;
    }, PAUSE_ROUND);
  } else if (n.phase === 'quiet') {
    say.value = '🤫 这一轮谁也没换……还要再看一轮吗？';
  } else finish();
}

function quiet(ans: 'photo' | 'again') {
  if (s.value.phase !== 'quiet') return;
  const n = shootQuiet(s.value, ans);
  if (!n) {
    mistakes.value++;
    play('wrong');
    hintQuiet.value = false;
    requestAnimationFrame(() => (hintQuiet.value = true));
    say.value = '🤔 一个都没换，说明大家已经……？';
    return;
  }
  s.value = n;
  finish();
}

function finish() {
  hintQuiet.value = false;
  play('win');
  say.value = '📸 咔嚓！排好啦 🎉';
}

function again() {
  s.value = shootInit(randomKids());
  mistakes.value = 0;
  glow.value = null;
  hintQuiet.value = false;
  busy.value = false;
  say.value = '📷 新的小伙伴来啦！看 👀 这两个，要换吗？';
}
function stopAll() {
  clearTimers();
  if (busy.value) {
    s.value = shootNextRound(s.value);
    say.value = '👀 再从最左边开始看';
    busy.value = false;
  }
}
// 切换标签或卸载时，定时器清掉，正在进行的状态复位到可再次操作
useStageStop(stopAll);
onBeforeUnmount(clearTimers);
</script>

<template>
  <div class="game">
    <p class="small-note">目标：看高亮的挨着的两个小伙伴，左边比右边高就点 🔄 换，不高就点 👍 不换。一直点到全部排好。</p>
    <p class="say" aria-live="polite">{{ say }}</p>
    <Lineup :line="s.line" :pair="pairIdx" :fixed-from="s.end" :glow="glow" :shake="shake" :photo="s.phase === 'done'" />
    <p class="tally" :class="{ hinted: hintQuiet }" :aria-label="'这一轮换了 ' + s.roundSwaps + ' 次'">
      <span class="lab" aria-hidden="true">这一轮</span>
      <span v-for="t in s.roundSwaps" :key="t" aria-hidden="true">🔄</span>
      <span v-if="s.roundSwaps === 0" class="zero" aria-hidden="true">0</span>
    </p>

    <div v-if="s.phase === 'pair' || s.phase === 'next'" class="pads">
      <button type="button" class="pad" :disabled="busy || s.phase !== 'pair'" aria-label="换位置" @click="answer('swap')">🔄<small>换</small></button>
      <button type="button" class="pad" :disabled="busy || s.phase !== 'pair'" aria-label="不用换" @click="answer('keep')">👍<small>不换</small></button>
    </div>
    <div v-if="s.phase === 'quiet'" class="pads">
      <button type="button" class="pad" aria-label="拍照" @click="quiet('photo')">📸<small>拍照</small></button>
      <button type="button" class="pad" aria-label="再看一轮" @click="quiet('again')">🔁<small>再看</small></button>
    </div>

    <div v-if="s.phase === 'done'" class="win">
      <p class="stars" :aria-label="earned + ' 颗星'">
        <span v-for="k in 3" :key="k" :class="{ dim: k > earned }">⭐</span>
      </p>
      <p class="small-note">比了 {{ s.compares }} 次，换了 {{ s.swaps }} 次</p>
      <div class="row">
        <button type="button" class="btn primary" @click="again">🔁 再来一局</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game { display: flex; flex-direction: column; gap: 14px; }
.say { font-size: clamp(1.3rem, 5vw, 1.9rem); min-height: 2.6em; }
.tally { display: flex; align-items: center; gap: 4px; min-height: 1.8em; font-size: 1.2rem; padding: 2px 10px; border-radius: 10px; align-self: flex-start; }
.tally .lab { font-size: 13px; color: var(--muted); margin-right: 4px; }
.tally .zero { font: 700 1.1rem var(--mono); color: var(--muted); }
.tally.hinted { animation: glowbox 0.9s ease-in-out 2; }
.pads { display: flex; gap: 14px; }
.pad {
  font: inherit; font-size: clamp(1.8rem, 8vw, 2.4rem); cursor: pointer; flex: 0 1 3.6em; height: 2.3em;
  display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.1;
  border-radius: 16px; border: 1.5px solid var(--line); background: var(--surface); color: var(--fg);
}
.pad small { font-size: 13px; color: var(--muted); }
.pad:disabled { opacity: 0.4; cursor: default; }
.pad:not(:disabled):hover { border-color: var(--accent); }
.pad:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
.win { display: flex; flex-direction: column; gap: 10px; }
.stars { font-size: 2.4rem; line-height: 1; }
.stars .dim { filter: grayscale(1); opacity: 0.3; }
@keyframes glowbox {
  50% { box-shadow: 0 0 0 3px var(--mid), 0 0 16px 4px var(--mid); }
}
@media (prefers-reduced-motion: reduce) {
  .tally.hinted { animation: none; box-shadow: 0 0 0 3px var(--mid); }
}
</style>
