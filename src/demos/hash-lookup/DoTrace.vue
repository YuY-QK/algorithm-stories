<script setup lang="ts">
import { computed, ref } from 'vue';
import { buildTrace, clashKey, CODE, genTable, slotPiles, tableKey, type Op, type Slot } from '../../engine/hash-lookup';
import CodePanel from '../../components/shared/CodePanel.vue';
import Segmented from '../../components/shared/Segmented.vue';
import Transport from '../../components/shared/Transport.vue';
import VarChips from '../../components/shared/VarChips.vue';
import { usePlayer } from '../../components/shared/usePlayer';
import Shelves from './Shelves.vue';

// 做：逐步执行线性探测表上的 get、put、remove。桶、代码行和看过的桶数同步。
const table = ref<Slot[]>(genTable());
const op = ref<Op>('get');
const key = ref(tableKey(table.value));
const steps = computed(() => buildTrace(table.value, op.value, key.value));
const p = usePlayer(steps);
const s = computed(() => p.step.value);

function fresh() {
  table.value = genTable();
  key.value = tableKey(table.value);
}
function onKey(e: Event) {
  const v = parseInt((e.target as HTMLInputElement).value, 10);
  if (!isNaN(v)) key.value = v;
}

const vars = computed<[string, string | number][]>(() => [
  ['键', key.value], ['i', s.value.i ?? '—'], ['看过', s.value.looks + ' 个桶'],
  ['返回', s.value.result === null ? '—' : s.value.result === true ? 'true' : s.value.result === false ? 'false' : s.value.result],
]);
const summary = computed(() => {
  const x = s.value;
  if (!x.done) return '';
  if (op.value === 'get') return x.result === -1 ? '返回 -1：看了 ' + x.looks + ' 个桶，碰到空桶，断定没有 ' + key.value + '。' : '在 ' + x.result + ' 号桶找到 ' + key.value + '，看了 ' + x.looks + ' 个桶。';
  if (op.value === 'remove') return x.result ? '删掉了，那个桶现在是墓碑 ✕，不是空桶。' : '表里没有 ' + key.value + '，什么都没动。';
  return x.result ? '放好了。' : '表满了，放不下，返回 false。';
});
</script>

<template>
  <div class="controls">
    <Segmented
      v-model="op"
      legend="操作"
      :options="[{ value: 'get', label: '查 find' }, { value: 'put', label: '放 put' }, { value: 'remove', label: '删 remove' }]"
    />
    <div class="field">
      <label for="hl-key">键 key（整数，可以是负数）</label>
      <input id="hl-key" type="number" inputmode="numeric" step="1" :value="key" @input="onKey">
    </div>
    <div class="field">
      <span class="lab">快速设置</span>
      <div class="inline">
        <button type="button" class="btn small" @click="key = tableKey(table)">取表里的键</button>
        <button type="button" class="btn small" @click="key = clashKey(table)">取会撞的新键</button>
        <button type="button" class="btn small" @click="fresh">换一张表</button>
      </div>
    </div>
  </div>

  <div class="stage">
    <Shelves :piles="slotPiles(s.slots)" :keeper="s.i !== null && s.i >= 0 ? s.i : null" />
    <VarChips :vars="vars" />
    <p class="note" aria-live="polite">第 {{ p.idx.value + 1 }}/{{ p.total.value }} 步：{{ s.note }}</p>
    <Transport :player="p" />
    <p v-if="s.done" class="summary">{{ summary }}</p>
  </div>

  <CodePanel :lines="CODE" :active="s.line" lang="KOTLIN" />
</template>
