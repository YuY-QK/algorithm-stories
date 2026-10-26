<script setup lang="ts">
import type { Cell } from '../../engine/linear-search';

// 一排玩具箱（或一排数字格）：盖着的、看过的、正在开的、找到的。
// 小箭头 / 小朋友指着当前这一个；可选：点箱子、点错了晃一下、越界的那个虚线格。
withDefaults(defineProps<{
  cells: Cell[];
  /** 小箭头指着第几个，-1 不显示 */
  pointer?: number;
  /** 指针位置的小人，默认 ▼ */
  kid?: string;
  clickable?: boolean;
  /** [下标, 第几次]：让这个格子晃一下 */
  shake?: [number, number] | null;
  /** 在末尾多画一个虚线格：下标越界 */
  ghost?: boolean;
  /** 给整排起的名字 */
  label?: string;
}>(), { pointer: -1, kid: '', clickable: false, shake: null, ghost: false, label: '一排箱子' });
const emit = defineEmits<{ pick: [index: number] }>();

const STATE_TEXT = { closed: '盖着', seen: '看过了', now: '正在看', hit: '找到了' } as const;
</script>

<template>
  <div class="bx-wrap">
    <ol class="bxrow" :aria-label="label">
      <li v-for="(c, k) in cells" :key="k" class="col">
        <span class="ptr" aria-hidden="true">{{ pointer === k ? (kid || '▼') : '' }}</span>
        <component
          :is="clickable ? 'button' : 'span'"
          :key="k + '-' + (shake && shake[0] === k ? shake[1] : 0)"
          class="bx"
          :class="[c.state, { wiggle: shake && shake[0] === k, digits: c.label !== '' && !/\p{Extended_Pictographic}/u.test(c.label) }]"
          :type="clickable ? 'button' : undefined"
          :aria-label="'第 ' + (k + 1) + ' 个，' + STATE_TEXT[c.state] + (c.label ? '：' + c.label : '')"
          @click="clickable && emit('pick', k)"
        >{{ c.label || '📦' }}</component>
        <span class="ix" aria-hidden="true">{{ k }}</span>
      </li>
      <li v-if="ghost" class="col">
        <span class="ptr" aria-hidden="true">{{ pointer === cells.length ? (kid || '▼') : '' }}</span>
        <span class="bx ghost" aria-label="越界：这里没有箱子">💥</span>
        <span class="ix" aria-hidden="true">{{ cells.length }}</span>
      </li>
    </ol>
    <p v-if="pointer < 0 && kid" class="kidline" aria-hidden="true">{{ kid }}</p>
  </div>
</template>

<style scoped>
.bx-wrap { display: flex; flex-direction: column; align-items: stretch; gap: 4px; }
.bxrow { list-style: none; margin: 0; padding: 0; display: flex; gap: 4px; justify-content: center; }
.col { flex: 1 1 0; min-width: 0; max-width: 64px; display: flex; flex-direction: column; align-items: center; gap: 3px; }
.ptr { height: 1.5em; font-size: clamp(1rem, 4.5vw, 1.4rem); line-height: 1.5em; color: var(--accent); }
.bx {
  font: inherit; font-size: clamp(1.05rem, 5vw, 1.7rem); color: var(--fg);
  width: 100%; min-height: 36px; aspect-ratio: 1; display: flex; align-items: center; justify-content: center;
  border-radius: 10px; border: 1.5px solid var(--line); background: var(--out); padding: 0; box-sizing: border-box;
  transition: opacity 0.25s, background 0.25s;
}
.bx.digits { font-family: var(--mono); font-weight: 600; font-size: clamp(0.85rem, 4vw, 1.15rem); }
button.bx { cursor: pointer; }
button.bx:hover { border-color: var(--accent); }
button.bx:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
.bx.closed { background: var(--out); }
.bx.seen { opacity: 0.45; background: var(--surface); }
.bx.now { border-color: var(--accent); border-width: 2.5px; background: var(--surface); }
.bx.hit { background: var(--mid); border-color: var(--mid); color: var(--mid-ink); }
.bx.ghost { border-style: dashed; border-color: var(--warn); background: transparent; }
.ix { font: 500 11px var(--mono); color: var(--muted); }
.kidline { margin: 0; text-align: center; font-size: 1.8rem; line-height: 1.2; }
.wiggle { animation: wig 0.5s; }
@keyframes wig { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-5px); } 60% { transform: translateX(5px); } }
@media (prefers-reduced-motion: reduce) { .wiggle { animation: none; outline: 2px solid var(--warn); } .bx { transition: none; } }
</style>
