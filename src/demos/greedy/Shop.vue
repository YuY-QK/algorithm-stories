<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import { SHAKE_MS } from '../../components/shared/timing';
import { useStageStop } from '../../components/shared/usePlayer';

// 小熊的小卖部：上面是「还要找多少」，中间是钱盒里的硬币，下面是找零盘。
// 看、玩法一、玩法二共用，只负责画，不管规则。
const props = withDefaults(defineProps<{
  /** 钱盒里的面值，从大到小 */
  coins: number[];
  /** 还要找多少 */
  left: number;
  /** 找零盘里的硬币 */
  plate: number[];
  /** 谁在找零 */
  who?: string;
  /** 正在看的那枚硬币 */
  focus?: number | null;
  /** 变暗的硬币（比剩下的大，跳过） */
  dim?: number[];
  /** 透光提示 */
  glow?: number | null;
  /** 一闪一闪的提示 */
  pulse?: number | null;
  /** 每次变化就让这枚硬币摇一下头，格式 [面值, 计数] */
  shake?: [number, number] | null;
  /** 每次变化就让找零盘晃一下 */
  shakePlate?: number;
  /** 第二个盘子（比如「最少的拿法」），和它的图标 */
  compare?: number[] | null;
  compareIcon?: string;
  clickable?: boolean;
}>(), {
  who: '🐻', focus: null, dim: () => [], glow: null, pulse: null, shake: null, shakePlate: 0,
  compare: null, compareIcon: '✨', clickable: false,
});

const emit = defineEmits<{ pick: [coin: number] }>();

const shaking = ref<number | null>(null);
const plateShake = ref(false);
let timers: ReturnType<typeof setTimeout>[] = [];
function stopShake() {
  timers.forEach(clearTimeout);
  timers = [];
  shaking.value = null;
  plateShake.value = false;
}
watch(() => props.shake, (v) => {
  if (!v) return;
  shaking.value = null;
  requestAnimationFrame(() => (shaking.value = v[0]));
  timers.push(setTimeout(() => (shaking.value = null), SHAKE_MS));
});

watch(() => props.shakePlate, () => {
  plateShake.value = false;
  requestAnimationFrame(() => (plateShake.value = true));
  timers.push(setTimeout(() => (plateShake.value = false), SHAKE_MS));
});
useStageStop(stopShake);
onBeforeUnmount(stopShake);
</script>

<template>
  <div class="shop">
    <div class="owe" :aria-label="'还要找 ' + left">
      <span class="who" aria-hidden="true">{{ who }}</span>
      <span class="owe-lab" aria-hidden="true">还要找</span>
      <span class="owe-n" :class="{ zero: left === 0 }" aria-hidden="true">{{ left === 0 ? '✅' : left }}</span>
    </div>

    <div class="drawer" :style="{ '--n': coins.length }">
      <button
        v-for="c in coins"
        :key="c"
        type="button"
        class="coin big"
        :class="{
          focus: focus === c,
          dim: dim.includes(c),
          glow: glow === c,
          pulse: pulse === c,
          shake: shaking === c,
        }"
        :disabled="!clickable"
        :aria-label="'面值 ' + c + ' 的硬币'"
        @click="emit('pick', c)"
      >{{ c }}</button>
    </div>

    <div class="plates">
      <div class="plate" :class="{ shake: plateShake }" :aria-label="'找零盘：' + (plate.length ? plate.join('、') + '，共 ' + plate.length + ' 枚' : '空的')">
        <span class="plate-icon" aria-hidden="true">{{ who }}</span>
        <TransitionGroup name="drop" tag="span" class="pile" aria-hidden="true">
          <span v-for="(c, k) in plate" :key="k + '-' + c" class="coin small">{{ c }}</span>
        </TransitionGroup>
        <span v-if="plate.length" class="cnt" aria-hidden="true">{{ plate.length }} 枚</span>
      </div>
      <div v-if="compare" class="plate best" :aria-label="'更少的拿法：' + compare.join('、') + '，共 ' + compare.length + ' 枚'">
        <span class="plate-icon" aria-hidden="true">{{ compareIcon }}</span>
        <span class="pile" aria-hidden="true">
          <span v-for="(c, k) in compare" :key="k" class="coin small">{{ c }}</span>
        </span>
        <span class="cnt" aria-hidden="true">{{ compare.length }} 枚</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shop { display: flex; flex-direction: column; gap: 14px; max-width: 560px; width: 100%; }
