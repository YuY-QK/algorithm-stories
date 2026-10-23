<script setup lang="ts">
import { computed } from 'vue';

// 「做」里的状态画面：面值一排（按 sorted 的顺序），当前的 c 高亮，每种下面写拿了几枚；
// 下面是找零盘。逐步执行和找 bug 共用。
const props = defineProps<{
  /** 面值，按代码里的顺序（排序前就是原样） */
  coins: number[];
  c: number | null;
  picked: number[];
  /** 还没排序时显示一个提示 */
  unsorted?: boolean;
}>();

const counts = computed(() => {
  const m = new Map<number, number>();
  for (const x of props.picked) m.set(x, (m.get(x) ?? 0) + 1);
  return m;
});
</script>

<template>
  <div class="coinrow" aria-hidden="true">
    <div class="denoms" :class="{ faded: unsorted }">
      <div v-for="(x, k) in coins" :key="k" class="denom" :class="{ cur: x === c }">
        <span class="lab">{{ x === c ? 'c' : '' }}</span>
        <span class="face">{{ x }}</span>
        <span class="times">{{ counts.get(x) ? '×' + counts.get(x) : '' }}</span>
      </div>
    </div>
    <div class="pan">
      <span class="pan-lab">picked</span>
      <span v-for="(x, k) in picked" :key="k" class="tiny">{{ x }}</span>
    </div>
  </div>
</template>

<style scoped>
.coinrow { display: flex; flex-direction: column; gap: 12px; }
.denoms { display: flex; flex-wrap: wrap; gap: 8px; }
.denoms.faded { opacity: 0.6; }
.denom { display: flex; flex-direction: column; align-items: center; gap: 3px; width: 46px; }
.lab, .times { height: 14px; font: 600 11px/14px var(--mono); color: var(--fg); }
.times { color: var(--accent); }
.face {
  width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center;
  font: 700 14px var(--mono); font-variant-numeric: tabular-nums;
  background: var(--bg); color: var(--fg); border: 1.5px solid var(--line);
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}
.denom.cur .face { background: var(--mid); color: var(--mid-ink); border-color: var(--mid-ink); }
.pan {
  display: flex; flex-wrap: wrap; align-items: center; gap: 4px; min-height: 40px;
  padding: 6px 10px; border-radius: 10px; border: 1.5px dashed var(--line);
}
.pan-lab { font: 400 12px var(--mono); color: var(--muted); margin-right: 4px; }
.tiny {
  width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center;
  font: 700 11px var(--mono); background: var(--mid); color: var(--mid-ink);
}
</style>
