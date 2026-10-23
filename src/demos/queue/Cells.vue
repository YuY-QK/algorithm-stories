<script setup lang="ts">
import { computed } from 'vue';

// 「做」里的数组：一排格子，上面标 head、tail，下面是下标。
// 队里的格子正常显示，出队后留下的旧值变灰，从没写过的格子是空的。
const props = withDefaults(defineProps<{
  cells: (number | null)[];
  head: number;
  tail: number;
  size: number;
  touched?: number | null;
  /** 不显示 head、tail 标签（比如挑战题还没揭晓） */
  hideTags?: boolean;
  clickable?: boolean;
  /** 点错的格子 */
  miss?: number | null;
  /** 点对的格子 */
  hit?: number | null;
}>(), { touched: null, hideTags: false, clickable: false, miss: null, hit: null });

const emit = defineEmits<{ pick: [i: number] }>();

const n = computed(() => props.cells.length);
const live = (k: number) => props.size > 0 && (k - props.head + n.value) % n.value < props.size;
/** tail 走出了数组（找 bug 里忘了取模的情况），多画一个虚格 */
const ghost = computed(() => props.tail >= n.value);

function tag(k: number) {
  if (props.hideTags) return '';
  const t: string[] = [];
  if (k === props.head) t.push('head');
  if (k === props.tail) t.push('tail');
  return t.join('·');
}
function label(k: number) {
  const v = props.cells[k];
  return k + ' 号格，' + (v === null ? '空' : '值 ' + v + (live(k) ? '' : '，已出队')) + (tag(k) ? '，' + tag(k) : '');
}
</script>

<template>
  <div class="cells" :style="{ '--n': n + (ghost ? 1 : 0) }">
    <button
      v-for="(v, k) in cells"
      :key="k"
      type="button"
      class="box"
      :class="{ live: live(k), old: !live(k) && v !== null, touched: touched === k, miss: miss === k, hit: hit === k }"
      :disabled="!clickable"
      :aria-label="label(k)"
      @click="emit('pick', k)"
    >
      <span class="tag">{{ tag(k) }}</span>
      <span class="val">{{ v ?? '' }}</span>
      <span class="idx">{{ k }}</span>
    </button>
    <div v-if="ghost" class="box ghost" aria-label="数组外面">
      <span class="tag">tail</span>
      <span class="val">💥</span>
      <span class="idx">{{ tail }}</span>
    </div>
  </div>
</template>

<style scoped>
.cells { display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); gap: 6px; max-width: calc(var(--n) * 64px); }
.box { font: inherit; background: none; border: 0; padding: 0; display: flex; flex-direction: column; align-items: center; gap: 3px; min-width: 0; color: var(--fg); }
button.box:not(:disabled) { cursor: pointer; }
.box:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; border-radius: 6px; }
.val {
  width: 100%; height: 42px; display: grid; place-items: center;
  font: 600 15px var(--mono); font-variant-numeric: tabular-nums;
  border: 1.5px solid var(--line); border-radius: 6px; background: var(--bg); color: var(--fg);
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}
button.box:not(:disabled):hover .val { border-color: var(--accent); }
.box.live .val { border-color: var(--accent); }
.box.old .val { background: var(--out); color: var(--out-ink); border-color: transparent; }
.box.touched .val { background: var(--mid); color: var(--mid-ink); border-color: var(--mid); }
.box.hit .val { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
.box.miss .val { border-color: var(--warn); color: var(--warn); border-width: 2px; }
.ghost .val { border: 1.5px dashed var(--warn); background: none; }
.ghost .idx { color: var(--warn); }
</style>
