<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { dealHand, judgeGap, stars, toCards } from '../../engine/insertion-sort';
import { useStageStop } from '../../components/shared/usePlayer';
import { MOVE_NEXT, MOVE_SETTLE, MOVE_STEP } from '../../components/shared/timing';
import Hand from './Hand.vue';

// 玩法一「找位置」：小熊摸到一张新牌，孩子点出它该插在哪两张牌中间。
// 牌一开始就发好了，插错时左右两张牌晃一晃，和新牌比一比大小，让孩子自己再看一眼。
const N = 6;
const values = ref<number[]>([]);
const cards = computed(() => toCards(values.value));
const slots = ref<(number | null)[]>([]);
const i = ref(1);
const heldAt = ref(1);
const phase = ref<'pick' | 'moving' | 'done'>('pick');
const mistakes = ref(0);
const shake = ref<[number, number] | null>(null);
const glow = ref<number | null>(null);
const say = ref('');
let timers: ReturnType<typeof setTimeout>[] = [];
const later = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
function stopTimers() {
  timers.forEach(clearTimeout);
  timers = [];
}

const key = computed(() => values.value[i.value]);
const held = computed(() => (phase.value === 'done' ? null : i.value));
/** 手里排好的牌（不含空位） */
const hand = computed(() => slots.value.slice(0, i.value).map((id) => values.value[id!]));

function lift() {
  slots.value = slots.value.map((id, s) => (s === i.value ? null : id));
  heldAt.value = i.value;
  phase.value = 'pick';
  say.value = i.value === 1 ? '🐻 摸到 ' + key.value + '，它该放在哪？👆 点 ▼' : '🐻 又摸到 ' + key.value + '，放在哪？';
}

function fresh() {
  stopTimers();
  values.value = dealHand(N);
  slots.value = values.value.map((_, id) => id);
  i.value = 1;
  mistakes.value = 0;
  glow.value = null;
  lift();
}
fresh();

function pickGap(g: number) {
  if (phase.value !== 'pick') return;
  const j = judgeGap(hand.value, key.value, g);
  if (!j.ok) {
    mistakes.value++;
    const tell: string[] = [];
    if (j.leftBig) {
      const id = slots.value[g - 1]!;
      shake.value = [id, (shake.value?.[1] ?? 0) + 1];
      tell.push(values.value[id] + ' 比 ' + key.value + ' 大');
    }
    if (j.rightSmall) {
      const id = slots.value[g]!;
      if (!j.leftBig) shake.value = [id, (shake.value?.[1] ?? 0) + 1];
      glow.value = null;
      requestAnimationFrame(() => (glow.value = id));
      tell.push(values.value[id] + ' 比 ' + key.value + ' 小');
    }
    say.value = '🤔 ' + tell.join('，') + '，' + key.value + ' 放这里顺序就乱了，再看看';
    return;
  }
  glow.value = null;
  phase.value = 'moving';
  say.value = g === i.value ? '👍 左边的牌都比 ' + key.value + ' 小，' + key.value + ' 就放这儿' : '➡️ 比 ' + key.value + ' 大的牌往右挪一格，给 ' + key.value + ' 让位……';
  // 比 key 大的牌从右往左一张张挪，空位跟着往左走
  let t = 0;
  for (let s = i.value - 1; s >= g; s--) {
    const at = s;
    later((t += MOVE_STEP), () => {
      const next = [...slots.value];
      next[at + 1] = next[at];
      next[at] = null;
      slots.value = next;
      heldAt.value = at;
    });
  }
  later((t += MOVE_SETTLE), () => {
    const next = [...slots.value];
    next[g] = i.value;
    slots.value = next;
    phase.value = 'moving';
    heldAt.value = g;
    say.value = '✨ 放好啦';
  });
  later(t + MOVE_NEXT, () => {
    if (i.value + 1 >= N) {
      phase.value = 'done';
      say.value = '🎉 理好啦！';
      return;
    }
    i.value++;
    lift();
  });
}

/** 放下以后、摸下一张之前，手上没有牌 */
const showHeld = computed(() => (phase.value === 'moving' && slots.value[heldAt.value] === i.value ? null : held.value));
const earned = computed(() => stars(mistakes.value));

// 切换标签时动画要停：让牌直接落到该去的位置，从下一张重新开始
useStageStop(() => {
  if (timers.length && phase.value === 'moving') {
    stopTimers();
    fresh();
  }
});
onBeforeUnmount(stopTimers);
</script>

<template>
  <div class="game">
    <p class="small-note">目标：小熊每摸到一张新牌，点出它该放在哪两张牌中间（点 ▼），放对了牌会自己挪好，一直放到全部理好。</p>
    <p class="say" aria-live="polite">{{ say }}</p>
    <Hand
      :cards="cards" :slots="slots" :held="showHeld" :held-at="heldAt"
      :in-hand="phase === 'done' ? N : i + 1" :shake="shake" :glow="glow"
      :gaps="phase === 'pick' ? i + 1 : 0" @gap="pickGap"
    />
    <div v-if="phase === 'done'" class="result">
      <p class="stars" :aria-label="earned + ' 颗星'">
        <span v-for="s in 3" :key="s" :class="{ dim: s > earned }">⭐</span>
      </p>
      <p>🐻 每张新牌：比它大的在右边，比它小的在左边。</p>
      <button type="button" class="btn primary" @click="fresh">🔁 再来一局</button>
    </div>
  </div>
</template>

<style scoped>
.game { display: flex; flex-direction: column; gap: 16px; }
.say { font-size: clamp(1.3rem, 5vw, 1.9rem); min-height: 1.4em; }
.stars { font-size: 2.4rem; line-height: 1; }
.stars .dim { filter: grayscale(1); opacity: 0.3; }
</style>
