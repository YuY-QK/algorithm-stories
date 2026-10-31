<script setup lang="ts">
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import Piece from './Piece.vue';

// 「做」里的画面：上面是括号串（当前字符标出来），下面是栈（左边栈底，右边栈顶）。
withDefaults(defineProps<{
  s: string;
  /** 当前字符下标，-1 表示还没开始，s.length 表示扫完了 */
  i: number;
  stack: string[];
  /** 刚弹出的栈顶 */
  top?: string | null;
  /** 当前字符出问题时标红 */
  bad?: boolean;
  t: (msg: Msg) => string;
}>(), { top: null, bad: false });
</script>

<template>
  <div class="bview">
    <ol class="chars" :aria-label="t(m('bracket.chars'))">
      <li v-for="(c, k) in s" :key="k" :class="{ past: k < i, now: k === i, bad: bad && k === i }">
        <Piece :c="c" small />
        <span class="ix">{{ k }}</span>
      </li>
      <li v-if="!s.length" class="empty">{{ t(m('bracket.emptyStr')) }}</li>
    </ol>
    <div class="srow">
      <span class="lab">{{ t(m('bracket.bottom')) }}</span>
      <div class="cells" :aria-label="t(m('bracket.stackLabel', { items: stack.join(' ') || t(m('bracket.nil')) }))">
        <span v-for="(c, k) in stack" :key="k" class="cellwrap" :class="{ topc: k === stack.length - 1 }"><Piece :c="c" small /></span>
        <span v-if="!stack.length" class="emptyst">{{ t(m('bracket.nil')) }}</span>
      </div>
      <span class="lab">{{ t(m('bracket.top')) }}</span>
      <span v-if="top" class="popped">{{ t(m('bracket.popped')) }} <Piece :c="top" small /></span>
    </div>
  </div>
</template>

<style scoped>
.bview { display: flex; flex-direction: column; gap: 14px; }
.chars { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px 5px; }
.chars li { display: flex; flex-direction: column; align-items: center; gap: 2px; border-radius: 8px; transition: opacity 0.2s; }
.chars li.past { opacity: 0.35; }
.chars li.now :deep(.piece) { box-shadow: 0 0 0 3px var(--fg); }
.chars li.bad :deep(.piece) { box-shadow: 0 0 0 3px var(--warn); }
.chars .empty { color: var(--muted); font-size: 14px; }
.ix { font: 400 10px var(--mono); color: var(--muted); }
.srow { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.lab { font-size: 12px; color: var(--muted); }
.cells {
  display: flex; flex-wrap: wrap; gap: 4px; min-height: 42px; min-width: 60px; align-items: center;
  padding: 4px 6px; border: 2px solid var(--line); border-right: 0; border-radius: 8px 0 0 8px; background: var(--bg);
}
.cellwrap.topc :deep(.piece) { box-shadow: 0 0 0 2px var(--fg); }
.emptyst { font-size: 13px; color: var(--muted); }
.popped { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--muted); }
</style>
