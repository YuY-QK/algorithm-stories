<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import {
  FIND_LEVELS, GUESS_LEVELS, KID_N, allPaths, canHop, noteOptions, pathKey, pathSum, playStars, ways,
} from '../../engine/dynamic-programming';
import Stairs from './Stairs.vue';

// 玩法一「数跳法」：先自己点出第 1～3 级的所有跳法，再看着便签猜第 4～6 级该写几。
// 引导：跳过头会摇头；重复的跳法提醒「已经有啦」；猜错时下面两级的便签闪光，不说「错了」。
const LEVELS = [...FIND_LEVELS, ...GUESS_LEVELS];

const li = ref(0);
const notes = ref<(number | null)[]>(blank());
const path = ref<number[]>([]);
const found = ref<number[][]>([]);
const busy = ref(false);
const levelDone = ref(false);
const allDone = ref(false);
const wrongs = ref(0);
const levelWrongs = ref(0);
const tried = ref<number[]>([]);
const glow = ref<number[]>([]);
const shake = ref<string | null>(null);
const say = ref('');
const timers: ReturnType<typeof setTimeout>[] = [];

function blank(): (number | null)[] {
  const a: (number | null)[] = Array(KID_N + 1).fill(null);
  a[0] = 1;
  return a;
}

const level = computed(() => LEVELS[li.value]);
const finding = computed(() => FIND_LEVELS.includes(level.value));
const total = computed(() => ways(level.value));
const options = computed(() => noteOptions(level.value));
const from = computed(() => (levelDone.value && !finding.value ? [level.value - 1, level.value - 2] : []));
const bunny = computed(() => (finding.value && !allDone.value ? pathSum(path.value) : null));
const earned = computed(() => playStars(wrongs.value));

function later(fn: () => void, ms: number) {
  timers.push(setTimeout(fn, ms));
}
onBeforeUnmount(() => timers.forEach(clearTimeout));

function start() {
  li.value = 0;
  notes.value = blank();
  wrongs.value = 0;
  allDone.value = false;
  begin();
}

function begin() {
  path.value = [];
  found.value = [];
  busy.value = false;
  levelDone.value = false;
  levelWrongs.value = 0;
  tried.value = [];
  glow.value = [];
  if (finding.value) {
    say.value = li.value === 0
      ? '🐰 到第 ' + level.value + ' 级，有几种跳法？点 1 或 2，帮小兔子跳上去'
      : '🐰 再来：到第 ' + level.value + ' 级，有几种跳法？';
  } else if (li.value === FIND_LEVELS.length) {
    say.value = '👀 看看便签：1、2、3 …… 第 ' + level.value + ' 级写几？';
  } else {
    say.value = '📝 第 ' + level.value + ' 级的便签，写几？';
  }
}
begin();

function buzz(id: string) {
  shake.value = null;
  requestAnimationFrame(() => (shake.value = id));
  later(() => (shake.value = null), 600);
}

function hop(h: 1 | 2) {
  if (busy.value || !finding.value || levelDone.value) return;
  if (!canHop(level.value, path.value, h)) {
    buzz('h' + h);
    say.value = '🙈 跳过头啦，换一种试试';
    return;
  }
  path.value = [...path.value, h];
  if (pathSum(path.value) < level.value) return;
  // 跳到了
  busy.value = true;
  const key = pathKey(path.value);
  if (found.value.some((p) => pathKey(p) === key)) {
    say.value = '👀 这种跳法已经有啦，换一种';
    later(() => { path.value = []; busy.value = false; }, 900);
    return;
  }
  found.value = [...found.value, path.value];
  if (found.value.length === total.value) {
    levelDone.value = true;
    notes.value = notes.value.map((v, i) => (i === level.value ? total.value : v));
    say.value = '🎉 第 ' + level.value + ' 级一共 ' + total.value + ' 种！贴上便签 📝';
    later(() => { path.value = []; busy.value = false; }, 700);
  } else {
    say.value = '✅ 找到 ' + found.value.length + ' 种，还有没找到的 ❓';
    later(() => { path.value = []; busy.value = false; }, 800);
  }
}

function choose(v: number) {
  if (finding.value || levelDone.value || tried.value.includes(v)) return;
  if (v === ways(level.value)) {
    levelDone.value = true;
    notes.value = notes.value.map((x, i) => (i === level.value ? v : x));
    glow.value = [];
    say.value = '🎉 ' + ways(level.value - 1) + ' + ' + ways(level.value - 2) + ' = ' + v + '！';
    return;
  }
  wrongs.value++;
  levelWrongs.value++;
  tried.value = [...tried.value, v];
  buzz('o' + v);
  glow.value = [];
  requestAnimationFrame(() => (glow.value = [level.value - 1, level.value - 2]));
  say.value = levelWrongs.value === 1
    ? '🤔 看看闪光的两张便签 💡'
    : '💡 最后一步，不是从闪光的这一级来，就是从那一级来。合起来试试？';
}

