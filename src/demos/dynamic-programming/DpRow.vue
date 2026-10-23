<script setup lang="ts">
// dp 表：一排格子，上面是 i / from 之类的标记，下面是下标。三个「做」都用它。
const props = withDefaults(defineProps<{
  dp: (number | null)[];
  /** 当前要填的格子 */
  cur?: number | null;
  /** 正在读的格子 */
  from?: number[];
  /** 选中的格子（猜下一步里已经点对的） */
  picked?: number[];
  /** 点错的格子 */
  miss?: number | null;
  /** 刚刚填好的格子，闪一下 */
  fresh?: number | null;
  clickable?: boolean;
}>(), { cur: null, from: () => [], picked: () => [], miss: null, fresh: null, clickable: false });

const emit = defineEmits<{ pick: [i: number] }>();

function tag(k: number): string {
  const t: string[] = [];
  if (k === props.cur) t.push('i');
  if (props.from.includes(k)) t.push(k === (props.cur ?? 0) - 1 ? 'i-1' : 'i-2');
  return t.join('·');
}
</script>

<template>
  <div class="dpr">
    <button
      v-for="(v, k) in dp" :key="k" type="button" class="dc"
      :class="{ cur: k === cur, from: from.includes(k), picked: picked.includes(k), miss: k === miss, empty: v === null, fresh: k === fresh }"
      :disabled="!clickable"
      :aria-label="'dp[' + k + ']，' + (v === null ? '还空着' : '值 ' + v)"
      @click="emit('pick', k)"
    >
      <span class="tg">{{ tag(k) }}</span>
      <span class="vl">{{ v ?? '' }}</span>
      <span class="ix">{{ k }}</span>
    </button>
  </div>
</template>

<style scoped>
.dpr { display: grid; grid-template-columns: repeat(auto-fill, minmax(44px, 1fr)); gap: 10px 6px; }
.dc { font: inherit; background: none; border: 0; padding: 0; min-width: 0; color: var(--fg); display: flex; flex-direction: column; align-items: center; gap: 3px; cursor: pointer; }
.dc:disabled { cursor: default; }
.dc:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; border-radius: 6px; }
.tg { height: 12px; font: 600 10px/12px var(--mono); white-space: nowrap; }
.ix { font: 400 10px var(--mono); color: var(--muted); }
.vl {
  width: 100%; height: 40px; display: grid; place-items: center;
  font: 600 14px var(--mono); font-variant-numeric: tabular-nums;
  border: 1.5px solid var(--line); border-radius: 6px; background: var(--bg);
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}
.dc:not(:disabled):hover .vl { border-color: var(--accent); }
.dc.empty .vl { border-style: dashed; background: transparent; }
.dc.from .vl { background: var(--mid); color: var(--mid-ink); border-color: var(--mid); }
.dc.picked .vl { background: var(--mid); color: var(--mid-ink); border-color: var(--mid); }
.dc.cur .vl { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent); }
.dc.fresh .vl { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
.dc.miss .vl { border-color: var(--warn); color: var(--warn); }
</style>
