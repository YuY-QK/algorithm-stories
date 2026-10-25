<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { callTree, flatten, memoCalls, naiveCalls, twinOf, ways, type CallNode } from '../../engine/dynamic-programming';
import { SHAKE_MS } from '../../components/shared/timing';
import { useStageStop } from '../../components/shared/usePlayer';
import CallTree from './CallTree.vue';

// 玩法二「便签有多省事」：不用便签，每个圆圈都要重新算一遍；孩子点出「前面已经算过」的圆圈，
// 它们贴上便签、下面整棵树变灰。引导：点错只摇一下并说原因，连续两次点错，数字相同的两个圆圈会闪光。
const START = 5;
const MAX = 6;
const BIG = [10, 20, 30, 50];

const n = ref(START);
const phase = ref<'tap' | 'explore'>('tap');
const found = ref<number[]>([]);
const misses = ref(0);
const glow = ref<number[]>([]);
const shakeId = ref<number | null>(null);
const say = ref('🐰 不用便签，每个圆圈都要重新算一遍。点点看：哪些圆圈的答案，前面已经算过了？');
let timers: ReturnType<typeof setTimeout>[] = [];
function clearTimers() {
  timers.forEach(clearTimeout);
  timers = [];
  shakeId.value = null;
}
useStageStop(clearTimers);
onBeforeUnmount(clearTimers);

const root = computed(() => callTree(n.value));
const lookups = computed(() => flatten(root.value).filter((x) => x.kind === 'lookup'));
const leaves = computed(() => ways(n.value));
const naive = computed(() => naiveCalls(n.value));
const memo = computed(() => memoCalls(n.value));
const fmt = (v: number) => v.toLocaleString('en-US');

function pick(node: CallNode) {
  if (phase.value !== 'tap') return;
  if (node.kind === 'lookup') {
    if (found.value.includes(node.id)) return;
    found.value = [...found.value, node.id];
    glow.value = [];
    misses.value = 0;
    if (found.value.length === lookups.value.length) {
      phase.value = 'explore';
      say.value = '🎉 贴了便签，灰色的圆圈都不用算了！' + naive.value + ' 次算成了 ' + memo.value + ' 次';
    } else {
      say.value = '📝 对！第 ' + node.n + ' 级前面算过了，直接抄便签。还有吗？';
    }
    return;
  }
  misses.value++;
  shakeId.value = null;
  requestAnimationFrame(() => (shakeId.value = node.id));
  timers.push(setTimeout(() => (shakeId.value = null), SHAKE_MS));
  say.value = node.kind === 'skipped'
    ? '🤔 它的上面还有圆圈没贴便签，先看上面'
    : node.n <= 1
      ? '🙂 第 ' + node.n + ' 级的答案本来就知道，不用算'
      : '🤔 第 ' + node.n + ' 级是第一次出现，还得算一算';
  if (misses.value >= 2) {
    const target = lookups.value.find((x) => !found.value.includes(x.id));
    if (target) {
      glow.value = [];
      const ids = [target.id, twinOf(root.value, target.id)];
      requestAnimationFrame(() => (glow.value = ids));
      say.value = '💡 看闪光的两个圆圈：数字一样！后面那个不用再算';
    }
  }
}

function higher() {
  if (n.value >= MAX) return;
  n.value++;
  say.value = '🪜 爬到第 ' + n.value + ' 级：不用便签 ' + naive.value + ' 次，用便签 ' + memo.value + ' 次';
}

function again() {
  n.value = START;
  phase.value = 'tap';
  found.value = [];
  misses.value = 0;
  glow.value = [];
  say.value = '🐰 再来一次：哪些圆圈的答案，前面已经算过了？';
}

const bar = (v: number) => Math.max(2, (v / naive.value) * 100) + '%';
</script>

<template>
  <div class="game">
    <p class="small-note">目标：不用便签，每个圆圈都要重新算一遍。找出所有「答案前面已经算过」的圆圈，给它们贴上便签。</p>
    <p class="say" aria-live="polite">{{ say }}</p>

    <div class="treewrap" :style="{ '--w': 'min(34px, calc((100vw - 56px) / ' + leaves + '))' }">
      <CallTree
        :node="root" :found="found" :reveal="phase === 'explore'" :glow="glow" :shake-id="shakeId"
        :clickable="phase === 'tap'" @pick="pick"
      />
    </div>

    <p v-if="phase === 'tap'" class="status" aria-live="polite">📝 找到 {{ found.length }} / {{ lookups.length }}</p>

    <template v-else>
      <div class="meter">
        <div class="mrow">
          <span class="who">🐢 不用便签</span>
          <div class="track"><div class="fill muted" :style="{ width: '100%' }" /></div>
          <span class="mn">{{ naive }} 次</span>
        </div>
        <div class="mrow">
          <span class="who">🚀 用便签</span>
          <div class="track"><div class="fill accent" :style="{ width: bar(memo) }" /></div>
          <span class="mn">{{ memo }} 次</span>
        </div>
      </div>
      <div class="row">
        <button type="button" class="btn primary" :disabled="n >= MAX" aria-label="再爬高一级" @click="higher">🪜 再爬高一级</button>
        <button type="button" class="btn" @click="again">🔁 再玩一次</button>
      </div>

      <div v-if="n >= MAX" class="result">
        <p><b>再高一点会怎样？</b>每高一级，不用便签的次数差不多翻一倍；用便签只多算一次。</p>
        <table class="big">
          <thead><tr><th>楼梯</th><th>🐢 不用便签</th><th>🚀 用便签</th></tr></thead>
          <tbody>
            <tr v-for="b in BIG" :key="b"><td>{{ b }} 级</td><td>{{ fmt(naiveCalls(b)) }} 次</td><td>{{ memoCalls(b) }} 次</td></tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<style scoped>
.game { display: flex; flex-direction: column; gap: 16px; }
.say { font-size: clamp(1.3rem, 5vw, 1.9rem); min-height: 2.6em; }
.treewrap { overflow-x: auto; padding: 4px 0 8px; display: flex; justify-content: center; }
.meter { display: flex; flex-direction: column; gap: 8px; max-width: 520px; }
.mrow { display: grid; grid-template-columns: 6.5em minmax(0, 1fr) 4.6em; gap: 8px; align-items: center; }
.who { font-size: 14px; }
.mn { font: 600 14px var(--mono); text-align: right; font-variant-numeric: tabular-nums; }
.big { border-collapse: collapse; width: 100%; font-size: 14px; }
.big th, .big td { text-align: right; padding: 6px 8px; border-bottom: 1.5px solid var(--line); font-variant-numeric: tabular-nums; }
.big th:first-child, .big td:first-child { text-align: left; }
.big td { font-family: var(--mono); }
</style>
