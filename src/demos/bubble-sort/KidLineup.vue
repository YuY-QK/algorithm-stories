<script setup lang="ts">
import { computed, ref } from 'vue';
import { KID_NAMES, kidHeights, kidInit, kidStep, type KidChoice, type KidState } from '../../engine/bubble-sort';

// 初级：排队拍合照。每次只看相邻两个人，左边高就换。
const KN = 5, MINH = 100, MAXH = 150;

interface Person { name: string; h: number }
const heightOf = (p: Person) => p.h;

const newGroup = () => kidInit(kidHeights(KN).map((h, k) => ({ name: KID_NAMES[k], h })));
const s = ref<KidState<Person>>(newGroup());
const hist = ref<KidState<Person>[]>([]);
const oops = ref('');

const pair = computed(() => [s.value.a[s.value.j], s.value.a[s.value.j + 1]] as const);
/** 刚走完一轮时，冒到最终位置的那个人 */
const justSettled = computed(() => (s.value.roundEnd && !s.value.done ? s.value.a[s.value.end] : null));

function kidClass(k: number) {
  const { done, end, j } = s.value;
  if (done || k >= end) return 'done';
  return k === j || k === j + 1 ? 'pair' : '';
}
const bodyHeight = (h: number) => Math.round(((h - MINH) / (MAXH - MINH)) * 140 + 30) + 'px';

function answer(ans: KidChoice) {
  const next = kidStep(s.value, ans, heightOf);
  if (!next) {
    const [L, R] = pair.value;
    oops.value = ans === 'swap'
      ? L.name + ' ' + L.h + ' 厘米，比 ' + R.name + ' 的 ' + R.h + ' 厘米矮，不用换哦。'
      : L.name + ' ' + L.h + ' 厘米，比 ' + R.name + ' 的 ' + R.h + ' 厘米高，要换一下。';
    return;
  }
  hist.value.push(s.value);
  s.value = next;
  oops.value = '';
}

function undo() {
  const h = hist.value.pop();
  if (h) { s.value = h; oops.value = ''; }
}

function restart() {
  s.value = newGroup();
  hist.value = [];
  oops.value = '';
}
</script>

<template>
  <div>
    <div class="lineup" aria-hidden="true">
      <div v-for="(p, k) in s.a" :key="p.name" class="kid" :class="kidClass(k)">
        <div class="body" :style="{ height: bodyHeight(p.h) }" />
        <div class="h">{{ p.h }}</div>
      </div>
    </div>
    <div class="kidnames" aria-hidden="true">
      <div v-for="p in s.a" :key="p.name" class="nm">{{ p.name }}</div>
    </div>
  </div>
  <div class="ask">
    <p class="say" aria-live="polite">
      <template v-if="s.done">排好啦，可以<b>拍照</b>了！</template>
      <template v-else-if="justSettled">
        第 {{ s.round - 1 }} 轮结束：<b>{{ justSettled.name }}</b> 冒到了位置上！<br>
        接着看 <b>{{ pair[0].name }}</b> 和 <b>{{ pair[1].name }}</b>，要换吗？
      </template>
      <template v-else><b>{{ pair[0].name }}</b> 和 <b>{{ pair[1].name }}</b>，要不要换位置？</template>
    </p>
    <div class="answers">
      <button type="button" class="btn primary" :disabled="s.done" @click="answer('swap')">左边高，换位置</button>
      <button type="button" class="btn" :disabled="s.done" @click="answer('keep')">左边矮，不用换</button>
    </div>
    <p class="oops" aria-live="polite">{{ oops }}</p>
    <p class="status">
      <template v-if="s.done">一共比了 {{ s.compares }} 次，换了 {{ s.swaps }} 次</template>
      <template v-else>第 {{ s.round }} 轮 · 已经比了 {{ s.compares }} 次，换了 {{ s.swaps }} 次</template>
    </p>
    <div class="row">
      <button type="button" class="link" :disabled="hist.length === 0" @click="undo">撤销上一步</button>
      <button type="button" class="link" @click="restart">换一组小朋友</button>
    </div>
  </div>
  <div v-if="s.done" class="result">
    <h3>你帮摄影师比了 {{ s.compares }} 次、换了 {{ s.swaps }} 次，大家从矮到高站好了。</h3>
    <p>每走一轮，剩下的人里最高的那个就会一路被换到最右边，像水里的气泡冒到水面，所以叫「冒泡排序」。</p>
    <p class="tip">如果有一轮一次都没换，说明大家已经排好了，摄影师叔叔就可以提前拍照。</p>
    <button type="button" class="btn primary" @click="restart">再排一组</button>
  </div>
</template>

<style scoped>
.lineup { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; align-items: end; max-width: 520px; height: 230px; padding: 0 4px; border-bottom: 2px solid var(--line); }
.kid { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; gap: 6px; min-width: 0; }
.kid .body {
  width: 100%; max-width: 64px; border-radius: 28px 28px 8px 8px; position: relative;
  background: var(--surface); border: 1.5px solid var(--line);
  transition: height 0.3s, background 0.25s, border-color 0.25s;
}
.kid .body::before {
  content: ""; position: absolute; left: 50%; top: -30px; width: 26px; height: 26px; margin-left: -13px;
  border-radius: 50%; background: inherit; border: inherit;
}
.kid .h { font: 600 13px var(--mono); font-variant-numeric: tabular-nums; }
.kid.pair .body { background: var(--mid); border-color: var(--mid); }
.kid.done .body { background: var(--accent); border-color: var(--accent); }
.kidnames { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; max-width: 520px; padding: 0 4px; text-align: center; }
.nm { font-size: 13px; color: var(--muted); white-space: nowrap; }
.say { font-size: 1.6rem; line-height: 1.35; }
.answers .btn { flex: 1 1 160px; }
</style>
