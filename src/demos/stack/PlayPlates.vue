<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { PLATE_ICONS, plateGame, runPlates, stars, topIndex, type PlateOp } from '../../engine/stack';
import { useStageStop } from '../../components/shared/usePlayer';
import { PAUSE_LONG } from '../../components/shared/timing';
import { play } from '../../components/shared/sound';
import Plates from './Plates.vue';

// 玩法一「拿盘子」：小熊一个个叠盘子，要拿的时候孩子点出会拿到哪一个。
// 局面开局就定好；点了被压着的盘子，它会晃一下，最上面的盘子透光。
// 玩完追问「最先放的盘子什么时候拿到」，让孩子自己说出「最后」。
const ops = ref<PlateOp[]>(plateGame());
const at = ref(0); // 已经做完几个操作
const states = computed(() => runPlates(ops.value));
const cur = computed(() => states.value[at.value]);
const phase = ref<'moving' | 'ask' | 'done'>('moving');
const misses = ref(0);
const glow = ref(false);
const shake = ref<[number, number] | null>(null);
const say = ref('');
const quiz = ref<'ask' | 'wrong' | 'right' | null>(null);
let asked = false;
let timer: ReturnType<typeof setTimeout> | null = null;

const first = computed(() => {
  const op = ops.value.find((o) => o.kind === 'push');
  return op && op.kind === 'push' ? op.plate : 0;
});
const earned = computed(() => stars(misses.value));

function later(fn: () => void, ms: number) {
  timer = setTimeout(fn, ms);
}

/** 放上盘子后说清楚：放了哪个、现在叠了几个、最上面是谁 */
function putText(plate: number, n: number): string {
  return '🐻 把 ' + PLATE_ICONS[plate] + ' 盘放在最上面，现在叠了 ' + n + ' 个';
}

/** 自动放盘子，遇到「拿」就停下来问孩子 */
function step() {
  if (at.value >= ops.value.length) return finish();
  const op = ops.value[at.value];
  if (op.kind === 'push') {
    at.value++;
    play('tick');
    say.value = putText(op.plate, cur.value.stack.length);
    later(step, PAUSE_LONG);
  } else {
    phase.value = 'ask';
    say.value = '🐻 要拿一个盘子了。只能拿最上面的，是哪一个？点点看 👆';
  }
}

function tap(p: number) {
  if (phase.value !== 'ask') return;
  const st = cur.value.stack;
  if (p !== st[topIndex(st)]) {
    misses.value++;
    play('wrong');
    shake.value = [p, (shake.value?.[1] ?? 0) + 1];
    glow.value = false;
    requestAnimationFrame(() => (glow.value = true));
    say.value = '🤔 ' + PLATE_ICONS[p] + ' 盘上面还压着盘子呢';
    return;
  }
  glow.value = false;
  play('right');
  at.value++;
  phase.value = 'moving';
  const left = cur.value.stack.length;
  say.value = '👍 拿走最上面的 ' + PLATE_ICONS[p] + ' 盘，' + (left ? '还剩 ' + left + ' 个' : '盘子拿光了');
  later(step, PAUSE_LONG);
}

function finish() {
  phase.value = 'done';
  play('win');
  say.value = '🎉 盘子全拿完啦！';
  if (!asked) {
    asked = true;
    quiz.value = 'ask';
  }
}

function answerQuiz(when: 'first' | 'last') {
  play(when === 'last' ? 'right' : 'wrong');
  quiz.value = when === 'last' ? 'right' : 'wrong';
}

function stopTimer() {
  if (timer) clearTimeout(timer);
  timer = null;
}

function again() {
  stopTimer();
  ops.value = plateGame();
  at.value = 0;
  misses.value = 0;
  glow.value = false;
  quiz.value = null;
  phase.value = 'moving';
  step();
}

step();
// 切换标签时动画要停：自动放盘子还没停下来的话，重新开一局
useStageStop(() => {
  if (phase.value === 'moving') again();
  else stopTimer();
});
onBeforeUnmount(stopTimer);
</script>

<template>
  <div class="game">
    <p class="small-note">目标：小熊一个个叠盘子，叠好以后会拿走几个。每次要拿的时候，点出你觉得会被拿走的那个盘子。</p>
    <p class="say" aria-live="polite">{{ say }}</p>
    <Plates
      :stack="cur.stack" :taken="cur.taken" :room="5"
      :clickable="phase === 'ask'" :glow-top="glow && phase === 'ask'" :shake="shake"
      @pick="tap"
    />

    <div v-if="phase === 'done'" class="result">
      <p class="stars" :aria-label="earned + ' 颗星'">
        <span v-for="s in 3" :key="s" :class="{ dim: s > earned }">⭐</span>
      </p>
      <div v-if="quiz === 'ask' || quiz === 'wrong'" class="quiz">
        <p class="q">🤔 最先放上去的 {{ PLATE_ICONS[first] }} 盘，是什么时候拿到的？</p>
        <div class="choices">
          <button type="button" class="choice" @click="answerQuiz('first')"><span aria-hidden="true">🥇</span>最先</button>
          <button type="button" class="choice" @click="answerQuiz('last')"><span aria-hidden="true">🐢</span>最后</button>
        </div>
        <p v-if="quiz === 'wrong'" class="q hint">👀 看看「拿走的」那一排，{{ PLATE_ICONS[first] }} 盘排在第几个？</p>
      </div>
      <p v-else-if="quiz === 'right'" class="q">🏅 对啦！先放的后拿，后放的先拿。这就是「栈」！</p>
      <div class="row">
        <button type="button" class="btn primary" @click="again">🔁 再玩一局</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game { display: flex; flex-direction: column; gap: 16px; }
.say { font-size: clamp(1.3rem, 5vw, 1.9rem); min-height: 2.6em; }
.stars { font-size: 2.4rem; line-height: 1; }
.stars .dim { filter: grayscale(1); opacity: 0.3; }
.quiz { display: flex; flex-direction: column; gap: 10px; }
.q { font-size: 1.2rem; max-width: 30em; }
.q.hint { color: var(--muted); font-size: 1.05rem; }
.choices { display: flex; flex-wrap: wrap; gap: 10px; }
.choice {
  font: inherit; font-size: 1.1rem; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 10px 18px; border-radius: 12px; border: 1.5px solid var(--line); background: var(--surface); color: var(--fg);
}
.choice span { font-size: 1.8rem; line-height: 1; }
.choice:hover { border-color: var(--accent); }
.choice:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
</style>
