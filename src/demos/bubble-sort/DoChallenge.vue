<script setup lang="ts">
import { computed, ref } from 'vue';
import { buildTrace, genChallenge, inversions, isSorted } from '../../engine/bubble-sort';

// 做：挑战。只能交换相邻的两个数，用最少的次数排好。和冒泡排序的交换次数比一比。
const start = ref<number[]>([]);
const a = ref<number[]>([]);
const moves = ref(0);
const hist = ref<number[][]>([]);
const msg = ref('');

function fresh() {
  start.value = genChallenge();
  a.value = start.value.slice();
  moves.value = 0;
  hist.value = [];
  msg.value = '';
}
fresh();

const best = computed(() => inversions(start.value));
const bubbleSwaps = computed(() => buildTrace(start.value).at(-1)!.swaps);
const left = computed(() => inversions(a.value));
const done = computed(() => isSorted(a.value));

function swap(k: number) {
  if (done.value) return;
  hist.value.push(a.value.slice());
  const b = a.value.slice();
  const backwards = b[k] < b[k + 1];
  [b[k], b[k + 1]] = [b[k + 1], b[k]];
  a.value = b;
  moves.value++;
  msg.value = backwards ? b[k] + ' 本来就在 ' + b[k + 1] + ' 前面，这一下把顺序换反了，多了一个「前大后小」的数对。' : '';
}

function undo() {
  const h = hist.value.pop();
  if (!h) return;
  a.value = h;
  moves.value++;
  msg.value = '撤销也算一步：真实的交换做了就做了。';
}
</script>

<template>
  <div class="stage">
    <p>只能交换<b>相邻</b>的两个数（点它们中间的 ⇄），把下面的数从小到大排好。最少要换几次？</p>
    <div class="track-row">
      <template v-for="(v, k) in a" :key="k">
        <span class="box" :class="{ ok: done }">{{ v }}</span>
        <button v-if="k < a.length - 1" type="button" class="sw" :disabled="done" :aria-label="'交换 ' + v + ' 和 ' + a[k + 1]" @click="swap(k)">⇄</button>
      </template>
    </div>
    <div class="vars">
      <span class="chip"><small>你换了</small>{{ moves }} 次</span>
      <span class="chip"><small>还剩「前大后小」的数对</small>{{ left }} 个</span>
    </div>
    <p v-if="msg" class="small-note">{{ msg }}</p>
    <div class="inline">
      <button type="button" class="btn small" :disabled="!hist.length || done" @click="undo">撤销</button>
      <button type="button" class="btn small" @click="fresh">换一题</button>
    </div>
    <div v-if="done" class="result">
      <h3>{{ moves === best ? '🏅 ' + moves + ' 次排好，正好是最少！' : '排好了，用了 ' + moves + ' 次。最少只要 ' + best + ' 次，再试一题？' }}</h3>
      <p>冒泡排序在同样的起点上也正好换了 {{ bubbleSwaps }} 次。原来的序列里有 {{ best }} 个「前大后小」的数对（逆序对），每次相邻交换最多只能消掉一个，所以至少要换 {{ best }} 次；冒泡排序每次交换都恰好消掉一个，所以它的交换次数就是最少的。</p>
      <p class="small-note">慢的不是交换，是比较：冒泡为了找到这些逆序对，要比较很多次。</p>
      <button type="button" class="btn small" @click="fresh">再来一题</button>
    </div>
  </div>
</template>

<style scoped>
.track-row { display: flex; align-items: center; gap: 2px; max-width: 100%; }
.box {
  flex: 1 1 0; min-width: 0; max-width: 56px; height: 48px; display: grid; place-items: center;
  font: 700 18px var(--mono); border: 1.5px solid var(--line); border-radius: 8px; background: var(--bg);
}
.box.ok { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
.sw {
  flex: 0 0 auto; width: 26px; height: 34px; padding: 0; font: 600 15px var(--mono); cursor: pointer;
  border-radius: 6px; border: 1.5px solid var(--line); background: var(--surface); color: var(--fg);
}
.sw:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.sw:disabled { opacity: 0.35; cursor: default; }
.sw:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
.inline { display: flex; gap: 8px; flex-wrap: wrap; }
</style>
