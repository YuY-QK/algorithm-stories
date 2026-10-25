<script setup lang="ts">
import { computed, ref } from 'vue';
import { KID_N, middle, narrow, pointTo, type Dir } from '../../engine/binary-search';
import Street from './Street.vue';
import { PAUSE_LONG, PAUSE_MID, PAUSE_SHORT } from '../../components/shared/timing';

// 玩法一「藏信」：孩子先把信藏好盖上叶子，再给小邮差指路。
// 答案一开始就固定了，指错方向时藏信的信箱会透光，提示孩子自己再看一眼。
type Phase = 'hide' | 'hiding' | 'guide' | 'walking' | 'done';

const phase = ref<Phase>('hide');
const secret = ref<number | null>(null);
const lo = ref(1);
const hi = ref(KID_N);
const at = ref(0);
const doors = ref<Record<number, Dir>>({});
const tries = ref(0);
const glow = ref<number | null>(null);
const say = ref('👆 点一个信箱，把信 ✉️ 藏进去');

const letter = computed(() => (phase.value === 'hiding' || phase.value === 'done' ? secret.value : null));
const covered = computed(() => (phase.value === 'guide' || phase.value === 'walking' ? secret.value : null));

function hide(i: number) {
  if (phase.value !== 'hide') return;
  secret.value = i;
  phase.value = 'hiding';
  say.value = '✉️ 藏好啦，盖上叶子 🍃';
  setTimeout(() => {
    phase.value = 'walking';
    at.value = middle(lo.value, hi.value);
    say.value = '🐰 小邮差来啦……';
    setTimeout(ask, PAUSE_SHORT);
  }, PAUSE_LONG);
}

function ask() {
  phase.value = 'guide';
  tries.value++;
  say.value = '🐰 信在哪边？';
}

function answer(d: Dir) {
  if (phase.value !== 'guide' || secret.value === null) return;
  const right = pointTo(secret.value, at.value);
  if (d !== right) {
    glow.value = null;
    requestAnimationFrame(() => (glow.value = secret.value));
    say.value = '🤔 看看叶子 🍃 在哪边？';
    return;
  }
  glow.value = null;
  if (d === 'hit') {
    phase.value = 'done';
    doors.value = { ...doors.value, [at.value]: 'hit' };
    say.value = '🎉 找到啦！小邮差看了 ' + tries.value + ' 次';
    return;
  }
  doors.value = { ...doors.value, [at.value]: d };
  ({ lo: lo.value, hi: hi.value } = narrow(lo.value, hi.value, at.value, d));
  phase.value = 'walking';
  say.value = (d === 'left' ? '👋 右' : '👋 左') + '边都不用看啦';
  setTimeout(() => {
    at.value = middle(lo.value, hi.value);
    setTimeout(ask, PAUSE_SHORT);
  }, PAUSE_MID);
}

function again() {
  phase.value = 'hide';
  secret.value = null;
  lo.value = 1;
  hi.value = KID_N;
  at.value = 0;
  doors.value = {};
  tries.value = 0;
  glow.value = null;
  say.value = '👆 点一个信箱，把信 ✉️ 藏进去';
}
</script>

<template>
  <div class="game">
    <p class="say" aria-live="polite">{{ say }}</p>
    <Street
      :n="KID_N" :lo="lo" :hi="hi" :postman="at" :doors="doors"
      :letter="letter" :covered="covered" :glow="glow"
      :clickable="phase === 'hide'" @pick="hide"
    />
    <div v-if="phase === 'guide' || phase === 'walking'" class="answers">
      <button type="button" class="pad" :disabled="phase !== 'guide'" aria-label="信在左边" @click="answer('left')">⬅️</button>
      <button type="button" class="pad" :disabled="phase !== 'guide'" aria-label="就是这里" @click="answer('hit')">🎉</button>
      <button type="button" class="pad" :disabled="phase !== 'guide'" aria-label="信在右边" @click="answer('right')">➡️</button>
    </div>
    <div v-if="phase === 'done'" class="row">
      <button type="button" class="btn primary" @click="again">🔁 再藏一次</button>
    </div>
  </div>
</template>

<style scoped>
.game { display: flex; flex-direction: column; gap: 16px; }
.say { font-size: clamp(1.3rem, 5vw, 1.9rem); min-height: 1.4em; }
.answers { display: flex; gap: 12px; }
.pad {
  font: inherit; font-size: clamp(1.8rem, 8vw, 2.4rem); cursor: pointer; flex: 0 1 3.2em; height: 1.9em;
  border-radius: 16px; border: 1.5px solid var(--line); background: var(--surface);
}
.pad:disabled { opacity: 0.4; cursor: default; }
.pad:not(:disabled):hover { border-color: var(--accent); }
.pad:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
</style>
