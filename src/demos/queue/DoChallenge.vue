<script setup lang="ts">
import { computed, ref } from 'vue';
import { CHALLENGE_CAP, challenge, opText, simulate, type Op } from '../../engine/queue';
import Segmented from '../../components/shared/Segmented.vue';
import Cells from './Cells.vue';

// 做：挑战。不看动画，在脑子里跑完一串操作，预测数组每一格最后是什么、head 和 tail 在哪，
// 再和真正的循环队列比一比。关键：出队不会擦掉格子里的值。
const ops = ref<Op[]>(challenge());
/** 每一格的猜测：'' 表示「从没写过」 */
const guess = ref<string[]>([]);
const head = ref(0);
const tail = ref(0);
const shown = ref(false);

function fresh() {
  ops.value = challenge();
  guess.value = Array.from({ length: CHALLENGE_CAP }, () => '');
  head.value = 0;
  tail.value = 0;
  shown.value = false;
}
fresh();

const values = computed(() => ops.value.flatMap((o) => (o.kind === 'offer' ? [o.x] : [])));
const answer = computed(() => simulate(CHALLENGE_CAP, ops.value).ring);
const okCell = (k: number) => (guess.value[k] === '' ? null : Number(guess.value[k])) === answer.value.cells[k];
const score = computed(() => {
  let n = 0;
  for (let k = 0; k < CHALLENGE_CAP; k++) if (okCell(k)) n++;
  if (head.value === answer.value.head) n++;
  if (tail.value === answer.value.tail) n++;
  return n;
});
const full = CHALLENGE_CAP + 2;
const idxOptions = Array.from({ length: CHALLENGE_CAP }, (_, k) => ({ value: k, label: String(k) }));
</script>

<template>
  <div class="stage">
    <p>容量 {{ CHALLENGE_CAP }} 的循环队列，从空的开始，依次执行：</p>
    <ol class="ops" aria-label="操作序列">
      <li v-for="(o, k) in ops" :key="k">{{ opText(o) }}</li>
    </ol>
    <p>最后数组里每一格是什么？head、tail 在哪？出队的值会被擦掉吗？</p>
    <div class="guess" :style="{ '--n': CHALLENGE_CAP }">
      <label v-for="k in CHALLENGE_CAP" :key="k" class="slot">
        <span class="sr">{{ k - 1 }} 号格</span>
        <select v-model="guess[k - 1]" :disabled="shown" :class="{ good: shown && okCell(k - 1), bad: shown && !okCell(k - 1) }">
          <option value="">空</option>
          <option v-for="v in values" :key="v" :value="String(v)">{{ v }}</option>
        </select>
        <span class="idx" aria-hidden="true">{{ k - 1 }}</span>
      </label>
    </div>
    <div class="controls">
      <Segmented v-model="head" legend="head" :options="idxOptions" />
      <Segmented v-model="tail" legend="tail" :options="idxOptions" />
    </div>
    <div class="row">
      <button v-if="!shown" type="button" class="btn small primary" @click="shown = true">揭晓</button>
      <button type="button" class="btn small" @click="fresh">换一题</button>
    </div>
    <div v-if="shown" class="result">
      <h3>{{ score === full ? '🏅 全对，挑战成功！' : '对了 ' + score + ' / ' + full + ' 项' }}</h3>
      <p>真正的循环队列跑完是这样（灰色的是已经出队、但还留在格子里的旧值）：</p>
      <Cells :cells="answer.cells" :head="answer.head" :tail="answer.tail" :size="answer.size" />
      <p class="small-note">
        head = {{ answer.head }}<span :class="head === answer.head ? 'ok' : 'no'">{{ head === answer.head ? ' ✅' : '（你选了 ' + head + '）' }}</span>，
        tail = {{ answer.tail }}<span :class="tail === answer.tail ? 'ok' : 'no'">{{ tail === answer.tail ? ' ✅' : '（你选了 ' + tail + '）' }}</span>，
        队里还有 {{ answer.size }} 个。出队只是把 head 往前挪，格子里的值留着，等 tail 绕回来时再被覆盖。
      </p>
    </div>
  </div>
</template>

<style scoped>
.ops { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px; font: 500 13px var(--mono); }
.ops li { padding: 2px 8px; border-radius: 6px; border: 1.5px solid var(--line); background: var(--bg); }
.guess { display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); gap: 6px; max-width: calc(var(--n) * 64px); }
.slot { min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 3px; }
.slot select { width: 100%; min-width: 0; padding: 6px 2px; font: 600 14px var(--mono); text-align: center; }
.slot select.good { border-color: var(--accent); }
.slot select.bad { border-color: var(--warn); color: var(--warn); }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
.ok { color: var(--accent); }
.no { color: var(--warn); }
</style>
