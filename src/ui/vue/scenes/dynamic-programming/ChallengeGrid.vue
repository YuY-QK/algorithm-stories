<script setup lang="ts">
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import { GRID_COLS, GRID_ROWS, gridCur, gridFilled, gridSources, gridTable, type GridGame } from '../../../../engine/dynamic-programming';

// 做：挑战的网格。小兔子在左上，🏠 在右下，🪨 过不去。已经有数字的格子写数字，正在填的格子写 ？，
// 填错以后上面和左边两格闪光。输入框和按钮由规则的 controls 给。
const props = defineProps<{ state: GridGame; clickable: boolean; t: (msg: Msg) => string }>();

const table = () => gridTable(props.state.rocks);
const cur = () => gridCur(props.state);
const filled = () => gridFilled(props.state);
const sources = () => gridSources(props.state);

function show(r: number, c: number): string {
  if (props.state.rocks[r][c]) return '🪨';
  if (filled().has(r + ',' + c)) return String(table()[r][c]);
  const x = cur();
  return x && x[0] === r && x[1] === c ? '？' : '';
}
</script>

<template>
  <div class="grid" :style="{ '--cols': GRID_COLS }" role="group" :aria-label="t(m('scene.grid'))">
    <template v-for="(_, r) in GRID_ROWS" :key="r">
      <div
        v-for="(__, c) in GRID_COLS" :key="r + ',' + c" class="gc"
        :class="{ rock: state.rocks[r][c], cur: cur() && cur()![0] === r && cur()![1] === c, src: sources().has(r + ',' + c), got: filled().has(r + ',' + c) && !state.rocks[r][c] }"
        :aria-label="t(m('scene.grid.cell', { r: r + 1, c: c + 1, what: state.rocks[r][c] ? m('scene.grid.rock') : show(r, c) || m('scene.grid.empty') }))"
      >
        <span v-if="r === 0 && c === 0" class="mark" aria-hidden="true">🐰</span>
        <span v-else-if="r === GRID_ROWS - 1 && c === GRID_COLS - 1" class="mark" aria-hidden="true">🏠</span>
        <span class="gv">{{ show(r, c) }}</span>
      </div>
    </template>
  </div>
  <p v-if="cur()" class="cellq" aria-hidden="true">{{ t(m('chal.cellQ', { r: cur()![0] + 1, c: cur()![1] + 1 })) }}</p>
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

@keyframes glow {
  50% { box-shadow: 0 0 0 4px var(--mid), 0 0 14px 4px var(--mid); }
}
@media (prefers-reduced-motion: reduce) {
  .gc.src { animation: none; }
}
</style>
