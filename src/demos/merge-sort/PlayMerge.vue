<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { dealQueues, judgeHeads, stars } from '../../engine/merge-sort';
import Queue from './Queue.vue';

// 玩法一「合并两队」：两队已经排好的小动物，孩子每次点两个队头里更矮的那个，让它走进新队伍。
// 点错了不说错：被点的摇一摇，更矮的那个透出光，让孩子自己再比一比。一队走光后，另一队剩下的自动跟上。
const values = ref<number[]>([]);
const left = ref<number[]>([]);
const right = ref<number[]>([]);
const out = ref<number[]>([]);
const mistakes = ref(0);
const phase = ref<'pick' | 'tail' | 'done'>('pick');
const say = ref('');
const moved = ref<number | null>(null);
const glow = ref<number | null>(null);
const shake = ref<[number, number] | null>(null);
let timers: ReturnType<typeof setTimeout>[] = [];
const later = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));

function fresh() {
  timers.forEach(clearTimeout);
  timers = [];
  const q = dealQueues();
  values.value = [...q.left, ...q.right];
  left.value = q.left.map((_, k) => k);
  right.value = q.right.map((_, k) => q.left.length + k);
  out.value = [];
  mistakes.value = 0;
  phase.value = 'pick';
  moved.value = null;
  glow.value = null;
  shake.value = null;
  say.value = '👆 点一点两个队头里更矮的那个';
}
fresh();

const heads = computed(() => [left.value[0], right.value[0]].filter((x) => x !== undefined));
const vals = (ids: number[]) => ids.map((id) => values.value[id]);

function pick(side: 'L' | 'R') {
  if (phase.value !== 'pick') return;
  const j = judgeHeads(vals(left.value), vals(right.value), side);
  const pickedId = side === 'L' ? left.value[0] : right.value[0];
  const otherId = side === 'L' ? right.value[0] : left.value[0];
  if (!j.ok) {
    mistakes.value++;
    shake.value = [pickedId, (shake.value?.[1] ?? 0) + 1];
    glow.value = null;
    requestAnimationFrame(() => (glow.value = otherId));
    say.value = '🤔 比一比：' + j.picked + ' 和 ' + j.other + '，谁更矮？';
    return;
  }
  glow.value = null;
  go(side);
  if (!left.value.length || !right.value.length) finishTail();
  else say.value = '👍 下一个！';
}

function go(side: 'L' | 'R') {
  const src = side === 'L' ? left : right;
  const id = src.value[0];
  src.value = src.value.slice(1);
  out.value = [...out.value, id];
  moved.value = id;
}

function finishTail() {
  const rest = left.value.length ? 'L' : right.value.length ? 'R' : null;
  if (!rest) return end();
  phase.value = 'tail';
  say.value = (rest === 'L' ? '右' : '左') + '队走光啦，剩下的直接跟上 ➡️';
  let t = 0;
  const n = (rest === 'L' ? left : right).value.length;
  for (let x = 0; x < n; x++) later((t += 650), () => go(rest));
  later(t + 600, end);
}

function end() {
  phase.value = 'done';
  moved.value = null;
  say.value = '🎉 合成一队啦！';
}

const earned = computed(() => stars(mistakes.value));
const max = computed(() => Math.max(...values.value, 9));
onBeforeUnmount(() => timers.forEach(clearTimeout));
</script>

<template>
  <div class="game">
    <p class="say" aria-live="polite">{{ say }}</p>
    <div class="two">
      <div class="slot">
        <small class="cap">🏫 一班</small>
        <Queue
          :ids="left" :values="values" :max="max" :cmp="phase === 'pick' ? heads : []" :glow="glow" :shake="shake"
          :pick-head="phase === 'pick'" empty="走光啦" label="一班" @pick="pick('L')"
        />
      </div>
      <div class="slot">
        <small class="cap">🏫 二班</small>
        <Queue
          :ids="right" :values="values" :max="max" :cmp="phase === 'pick' ? heads : []" :glow="glow" :shake="shake"
          :pick-head="phase === 'pick'" empty="走光啦" label="二班" @pick="pick('R')"
        />
      </div>
    </div>
    <div class="slot">
      <small class="cap">🚩 新队伍</small>
      <Queue :ids="out" :values="values" :max="max" :moved="moved" :fresh="phase === 'done'" empty="从这里排起" label="新队伍" />
    </div>
    <div v-if="phase === 'done'" class="result">
      <p class="stars" :aria-label="earned + ' 颗星'">
        <span v-for="s in 3" :key="s" :class="{ dim: s > earned }">⭐</span>
      </p>
      <p>🐶 每次只看两个队头，矮的先走。新队伍就排好了！</p>
      <button type="button" class="btn primary" @click="fresh">🔁 再来一局</button>
    </div>
  </div>
</template>

<style scoped>
.game { --kw: min(56px, calc((100vw - 100px) / 8)); --kf: clamp(18px, 6vw, 30px); display: flex; flex-direction: column; gap: 14px; max-width: 560px; }
.say { font-size: clamp(1.3rem, 5vw, 1.9rem); min-height: 1.4em; }
.two { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.slot { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.cap { color: var(--muted); font-size: 12px; }
@media (max-width: 600px) { .two { grid-template-columns: minmax(0, 1fr); } }
.stars { font-size: 2.4rem; line-height: 1; }
.stars .dim { filter: grayscale(1); opacity: 0.3; }
</style>
