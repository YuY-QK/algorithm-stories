<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import {
  GRID_COLS, GRID_ROWS, cellHint, cellsToFill, gridStars, gridTable, randomRocks, type Rocks,
} from '../../engine/dynamic-programming';

// 做：挑战。小兔子从左上走到右下，只能向右或向下，石头过不去。
// 第一行、第一列直接给出来，其余的格子按顺序自己填：这一格的路数 = 上面那格 + 左边那格。
const rocks = ref<Rocks>(randomRocks());
const table = computed(() => gridTable(rocks.value));
const cells = computed(() => cellsToFill(rocks.value));
const idx = ref(0);
const input = ref('');
const wrongs = ref(0);
const cellWrongs = ref(0);
const msg = ref('');
const done = computed(() => idx.value >= cells.value.length);
const target = computed(() => table.value[GRID_ROWS - 1][GRID_COLS - 1]);
const earned = computed(() => gridStars(wrongs.value));
const box = ref<HTMLInputElement | null>(null);

const cur = computed(() => (done.value ? null : cells.value[idx.value]));
const filled = computed(() => {
  const set = new Set<string>();
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) if (r === 0 || c === 0) set.add(r + ',' + c);
  }
  cells.value.slice(0, idx.value).forEach(([r, c]) => set.add(r + ',' + c));
  return set;
});
const sources = computed(() => {
  const c = cur.value;
  return c && cellWrongs.value > 0 ? new Set([(c[0] - 1) + ',' + c[1], c[0] + ',' + (c[1] - 1)]) : new Set<string>();
});

function show(r: number, c: number): string {
  if (rocks.value[r][c]) return '🪨';
  if (filled.value.has(r + ',' + c)) return String(table.value[r][c]);
  return cur.value && cur.value[0] === r && cur.value[1] === c ? '？' : '';
}

function fresh() {
  rocks.value = randomRocks();
  idx.value = 0;
  input.value = '';
  wrongs.value = 0;
  cellWrongs.value = 0;
  msg.value = '';
}

async function submit() {
  const c = cur.value;
  if (!c) return;
  const v = parseInt(input.value, 10);
  if (isNaN(v)) {
    msg.value = '先填一个数字。';
    return;
  }
  const [r, col] = c;
  if (v === table.value[r][col]) {
    idx.value++;
    input.value = '';
    cellWrongs.value = 0;
    msg.value = '';
    await nextTick();
    box.value?.focus();
  } else {
    wrongs.value++;
    cellWrongs.value++;
    msg.value = cellWrongs.value === 1
      ? '🤔 看看闪光的两格：最后一步只能从它们来。它们各有几条路？'
      : '💡 ' + cellHint(rocks.value, r, col);
  }
}
</script>

<template>
  <div class="stage">
    <p>小兔子 🐰 要从左上走到右下的 🏠，只能向右或向下，🪨 不能踩。<b>有几条路？</b>把每一格的路数填出来，右下角那格就是答案。</p>

    <div class="grid" :style="{ '--cols': GRID_COLS }" role="group" aria-label="网格">
      <template v-for="(_, r) in GRID_ROWS" :key="r">
        <div
          v-for="(__, c) in GRID_COLS" :key="r + ',' + c" class="gc"
          :class="{ rock: rocks[r][c], cur: cur && cur[0] === r && cur[1] === c, src: sources.has(r + ',' + c), got: filled.has(r + ',' + c) && !rocks[r][c] }"
          :aria-label="'第 ' + (r + 1) + ' 行第 ' + (c + 1) + ' 列：' + (rocks[r][c] ? '石头' : show(r, c) || '空')"
        >
          <span v-if="r === 0 && c === 0" class="mark" aria-hidden="true">🐰</span>
          <span v-else-if="r === GRID_ROWS - 1 && c === GRID_COLS - 1" class="mark" aria-hidden="true">🏠</span>
          <span class="gv">{{ show(r, c) }}</span>
        </div>
      </template>
    </div>

    <form v-if="!done && cur" class="inline" @submit.prevent="submit">
      <label for="dp-cell">第 {{ cur[0] + 1 }} 行第 {{ cur[1] + 1 }} 列，有几条路？</label>
      <input id="dp-cell" ref="box" v-model="input" type="number" inputmode="numeric" min="0" placeholder="几条">
      <button type="submit" class="btn small primary">填上</button>
    </form>
    <p class="oops" aria-live="polite">{{ msg }}</p>

    <div v-if="done" class="result">
      <p class="stars" :aria-label="earned + ' 颗星'"><span v-for="s in 3" :key="s" :class="{ dim: s > earned }">⭐</span></p>
      <h3>🏅 一共 {{ target }} 条路！</h3>
      <p>每一格只看「上面」和「左边」两格，加起来就是答案，石头那一格是 0。整张表填完，不用把 {{ target }} 条路一条一条画出来。</p>
      <button type="button" class="btn small" @click="fresh">换一张地图再来</button>
    </div>
  </div>
</template>

<style scoped>
.grid { display: grid; grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); gap: 6px; max-width: 460px; }
.gc {
  position: relative; aspect-ratio: 1; min-width: 0; display: grid; place-items: center;
  border: 1.5px solid var(--line); border-radius: 8px; background: var(--bg);
  font: 700 clamp(14px, 4.4vw, 20px) var(--mono); font-variant-numeric: tabular-nums;
  transition: background 0.25s, border-color 0.25s;
}
.gc.rock { background: var(--out); border-color: transparent; font-size: clamp(16px, 5vw, 24px); }
.gc.got { background: var(--surface); }
.gc.cur { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent); }
.gc.src { animation: glow 0.9s ease-in-out 3; border-color: var(--mid); background: var(--mid); color: var(--mid-ink); }
.mark { position: absolute; top: 1px; left: 3px; font-size: clamp(9px, 2.6vw, 13px); line-height: 1; }
.gv { line-height: 1; }
.inline { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.inline label { flex: 1 1 100%; }
.stars { font-size: 2.4rem; line-height: 1; }
.stars .dim { filter: grayscale(1); opacity: 0.3; }

@keyframes glow {
  50% { box-shadow: 0 0 0 4px var(--mid), 0 0 14px 4px var(--mid); }
}
@media (prefers-reduced-motion: reduce) {
  .gc.src { animation: none; }
}
</style>