.owe { display: flex; align-items: center; gap: 10px; }
.who { font-size: clamp(2rem, 9vw, 2.6rem); line-height: 1; }
.owe-lab { color: var(--muted); font-size: 15px; }
.owe-n {
  font: 700 clamp(1.8rem, 8vw, 2.4rem) / 1 var(--mono); font-variant-numeric: tabular-nums;
  padding: 6px 14px; border-radius: 12px; background: var(--surface); border: 1.5px solid var(--line);
  min-width: 2.4em; text-align: center; transition: background 0.3s;
}
.owe-n.zero { background: var(--accent); border-color: var(--accent); }

.drawer { display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); gap: clamp(4px, 2vw, 12px); }
.coin {
  font-family: var(--mono); font-weight: 700; font-variant-numeric: tabular-nums;
  display: grid; place-items: center; border-radius: 50%;
  background: var(--mid); color: var(--mid-ink); border: 2px solid var(--mid-ink);
  box-shadow: inset 0 0 0 3px var(--mid), inset 0 0 0 5px var(--mid-ink);
}
.coin.big {
  width: 100%; max-width: 72px; aspect-ratio: 1; justify-self: center; padding: 0;
  font-size: clamp(14px, 4.6vw, 22px); cursor: pointer;
  transition: opacity 0.3s, transform 0.2s, filter 0.3s;
}
.coin.big:disabled { cursor: default; }
.coin.big:not(:disabled):hover { transform: translateY(-3px); }
.coin.big:focus-visible { outline: 2px solid var(--fg); outline-offset: 3px; }
.coin.focus { transform: translateY(-6px) scale(1.08); outline: 3px solid var(--accent); outline-offset: 3px; }
.coin.dim { opacity: 0.3; filter: grayscale(1); }
.coin.glow { animation: glow 0.9s ease-in-out 2; }
.coin.pulse { animation: pulse 1.2s ease-in-out infinite; }
.coin.shake { animation: shake 0.5s ease-in-out; }
.coin.small { width: 34px; height: 34px; font-size: 13px; box-shadow: inset 0 0 0 2px var(--mid), inset 0 0 0 3px var(--mid-ink); border-width: 1.5px; }

.plates { display: flex; flex-direction: column; gap: 10px; }
.plate {
  display: flex; align-items: center; gap: 10px; min-height: 58px; padding: 8px 12px;
  border-radius: 999px; border: 2px dashed var(--line); background: var(--surface);
}
.plate.best { border-style: solid; border-color: var(--accent); }
.plate.shake { animation: shake 0.5s ease-in-out; }
.plate-icon { font-size: 1.5rem; flex: none; }
.pile { display: flex; flex-wrap: wrap; gap: 4px; flex: 1; min-width: 0; }
.cnt { flex: none; font: 600 14px var(--mono); color: var(--muted); }

.drop-enter-active { transition: transform 0.35s ease-out, opacity 0.35s; }
.drop-enter-from { transform: translateY(-28px) scale(0.6); opacity: 0; }

@keyframes glow {
  50% { box-shadow: 0 0 0 4px var(--accent), 0 0 18px 6px var(--accent); transform: translateY(-4px); }
}
@keyframes pulse {
  50% { box-shadow: 0 0 0 5px var(--accent); }
}
@keyframes shake {
  20%, 60% { transform: translateX(-5px) rotate(-6deg); }
  40%, 80% { transform: translateX(5px) rotate(6deg); }
}
@media (prefers-reduced-motion: reduce) {
  .coin.glow, .coin.pulse, .coin.shake, .plate.shake { animation: none; outline: 3px solid var(--accent); outline-offset: 2px; }
  .drop-enter-active { transition: none; }
  .coin.focus { transform: none; }
}
</style>
