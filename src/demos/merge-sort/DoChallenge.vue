<script setup lang="ts">
import { computed, ref } from 'vue';
import { CHALLENGE_N, compareBounds, mergeCompares, worstCase } from '../../engine/merge-sort';
import Segmented from '../../components/shared/Segmented.vue';

// 做：挑战。把 1 到 8 排成一队，让归并排序比较的次数尽量多（或尽量少）。
// 用引擎真的数一遍，和理论上的最多、最少比一比。
const N = CHALLENGE_N;
const bounds = compareBounds(N);
const mode = ref<'max' | 'min'>('max');
const line = ref<number[]>([]);
const tries = ref(0);
const peek = ref(false);

const full = computed(() => line.value.length === N);
const result = computed(() => (full.value ? mergeCompares(line.value) : null));
const target = computed(() => (mode.value === 'max' ? bounds.max : bounds.min));
const win = computed(() => result.value !== null && result.value.total === target.value);

function add(v: number) {
  if (full.value || line.value.includes(v)) return;
  line.value = [...line.value, v];
  if (line.value.length === N) tries.value++;
}
function undo() { line.value = line.value.slice(0, -1); }
function clear() { line.value = []; peek.value = false; }
function setMode() { clear(); tries.value = 0; }

const perfect = computed(() => worstCase(N));
function useAnswer() {
  peek.value = true;
  line.value = mode.value === 'max' ? [...perfect.value] : Array.from({ length: N }, (_, k) => k + 1);
}

const hint = computed(() => {
  if (full.value) return '';
  if (mode.value === 'min') return '想一想：合并时，如果一边的数全比另一边小，会怎么样？';
  if (tries.value >= 2) return '最后一次合并是左 4 个对右 4 个：想让谁也不先用完，两边的数就要大小交错。再往里想，左边那 4 个又是由 2 个对 2 个合并来的……';
  return '每次合并，两边谁先用完就不用再比了。怎么摆，才能让它们比到最后一刻？';
});
</script>

<template>
  <div class="stage">
    <div class="controls">
      <Segmented
        v-model="mode"
        legend="目标"
        :options="[{ value: 'max', label: '比得最多' }, { value: 'min', label: '比得最少' }]"
        @update:model-value="setMode"
      />
      <span class="chip"><small>{{ mode === 'max' ? '最多可能' : '最少可能' }}</small>{{ target }} 次</span>
    </div>
    <p class="note" aria-live="polite">把 1 到 {{ N }} 排成一队，让归并排序比较的次数{{ mode === 'max' ? '尽量多，最好达到最多' : '尽量少，最好达到最少' }}。{{ hint }}</p>

    <div class="slots" :style="{ '--n': N }" role="group" aria-label="你排的队">
      <span v-for="(_, k) in N" :key="k" class="slot" :class="{ on: k < line.length }">{{ line[k] ?? '' }}</span>
    </div>
    <div class="pool" :style="{ '--n': N }" role="group" aria-label="可选的数">
      <button
        v-for="v in N"
        :key="v"
        type="button"
        class="btn pick"
        :disabled="full || line.includes(v)"
        :aria-label="'放进 ' + v"
        @click="add(v)"
      >{{ v }}</button>
    </div>
    <div class="row">
      <button type="button" class="btn small" :disabled="!line.length" @click="undo">撤销</button>
      <button type="button" class="btn small" :disabled="!line.length" @click="clear">重排</button>
      <button v-if="tries >= 3 && !win" type="button" class="btn small" @click="useAnswer">看一种答案</button>
    </div>

    <div v-if="result" class="result">
      <h3>{{ win ? '🏅 达成！' : '🤔 比较了 ' + result.total + ' 次' }}</h3>
      <p>
        <b>[{{ line.join(', ') }}]</b> 比较了 <b>{{ result.total }}</b> 次。{{ N }} 个元素最少 {{ bounds.min }} 次，最多 {{ bounds.max }} 次。
        <template v-if="win">{{ mode === 'max' ? '每次合并都比到了最后一刻。' : '每次合并都是一边的数全比另一边小，比完一边就收工。' }}</template>
      </p>
      <ul class="merges">
        <li v-for="m in result.merges" :key="m.lo + '-' + m.hi">
          合并 [{{ m.lo }}, {{ m.hi }})：比 {{ m.compares }} 次
          <small>（最少 {{ Math.min(Math.floor((m.hi - m.lo) / 2), m.hi - m.lo - Math.floor((m.hi - m.lo) / 2)) }}，最多 {{ m.hi - m.lo - 1 }}）</small>
        </li>
      </ul>
      <p class="tip">合并两段 l 个和 r 个，比较次数最少 min(l, r)，最多 l + r - 1。{{ mode === 'min' ? '已经排好和完全倒序的数组都是最少 ' + bounds.min + ' 次：每次合并总有一边整个比另一边小。' : '最多的排法每一层都让两边交错。' }}</p>
      <div class="row">
        <button type="button" class="btn small primary" @click="clear">再排一次</button>
        <button v-if="!win && tries >= 3" type="button" class="btn small" @click="useAnswer">看一种答案</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.slots, .pool { display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); gap: 6px; max-width: calc(var(--n) * 56px); }
.slot {
  height: 42px; display: grid; place-items: center; box-sizing: border-box;
  border: 1.5px dashed var(--line); border-radius: 8px; font: 700 15px var(--mono);
}
.slot.on { border-style: solid; border-color: var(--accent); background: var(--bg); }
.btn.pick { padding: 8px 0; font: 700 15px var(--mono); text-align: center; min-width: 0; }
.merges { margin: 0; padding-left: 1.2em; display: flex; flex-direction: column; gap: 2px; font: 500 13px var(--mono); }
.merges small { color: var(--muted); font-size: 12px; }
.tip { overflow-wrap: anywhere; }
</style>
