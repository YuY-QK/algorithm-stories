<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { buildTrace, CODE, genArray, missingValue } from '../../engine/binary-search';
import CodePanel from '../../components/shared/CodePanel.vue';
import Segmented from '../../components/shared/Segmented.vue';
import Transport from '../../components/shared/Transport.vue';
import VarChips from '../../components/shared/VarChips.vue';
import { usePlayer } from '../../components/shared/usePlayer';

// 高级：逐步执行。指针、代码行和比较次数同步。
const size = ref(16);
const arr = ref<number[]>(genArray(size.value));
const target = ref(pick());
const steps = computed(() => buildTrace(arr.value, target.value));
const p = usePlayer(steps, [
  { label: '慢', ms: 1100 },
  { label: '中', ms: 650 },
  { label: '快', ms: 280 },
]);

function pick() { return arr.value[Math.floor(Math.random() * arr.value.length)]; }
function freshArray() {
  arr.value = genArray(size.value);
  target.value = pick();
}
watch(size, freshArray);

function onTarget(e: Event) {
  const v = parseInt((e.target as HTMLInputElement).value, 10);
  if (!isNaN(v)) target.value = v;
}

const s = computed(() => p.step.value);

function tagFor(k: number) {
  const t: string[] = [];
  if (k === s.value.lo) t.push('lo');
  if (k === s.value.mid) t.push('mid');
  if (k === s.value.hi) t.push('hi');
  return t.join('·');
}

const vars = computed<[string, string | number][]>(() => [
  ['lo', s.value.lo], ['mid', s.value.mid ?? '—'], ['hi', s.value.hi], ['target', target.value], ['已检查', s.value.count + ' 个'],
]);

const summary = computed(() => {
  const st = s.value;
  if (!st.done) return '';
  return st.found >= 0
    ? '在下标 ' + st.found + ' 找到 ' + target.value + '。二分查找检查了 ' + st.count + ' 个元素，从头顺序查找要检查 ' + (st.found + 1) + ' 个。'
    : '数组里没有 ' + target.value + '。二分查找检查了 ' + st.count + ' 个元素，顺序查找要把 ' + arr.value.length + ' 个元素全部看一遍。';
});
</script>

<template>
  <div class="controls">
    <Segmented v-model="size" legend="数组大小" :options="[8, 16, 32].map((n) => ({ value: n, label: String(n) }))" />
    <div class="field">
      <label for="bs-target">目标值 target</label>
      <input id="bs-target" type="number" inputmode="numeric" step="1" :value="target" @input="onTarget">
    </div>
    <div class="field">
      <span class="lab">快速设置</span>
      <div class="inline">
        <button type="button" class="btn small" @click="target = pick()">取数组里的值</button>
        <button type="button" class="btn small" @click="target = missingValue(arr)">取不存在的值</button>
        <button type="button" class="btn small" @click="freshArray">新数组</button>
      </div>
    </div>
  </div>

  <div class="stage">
    <div class="arr" aria-hidden="true">
      <div
        v-for="(v, k) in arr"
        :key="k"
        class="cell"
        :class="{ out: k < s.lo || k > s.hi, mid: k === s.mid, found: k === s.found }"
      >
        <div class="tag">{{ tagFor(k) }}</div>
        <div class="val">{{ v }}</div>
        <div class="idx">{{ k }}</div>
      </div>
    </div>
    <VarChips :vars="vars" />
    <p class="note" aria-live="polite">第 {{ p.idx.value + 1 }}/{{ p.total.value }} 步：{{ s.note }}</p>
    <Transport :player="p" />
    <p v-if="s.done" class="summary">{{ summary }}</p>
  </div>

  <CodePanel :lines="CODE" :active="s.line" />
</template>

<style scoped>
.arr { display: grid; grid-template-columns: repeat(auto-fill, minmax(44px, 1fr)); gap: 10px 6px; }
.cell { display: flex; flex-direction: column; align-items: center; gap: 3px; min-width: 0; }
.val {
  width: 100%; height: 40px; display: grid; place-items: center;
  font: 600 14px var(--mono); font-variant-numeric: tabular-nums;
  border: 1.5px solid var(--line); border-radius: 6px; background: var(--bg); color: var(--fg);
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}
.cell.out .val { background: var(--out); color: var(--out-ink); border-color: transparent; }
.cell.mid .val { background: var(--mid); color: var(--mid-ink); border-color: var(--mid); }
.cell.found .val { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
</style>
