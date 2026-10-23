<script setup lang="ts">
import { computed, ref } from 'vue';
import { CODE, SYSTEMS, bestPicks, buildTrace } from '../../engine/greedy';
import CodePanel from '../../components/shared/CodePanel.vue';
import Segmented from '../../components/shared/Segmented.vue';
import Transport from '../../components/shared/Transport.vue';
import VarChips from '../../components/shared/VarChips.vue';
import { usePlayer } from '../../components/shared/usePlayer';
import CoinRow from './CoinRow.vue';

// 做：逐步执行。面值、剩余金额、每种拿了几枚和代码行同步。
const MAX = 200;
const sys = ref(SYSTEMS[0].id);
const coins = computed(() => SYSTEMS.find((s) => s.id === sys.value)!.coins);
const amount = ref(46);
const steps = computed(() => buildTrace(coins.value, amount.value));
const p = usePlayer(steps, [
  { label: '慢', ms: 1000 },
  { label: '中', ms: 550 },
  { label: '快', ms: 200 },
]);
const s = computed(() => p.step.value);

function onAmount(e: Event) {
  const v = parseInt((e.target as HTMLInputElement).value, 10);
  if (!isNaN(v) && v >= 0 && v <= MAX) amount.value = v;
}
function randomAmount() { amount.value = 10 + Math.floor(Math.random() * 90); }

const vars = computed<[string, string | number][]>(() => [
  ['amount', amount.value], ['c', s.value.c ?? '—'], ['left', s.value.left ?? '—'], ['picked', s.value.picked.length + ' 枚'],
]);

const summary = computed(() => {
  if (!s.value.done) return '';
  const g = s.value.picked.length;
  const b = bestPicks(coins.value, amount.value)!;
  return g === b.length
    ? '贪心用了 ' + g + ' 枚。动态规划算出的最少也是 ' + b.length + ' 枚，贪心拿到了最少。'
    : '贪心用了 ' + g + ' 枚，可是 ' + b.join(' + ') + ' 只要 ' + b.length + ' 枚：贪心失灵了。';
});
</script>

<template>
  <div class="controls">
    <Segmented v-model="sys" legend="面值" :options="SYSTEMS.map((x) => ({ value: x.id, label: x.label }))" />
    <div class="field">
      <label for="gr-amount">金额 amount（0～{{ MAX }}）</label>
      <input id="gr-amount" type="number" inputmode="numeric" min="0" :max="MAX" step="1" :value="amount" @input="onAmount">
    </div>
    <div class="field">
      <span class="lab">快速设置</span>
      <div class="inline">
        <button type="button" class="btn small" @click="randomAmount">随机金额</button>
        <button type="button" class="btn small" @click="sys = 'odd'; amount = 6">1·3·4 找 6</button>
      </div>
    </div>
  </div>

  <div class="stage">
    <CoinRow :coins="s.sorted.length ? s.sorted : coins" :c="s.c" :picked="s.picked" :unsorted="!s.sorted.length" />
    <VarChips :vars="vars" />
    <p class="note" aria-live="polite">第 {{ p.idx.value + 1 }}/{{ p.total.value }} 步：{{ s.note }}</p>
    <Transport :player="p">
      <button type="button" class="btn small" :disabled="p.atEnd.value" @click="p.jumpTo((x) => x.done)">跳到结果</button>
    </Transport>
    <p v-if="s.done" class="summary">{{ summary }}</p>
  </div>

  <CodePanel :lines="CODE" :active="s.line" lang="KOTLIN" />
</template>

<style scoped>
.note { overflow-wrap: anywhere; }
</style>