function next() {
  if (!levelDone.value) return;
  if (li.value >= LEVELS.length - 1) {
    allDone.value = true;
    say.value = '🌟 你发现啦！每一级的数，都是下面两级的数加起来';
    return;
  }
  li.value++;
  begin();
}
</script>

<template>
  <div class="game">
    <p class="say" aria-live="polite">{{ say }}</p>
    <Stairs
      :n="KID_N" :bunny="bunny" :notes="notes" :from="from" :glow="glow"
      :ask="levelDone || allDone ? null : level" :goal="finding && !allDone ? level : null"
    />

    <template v-if="!allDone">
      <template v-if="finding">
        <div class="hops">
          <button type="button" class="pad" :class="{ shake: shake === 'h1' }" :disabled="busy || levelDone" aria-label="跳 1 级" @click="hop(1)">
            <span class="hb h1">1</span> 小跳
          </button>
          <button type="button" class="pad" :class="{ shake: shake === 'h2' }" :disabled="busy || levelDone" aria-label="跳 2 级" @click="hop(2)">
            <span class="hb h2">2</span> 大跳
          </button>
        </div>
        <ul class="slots" :aria-label="'到第 ' + level + ' 级的跳法'">
          <li v-for="(_, s) in total" :key="s" class="slot" :class="{ empty: !found[s] }">
            <template v-if="found[s]"><span v-for="(h, k) in found[s]" :key="k" class="hb" :class="'h' + h">{{ h }}</span></template>
            <template v-else>❓</template>
          </li>
        </ul>
        <p v-if="path.length" class="cur" aria-label="正在跳">
          <span v-for="(h, k) in path" :key="k" class="hb" :class="'h' + h">{{ h }}</span>
        </p>
      </template>
      <div v-else-if="!levelDone" class="options">
        <button
          v-for="o in options" :key="o" type="button" class="opt"
          :class="{ shake: shake === 'o' + o }" :disabled="tried.includes(o)"
          :aria-label="'写 ' + o" @click="choose(o)"
        >{{ o }}</button>
      </div>
      <div v-if="levelDone" class="row">
        <button type="button" class="btn primary" @click="next">{{ li >= LEVELS.length - 1 ? '🌟 完成' : '➡️ 下一级' }}</button>
      </div>
    </template>

    <div v-else class="result">
      <p class="stars" :aria-label="earned + ' 颗星'"><span v-for="s in 3" :key="s" :class="{ dim: s > earned }">⭐</span></p>
      <p>第 4 级 = 3 + 2，第 5 级 = 5 + 3，第 6 级 = 8 + 5。<b>先算小的，再用便签算大的。</b>这就是动态规划。</p>
      <button type="button" class="btn primary" @click="start">🔁 再玩一次</button>
    </div>
  </div>
</template>

<style scoped>
.game { display: flex; flex-direction: column; gap: 16px; }
.say { font-size: clamp(1.3rem, 5vw, 1.9rem); min-height: 2.6em; }
.hops { display: flex; gap: 12px; flex-wrap: wrap; }
.pad {
  font: 500 1.2rem var(--body); cursor: pointer; flex: 1 1 8em; max-width: 12em; min-height: 3em;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  border-radius: 16px; border: 1.5px solid var(--line); background: var(--surface); color: var(--fg);
}
.pad:disabled { opacity: 0.4; cursor: default; }
.pad:not(:disabled):hover { border-color: var(--accent); }
.pad:focus-visible, .opt:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
.hb {
  display: inline-grid; place-items: center; width: 1.7em; height: 1.7em; border-radius: 50%;
  font: 700 0.85rem var(--mono); line-height: 1;
}
.hb.h1 { background: var(--accent); color: var(--accent-ink); }
.hb.h2 { background: var(--mid); color: var(--mid-ink); }
.slots { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; }
.slot {
  min-width: 3em; min-height: 2.4em; padding: 4px 10px; display: flex; align-items: center; justify-content: center; gap: 4px;
  border-radius: 12px; background: var(--surface); border: 1.5px solid var(--accent);
}
.slot.empty { border-style: dashed; border-color: var(--line); color: var(--muted); }
.cur { display: flex; gap: 4px; min-height: 1.8em; }
.options { display: flex; flex-wrap: wrap; gap: 12px; }
.opt {
  font: 700 1.6rem var(--mono); width: 2.7em; height: 2.2em; cursor: pointer;
  border-radius: 14px; border: 1.5px solid var(--line); background: var(--mid); color: var(--mid-ink);
}
.opt:disabled { opacity: 0.35; cursor: default; background: var(--surface); color: var(--muted); }
.opt:not(:disabled):hover { border-color: var(--accent); }
.shake { animation: shake 0.5s ease-in-out; }
.stars { font-size: 2.4rem; line-height: 1; }
.stars .dim { filter: grayscale(1); opacity: 0.3; }

@keyframes shake {
  20%, 60% { transform: translateX(-5px) rotate(-3deg); }
  40%, 80% { transform: translateX(5px) rotate(3deg); }
}
@media (prefers-reduced-motion: reduce) {
  .shake { animation: none; border-color: var(--warn); }
}
</style>
