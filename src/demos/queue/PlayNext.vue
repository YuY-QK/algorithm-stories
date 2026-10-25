<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { BIG, lineAt, lineScript, nextUp, stars, type LineEvent } from '../../engine/queue';
import { useStageStop } from '../../components/shared/usePlayer';
import { play } from '../../components/shared/sound';
import { PAUSE_MID, PAUSE_SHORT } from '../../components/shared/timing';

// 玩法一「谁先买到？」：顾客一个个来排队，店员问「下一个是谁」，孩子点出来。
// 答案由剧本固定（永远是队头）。点错时被点的晃一下，队头举手 🙋。
// 最后追问「谁能先买到」，让孩子自己说出「先来的」。
const script = ref<LineEvent[]>(lineScript());
const at = ref(0);
const line = ref<string[]>([]);
const served = ref<string[]>([]);
const phase = ref<'walk' | 'ask' | 'serve' | 'quiz' | 'done'>('walk');
const mistakes = ref(0);
const shaking = ref<string | null>(null);
const raise = ref<string | null>(null);
const leaving = ref<string | null>(null);
const quiz = ref<'ask' | 'wrong' | 'right'>('ask');
const say = ref('🧑‍🍳 奶茶店开门啦，客人来了……');

let timers: ReturnType<typeof setTimeout>[] = [];
const later = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms));
function stopTimers() {
  timers.forEach(clearTimeout);
  timers = [];
}
// 切换标签时动画要停：客人还在陆续来或者正在离开的话，重新开一局
useStageStop(() => {
  if (phase.value === 'walk' || phase.value === 'serve') again();
  else stopTimers();
});
onBeforeUnmount(stopTimers);

/** 往下走剧本：来人就排进队尾，遇到「问」就停下等孩子点 */
function step() {
  if (at.value >= script.value.length) {
    phase.value = 'quiz';
    quiz.value = 'ask';
    say.value = '🤔 谁能先买到 🧋？';
    return;
  }
  const e = script.value[at.value];
  if ('arrive' in e) {
    line.value = [...line.value, e.arrive];
    play('tick');
    say.value = e.arrive + ' 来了，排在队伍最后面，现在队里有 ' + line.value.length + ' 位';
    at.value++;
    later(step, PAUSE_SHORT);
  } else {
    phase.value = 'ask';
    say.value = '🧑‍🍳 要做好一杯 🧋 了，队里下一个买到的是谁？点一点 👆';
  }
}
later(step, PAUSE_SHORT);

function tap(a: string) {
  if (phase.value !== 'ask') return;
  const right = nextUp(lineAt(script.value, at.value));
  if (a !== right) {
    mistakes.value++;
    play('wrong');
    shaking.value = null;
    requestAnimationFrame(() => (shaking.value = a));
    raise.value = right;
    say.value = a === BIG ? '🐘 个子大也要排队，来得晚就排在后面哦。举手的才是排最前面的' : '🙋 ' + a + ' 不是最先来的。举手的排在最前面，先来的先买';
    return;
  }
  raise.value = null;
  play('right');
  phase.value = 'serve';
  leaving.value = a;
  say.value = '🎉 ' + a + ' 排在最前面，先买到 🧋，离开队伍';
  later(() => {
    line.value = line.value.slice(1);
    served.value = [...served.value, a];
    leaving.value = null;
    at.value++;
    phase.value = 'walk';
    step();
  }, PAUSE_MID);
}

function answer(c: 'first' | 'last' | 'big') {
  if (c === 'first') {
    quiz.value = 'right';
    play('win');
    phase.value = 'done';
    say.value = '🏅 先来的先买！这就叫「队列」';
  } else {
    quiz.value = 'wrong';
    play('wrong');
    say.value = '🤔 看看买到 🧋 的顺序，和来的顺序一样吗？';
  }
}

const earned = computed(() => stars(mistakes.value));
/** 来的顺序（剧本里所有来的人） */
const arrived = computed(() => script.value.flatMap((e) => ('arrive' in e ? [e.arrive] : [])));

function again() {
  stopTimers();
  script.value = lineScript();
  at.value = 0;
  line.value = [];
  served.value = [];
  mistakes.value = 0;
  raise.value = null;
  shaking.value = null;
  leaving.value = null;
  phase.value = 'walk';
  say.value = '🧑‍🍳 又来了一批客人……';
  later(step, PAUSE_SHORT);
}
</script>

