<script setup lang="ts">
import { computed, ref } from 'vue';
import { PICK_N, dealLine, isBalanced, medianIdx, splitOf, stars, type Kind, type Split } from '../../engine/quick-sort';
import Lineup from './Lineup.vue';
import { play } from '../../components/shared/sound';

// 玩法二「挑个好标杆」：九位同学，孩子点一位当标杆，立刻看到左右各站了几个人。
// 一边挤、一边空就再换一位；试两次还没找到时，正中间那位会透出光。三回合，最后自己发现：标杆身高在中间，两边最均匀。
const ROUNDS = 3;
const round = ref(1);
const values = ref<number[]>(dealLine());
const ids = computed(() => values.value.map((_, k) => k));
const order = ref<number[]>([]);
const kinds = ref<Kind[]>([]);
const picked = ref<number | null>(null);
const split = ref<Split | null>(null);
const phase = ref<'pick' | 'bad' | 'good' | 'end'>('pick');
const tries = ref(0);
const bad = ref(0);
const say = ref('');

const median = computed(() => medianIdx(values.value));
const glow = computed(() => (phase.value === 'pick' && tries.value >= 2 ? median.value : null));

function reset() {
  order.value = [...ids.value];
  kinds.value = ids.value.map(() => 'plain');
  picked.value = null;
  split.value = null;
}
function start() {
  values.value = dealLine();
  tries.value = 0;
  phase.value = 'pick';
  reset();
  say.value = '第 ' + round.value + ' 回：点一位同学当标杆 🚩';
}
function again() {
  round.value = 1;
  bad.value = 0;
  start();
}
again();

function pickKid(id: number) {
  if (phase.value !== 'pick') return;
  const v = values.value;
  const lows = ids.value.filter((x) => v[x] < v[id]);
  const highs = ids.value.filter((x) => v[x] > v[id]);
  order.value = [...lows, id, ...highs];
  kinds.value = [...lows.map(() => 'low' as Kind), 'pivot', ...highs.map(() => 'high' as Kind)];
  picked.value = id;
  const s = splitOf(v, id);
  split.value = s;
  if (isBalanced(s, PICK_N)) {
    phase.value = 'good';
    play('right');
    say.value = '🎉 矮的 ' + s.left + ' 人在左边，高的 ' + s.right + ' 人在右边，分得真均匀！';
  } else {
    phase.value = 'bad';
    play('wrong');
    bad.value++;
    tries.value++;
    say.value = Math.min(s.left, s.right) === 0
      ? '😮 有一边一个人都没有，白忙了一场。换一位试试？'
      : '😮 一边挤了 ' + Math.max(s.left, s.right) + ' 人，另一边才 ' + Math.min(s.left, s.right) + ' 人。换一位试试？';
  }
}
function retry() {
  reset();
  phase.value = 'pick';
  say.value = tries.value >= 2 ? '🤔 看看透光的那位？' : '换一位同学当标杆 🚩';
}
function nextRound() {
  if (round.value >= ROUNDS) {
    phase.value = 'end';
    play('win');
    say.value = '🏅 三回合都过关！';
    return;
  }
  round.value++;
  start();
}
const earned = computed(() => stars(bad.value));
</script>

<template>
  <div class="game">
    <p class="small-note">目标：点一位同学当标杆 🚩，让他左边（比他矮）和右边（比他高）的人数尽量接近。</p>
    <p class="say" aria-live="polite">{{ say }}</p>
    <p class="small-note">第 {{ Math.min(round, ROUNDS) }} / {{ ROUNDS }} 回</p>
    <Lineup :heights="values" :order="order" :kinds="kinds" :pickable="phase === 'pick'" :glow="glow" @pick="pickKid" />

    <div v-if="split" class="split" aria-live="polite">
      <div v-if="split.left > 0" class="side lo" :style="{ flexGrow: split.left }"><span>⬅️ {{ split.left }} 人</span></div>
      <div v-else class="empty">⬅️ 0 人</div>
      <div v-if="split.right > 0" class="side hi" :style="{ flexGrow: split.right }"><span>{{ split.right }} 人 ➡️</span></div>
      <div v-else class="empty">0 人 ➡️</div>
    </div>

    <div class="row">
      <button v-if="phase === 'bad'" type="button" class="btn primary" @click="retry">🔄 换一位试试</button>
      <button v-if="phase === 'good'" type="button" class="btn primary" @click="nextRound">{{ round >= ROUNDS ? '🏁 看结果' : '▶ 下一回' }}</button>
    </div>

    <div v-if="phase === 'end'" class="result">
      <p class="stars" :aria-label="earned + ' 颗星'">
        <span v-for="s in 3" :key="s" :class="{ dim: s > earned }">⭐</span>
      </p>
      <p>你发现了吗？选<b>中间身高</b>的同学当标杆，左右两边人数最接近；选最矮或最高的，一边是空的，这一轮就白忙了。</p>
      <p class="small-note">标杆分得越均匀，剩下要排的两堆就越小、越快。每次都选到最矮或最高的，一堆只少一个人，要分很多很多轮。</p>
      <button type="button" class="btn primary" @click="again">🔁 再来一局</button>
    </div>
  </div>
</template>

<style scoped>
.game { display: flex; flex-direction: column; gap: 14px; }
.say { font-size: clamp(1.3rem, 5vw, 1.9rem); min-height: 2.6em; }
.split { display: flex; gap: 6px; max-width: 684px; font: 700 14px var(--mono); }
.side { flex-basis: 0; min-width: 0; padding: 8px 6px; border-radius: 8px; text-align: center; transition: flex-grow 0.4s; }
.side.lo { background: color-mix(in srgb, var(--accent) 40%, var(--bg)); border: 1.5px solid var(--accent); }
.side.hi { background: color-mix(in srgb, var(--mid) 55%, var(--bg)); border: 1.5px solid var(--mid); color: var(--fg); }
.empty { flex: 0 0 auto; white-space: nowrap; padding: 8px 10px; border-radius: 8px; border: 1.5px dashed var(--warn); color: var(--warn); text-align: center; }
.stars { font-size: 2.4rem; line-height: 1; }
.stars .dim { filter: grayscale(1); opacity: 0.3; }
@media (prefers-reduced-motion: reduce) {
  .side { transition: none; }
}
</style>
