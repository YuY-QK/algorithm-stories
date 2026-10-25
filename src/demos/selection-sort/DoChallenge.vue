<script setup lang="ts">
import { computed, ref } from 'vue';
import { genChallenge, inversions, isSorted, selectionSwaps, swapAt } from '../../engine/selection-sort';

// 做：挑战。点两格交换，用最少的交换次数排好，和选择排序比一比。
// 元素互不相同时，选择排序的交换次数就是最少的（见引擎 fewestSwaps 的说明），所以打平就是满分。
const start = ref<number[]>([]);
const a = ref<number[]>([]);
const sel = ref<number | null>(null);
const moves = ref(0);
const lastSwap = ref<[number, number] | null>(null);

function fresh() {
  start.value = genChallenge();
  retry();
}
function retry() {
  a.value = start.value.slice();
  sel.value = null;
  moves.value = 0;
  lastSwap.value = null;
}
fresh();

const done = computed(() => isSorted(a.value));
const best = computed(() => selectionSwaps(start.value));
const bubble = computed(() => inversions(start.value));

function tap(k: number) {
  if (done.value) return;
  if (sel.value === null) {
    sel.value = k;
    return;
  }
  if (sel.value === k) {
    sel.value = null;
    return;
  }
  a.value = swapAt(a.value, sel.value, k);
  lastSwap.value = [sel.value, k];
  sel.value = null;
  moves.value++;
}
</script>

<template>
  <div class="stage">
    <p>点两格就交换它们。用尽量少的交换，把数组从小到大排好。排完再和选择排序比一比：你能和它换得一样少吗？</p>
    <div class="arr">
      <button
        v-for="(v, k) in a"
        :key="k"
        type="button"
        class="cell"
        :class="{ picked: sel === k, moved: !!lastSwap && lastSwap.includes(k), settled: done }"
        :disabled="done"
        :aria-label="'下标 ' + k + '，值 ' + v + (sel === k ? '，已选中' : '')"
        :aria-pressed="sel === k"
        @click="tap(k)"
      >
        <span class="val">{{ v }}</span>
        <span class="idx">{{ k }}</span>
      </button>
    </div>
    <div class="vars">
      <span class="chip"><small>你交换了</small>{{ moves }} 次</span>
    </div>
    <div class="row">
      <button type="button" class="btn small" :disabled="moves === 0 || done" @click="retry">重来这一局</button>
    </div>
    <div v-if="done" class="result">
      <h3 v-if="moves <= best">🏅 {{ moves }} 次排好，和选择排序一样少！</h3>
      <h3 v-else>排好了！你换了 {{ moves }} 次，选择排序只要 {{ best }} 次。</h3>
      <p>选择排序每次交换都把一个数直接送到它最终的位置，送到就不再动，所以元素各不相同时，它的交换次数正好是最少的。同一组数，冒泡排序一次只换相邻两个，要换 {{ bubble }} 次。</p>
      <div class="row">
        <button v-if="moves > best" type="button" class="btn small" @click="retry">再试这一组</button>
        <button type="button" class="btn small primary" @click="fresh">换一组</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.arr { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 8px; max-width: 420px; }
.cell { font: inherit; background: none; border: 0; padding: 0; display: flex; flex-direction: column; align-items: center; gap: 3px; min-width: 0; color: var(--fg); cursor: pointer; }
.cell:disabled { cursor: default; }
.cell:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; border-radius: 8px; }
.val {
  width: 100%; height: 48px; display: grid; place-items: center;
  font: 600 18px var(--mono); border: 1.5px solid var(--line); border-radius: 8px; background: var(--bg);
  transition: background 0.2s, color 0.2s, border-color 0.2s, transform 0.2s;
}
.cell:not(:disabled):hover .val { border-color: var(--accent); }
.cell.picked .val { background: var(--mid); color: var(--mid-ink); border-color: var(--mid); transform: translateY(-4px); }
.cell.moved .val { border-color: var(--mid); }
.cell.settled .val { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
</style>