<template>
  <div class="game">
    <p class="small-note">目标：客人一个个来排队。店员问「下一个是谁」的时候，点出下一个能买到奶茶的人。点错了，排最前面的会举手提醒你。</p>
    <p class="say" aria-live="polite">{{ say }}</p>
    <div class="shop">
      <div class="counter" aria-hidden="true">🧑‍🍳<small>🧋</small></div>
      <TransitionGroup name="q" tag="div" class="queue">
        <button
          v-for="(a, i) in line"
          :key="a"
          type="button"
          class="guest"
          :class="{ big: a === BIG, shake: shaking === a, out: leaving === a }"
          :disabled="phase !== 'ask'"
          :aria-label="'排在第 ' + (i + 1) + ' 位的 ' + a"
          @click="tap(a)"
        >
          {{ a }}
          <span v-if="raise === a" class="hand" aria-hidden="true">🙋</span>
        </button>
      </TransitionGroup>
    </div>
    <p class="served" aria-label="已经买到奶茶的">
      <span class="cup" aria-hidden="true">🧋</span>
      <span v-for="a in served" :key="a">{{ a }}</span>
    </p>

    <div v-if="phase === 'quiz' || phase === 'done'" class="result">
      <template v-if="quiz !== 'right'">
        <div v-if="quiz === 'wrong'" class="compare">
          <p><span class="lbl">来的顺序</span>{{ arrived.join(' ') }}</p>
          <p><span class="lbl">买到的顺序</span>{{ served.join(' ') }}</p>
        </div>
        <div class="choices">
          <button type="button" class="choice" @click="answer('first')"><span class="pic">⏰</span>先来的</button>
          <button type="button" class="choice" @click="answer('last')"><span class="pic">🏃</span>后来的</button>
          <button type="button" class="choice" @click="answer('big')"><span class="pic">🐘</span>个子大的</button>
        </div>
      </template>
      <template v-else>
        <p class="stars" :aria-label="earned + ' 颗星'">
          <span v-for="s in 3" :key="s" :class="{ dim: s > earned }">⭐</span>
        </p>
        <button type="button" class="btn primary" @click="again">🔁 再来一局</button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.game { display: flex; flex-direction: column; gap: 16px; }
.say { font-size: clamp(1.25rem, 5vw, 1.9rem); min-height: 2.6em; }
.shop { display: flex; align-items: flex-end; gap: 10px; min-height: 84px; }
.counter {
  flex: none; display: flex; flex-direction: column; align-items: center; justify-content: center;
  width: clamp(52px, 15vw, 72px); height: clamp(64px, 18vw, 84px); font-size: clamp(1.6rem, 7vw, 2.2rem); line-height: 1.1;
  border-radius: 12px 12px 4px 4px; background: var(--accent); border: 1.5px solid var(--accent);
}
.counter small { font-size: 0.7em; }
.queue { display: flex; gap: clamp(4px, 1.5vw, 10px); min-width: 0; align-items: flex-end; }
.guest {
  position: relative; font: inherit; font-size: clamp(1.8rem, 9vw, 2.6rem); line-height: 1;
  width: 1.5em; height: 1.5em; padding: 0; cursor: pointer; flex: none;
  border-radius: 14px; border: 1.5px solid var(--line); background: var(--surface);
}
.guest.big { font-size: clamp(2.2rem, 11vw, 3.2rem); width: 1.3em; height: 1.3em; }
.guest:disabled { cursor: default; }
.guest:not(:disabled):hover { border-color: var(--accent); }
.guest:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
.guest.shake { animation: shake 0.5s ease-in-out; }
.guest.out { transform: translateX(-30px) scale(0.85); opacity: 0.4; transition: transform 0.6s, opacity 0.6s; }
.hand { position: absolute; top: -0.55em; right: -0.35em; font-size: 0.5em; animation: wave 0.6s ease-in-out infinite alternate; }
.served { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; min-height: 1.8em; font-size: 1.4rem; }
.cup { padding-right: 6px; margin-right: 4px; border-right: 1.5px solid var(--line); }
.compare { display: flex; flex-direction: column; gap: 4px; font-size: 1.3rem; }
.lbl { display: inline-block; min-width: 5.5em; font-size: 0.75rem; color: var(--muted); }
.choices { display: flex; flex-wrap: wrap; gap: 10px; }
.choice {
  font: inherit; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 10px 16px; border-radius: 12px; border: 1.5px solid var(--line); background: var(--surface); color: var(--fg);
}
.choice:hover { border-color: var(--accent); }
.choice:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
.pic { font-size: 2rem; line-height: 1.1; }
.stars { font-size: 2.4rem; line-height: 1; }
.stars .dim { filter: grayscale(1); opacity: 0.3; }

.q-enter-active { transition: transform 0.5s ease-out, opacity 0.5s; }
.q-enter-from { transform: translateX(60px); opacity: 0; }
.q-leave-active { position: absolute; opacity: 0; }
.q-move { transition: transform 0.45s ease-in-out; }

@keyframes shake {
  20%, 60% { transform: translateX(-4px) rotate(-6deg); }
  40%, 80% { transform: translateX(4px) rotate(6deg); }
}
@keyframes wave {
  to { transform: translateY(-3px) rotate(12deg); }
}
@media (prefers-reduced-motion: reduce) {
  .guest.shake, .hand { animation: none; }
  .guest.shake { box-shadow: 0 0 0 3px var(--mid); }
  .q-enter-active, .q-move, .guest.out { transition: none; }
}
</style>
