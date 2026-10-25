<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { PUZZLES, bestPicks, canTake, desc, greedyPicks, judgePuzzle } from '../../engine/greedy';
import { STAGE_CHANGE_EVENT } from '../../components/shared/usePlayer';
import Shop from './Shop.vue';

// 玩法二「打败贪心机器人」：每关的面值和金额是固定的，机器人 🤖 先用贪心找一遍，
// 孩子要找出比它更少的拿法。没赢时盘子晃一下；没赢两次，最少拿法里的第一枚会透光。
type Phase = 'robot' | 'me' | 'oops' | 'win' | 'all';

const level = ref(0);
const phase = ref<Phase>('robot');
const robot = ref<number[]>([]);
const plate = ref<number[]>([]);
const shake = ref<[number, number] | null>(null);
const shakePlate = ref(0);
const fails = ref(0);
const won = ref<boolean[]>(PUZZLES.map(() => false));
const say = ref('');

const p = computed(() => PUZZLES[level.value]);
const coins = computed(() => desc(p.value.coins));
const left = computed(() => p.value.amount - plate.value.reduce((s, x) => s + x, 0));
const robotLeft = computed(() => p.value.amount - robot.value.reduce((s, x) => s + x, 0));
const glow = computed(() => (phase.value === 'me' && fails.value >= 2 ? bestPicks(p.value.coins, p.value.amount)![0] : null));

let timer: ReturnType<typeof setTimeout> | null = null;
function clear() {
  if (timer) clearTimeout(timer);
  timer = null;
}

function start() {
  clear();
  phase.value = 'robot';
  robot.value = [];
  plate.value = [];
  fails.value = 0;
  say.value = '🤖 机器人先找 ' + p.value.amount + '：每次拿最大的';
  const picks = greedyPicks(p.value.coins, p.value.amount);
  const step = (k: number) => {
    if (k >= picks.length) {
      phase.value = 'me';
      say.value = '🤖 用了 ' + picks.length + ' 枚。你能更少吗？';
      return;
    }
    robot.value = [...robot.value, picks[k]];
    timer = setTimeout(() => step(k + 1), 800);
  };
  timer = setTimeout(() => step(0), 900);
}

function tap(c: number) {
  if (phase.value !== 'me') return;
  if (!canTake(left.value, c)) {
    shake.value = [c, (shake.value?.[1] ?? 0) + 1];
    say.value = '🙅 ' + c + ' 太大啦';
    return;
  }
  plate.value = [...plate.value, c];
  if (left.value > 0) {
    say.value = '还要找 ' + left.value;
    return;
  }
  if (judgePuzzle(p.value, plate.value) === 'beat') {
    phase.value = 'win';
    won.value = won.value.map((w, k) => w || k === level.value);
    say.value = '🏅 ' + plate.value.length + ' 枚！你赢了 🤖';
    return;
  }
  fails.value++;
  shakePlate.value++;
  say.value = '🤔 和 🤖 一样多……还能更少吗？';
  phase.value = 'oops';
  timer = setTimeout(tryAgain, 1300);
}

function tryAgain() {
  plate.value = [];
  phase.value = 'me';
  if (fails.value >= 2) say.value = '💡 看看透光的那枚';
}

function undo() {
  if (phase.value !== 'me' || !plate.value.length) return;
  plate.value = plate.value.slice(0, -1);
  say.value = '还要找 ' + left.value;
}

function nextLevel() {
  if (level.value >= PUZZLES.length - 1) {
    phase.value = 'all';
    say.value = '🎉 你打败了贪心机器人 ' + PUZZLES.length + ' 次！';
    return;
  }
  level.value++;
  start();
}

function restart() {
  won.value = PUZZLES.map(() => false);
  level.value = 0;
  start();
}

/** 切换步骤时：机器人还没找完就从头再找（这样回到「玩」时能看到它找），晃盘子的等待直接结束 */
function pause() {
  clear();
  if (phase.value === 'robot') start();
  else if (phase.value === 'oops') tryAgain();
}

onMounted(() => { start(); window.addEventListener(STAGE_CHANGE_EVENT, pause); });
onBeforeUnmount(() => { clear(); window.removeEventListener(STAGE_CHANGE_EVENT, pause); });
</script>

<template>
  <div class="game">
    <p class="medals" :aria-label="'已经赢了 ' + won.filter(Boolean).length + ' 关，共 ' + PUZZLES.length + ' 关'">
      <span v-for="(w, k) in won" :key="k" :class="{ dim: !w, cur: k === level && phase !== 'all' }">🏅</span>
    </p>
    <p class="say" aria-live="polite">{{ say }}</p>

    <div class="robot-plate" :aria-label="'机器人的盘子：' + robot.join('、')">
      <span class="r-icon" aria-hidden="true">🤖</span>
      <TransitionGroup name="drop" tag="span" class="r-pile" aria-hidden="true">
        <span v-for="(c, k) in robot" :key="k" class="r-coin">{{ c }}</span>
      </TransitionGroup>
      <span v-if="robot.length" class="r-cnt" aria-hidden="true">{{ robotLeft === 0 ? robot.length + ' 枚' : '' }}</span>
    </div>

    <Shop
      :coins="coins" :left="left" :plate="plate" who="🧒"
      :glow="glow" :shake="shake" :shake-plate="shakePlate" :clickable="phase === 'me'" @pick="tap"
    />

    <div v-if="phase === 'me'" class="row">
      <button type="button" class="btn small" :disabled="!plate.length" aria-label="拿回最后一枚" @click="undo">↩️ 拿回一枚</button>
    </div>
    <div v-if="phase === 'win'" class="row">
      <button type="button" class="btn primary" @click="nextLevel">{{ level < PUZZLES.length - 1 ? '▶ 下一关' : '🎉 完成' }}</button>
    </div>
    <div v-if="phase === 'all'" class="result">
      <p class="q">每一关，🤖 都先拿了最大的那枚，后面只好用很多 1 补上。眼前最大的，不一定最少！</p>
      <button type="button" class="btn primary" @click="restart">🔁 再玩一遍</button>
    </div>
  </div>
</template>

<style scoped>
.game { display: flex; flex-direction: column; gap: 16px; }
.say { font-size: clamp(1.3rem, 5vw, 1.9rem); min-height: 2.6em; }
.medals { font-size: 1.8rem; line-height: 1; display: flex; gap: 6px; }
.medals .dim { filter: grayscale(1); opacity: 0.25; }
.medals .cur { outline: 2px dashed var(--accent); outline-offset: 3px; border-radius: 50%; }
.q { font-size: 1.15rem; }
.robot-plate {
  display: flex; align-items: center; gap: 10px; min-height: 52px; padding: 6px 12px; max-width: 560px;
  border-radius: 999px; border: 2px dashed var(--line); background: var(--bg);
}
.r-icon { font-size: 1.5rem; flex: none; }
.r-pile { display: flex; flex-wrap: wrap; gap: 4px; flex: 1; min-width: 0; }
.r-coin {
  width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center;
  font: 700 12px var(--mono); background: var(--out); color: var(--fg); border: 1.5px solid var(--muted);
}
.r-cnt { flex: none; font: 600 14px var(--mono); color: var(--muted); }
.drop-enter-active { transition: transform 0.35s ease-out, opacity 0.35s; }
.drop-enter-from { transform: translateY(-20px) scale(0.6); opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .drop-enter-active { transition: none; }
}
</style>
