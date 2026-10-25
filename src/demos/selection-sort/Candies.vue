<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import { CANDY_MAX } from '../../engine/selection-sort';
import { useStageStop } from '../../components/shared/usePlayer';
import { SHAKE_MS } from '../../components/shared/timing';

// 一排糖果加上方的小熊。看、玩法一、玩法二共用，只负责画，不管规则。
// 糖果的大小就是它的数字，各不相同，所以直接用数字当 key，交换时会滑过去换位置。
const props = withDefaults(defineProps<{
  values: number[];
  /** 前面几颗已经排好（放在盘子上） */
  sorted?: number;
  /** 小熊站在第几颗上方（从 0 开始），null 表示不出场 */
  bear?: number | null;
  /** 👀 正在看第几颗 */
  eye?: number | null;
  /** 透光提示 */
  glow?: number | null;
  /** 一闪一闪，直到被点 */
  pulse?: number | null;
  /** 糖果能不能点 */
  clickable?: boolean;
  /** 每次变化就让这颗摇一下，格式 [下标, 计数] */
  shake?: [number, number] | null;
}>(), { sorted: 0, bear: null, eye: null, glow: null, pulse: null, clickable: false, shake: null });

const emit = defineEmits<{ pick: [k: number] }>();

const shaking = ref<number | null>(null);
let shakeTimer: ReturnType<typeof setTimeout> | null = null;
function stopShake() {
  if (shakeTimer) clearTimeout(shakeTimer);
  shakeTimer = null;
  shaking.value = null;
}
watch(() => props.shake, (v) => {
  if (!v) return;
  stopShake();
  requestAnimationFrame(() => (shaking.value = v[0]));
  shakeTimer = setTimeout(() => (shaking.value = null), SHAKE_MS);
});
// 切换标签或卸载时，晃动动画停下
useStageStop(stopShake);
onBeforeUnmount(stopShake);

const left = (k: number) => 'calc(' + ((k + 0.5) / props.values.length) * 100 + '% - 0.6em)';
const scale = (v: number) => (0.42 + (0.58 * v) / CANDY_MAX).toFixed(3);
const hue = (v: number) => 'hue-rotate(' + ((v * 47) % 360) + 'deg)';

function label(k: number): string {
  return '第 ' + (k + 1) + ' 颗，' + props.values[k] + ' 号糖果' + (k < props.sorted ? '，已经排好' : '');
}
</script>

<template>
  <div class="shelf" :style="{ '--n': values.length }">
    <div class="lane" aria-hidden="true">
      <span v-if="bear !== null" class="who bear" :style="{ left: left(bear) }">🐻</span>
      <span v-if="eye !== null" class="who eye" :style="{ left: left(eye) }">👀</span>
    </div>
    <TransitionGroup tag="div" class="sweets" name="slide">
      <button
        v-for="(v, k) in values"
        :key="v"
        type="button"
        class="sweet"
        :class="{ plated: k < sorted, glow: glow === k, pulse: pulse === k, shake: shaking === k, held: bear === k }"
        :disabled="!clickable"
        :aria-label="label(k)"
        @click="emit('pick', k)"
      >
        <span class="candy" :style="{ '--s': scale(v), filter: hue(v) }">🍬</span>
        <span class="size">{{ v }}</span>
      </button>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.shelf { display: flex; flex-direction: column; gap: 2px; max-width: 520px; width: 100%; --u: clamp(34px, 11vw, 64px); }
.lane { position: relative; height: 1.3em; font-size: clamp(22px, 6vw, 32px); }
.who { position: absolute; bottom: 0; width: 1.2em; text-align: center; line-height: 1; transition: left 0.5s ease-in-out; }
.eye { font-size: 0.75em; bottom: 0.15em; }
.bear + .eye { z-index: 1; }
.sweets { display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); gap: clamp(2px, 1vw, 8px); }
.sweet {
  font: inherit; padding: 0 0 4px; min-width: 0; cursor: pointer; color: var(--fg);
  display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
  height: calc(var(--u) * 1.25 + 22px);
  border: 1.5px solid transparent; border-bottom: 4px solid var(--line); border-radius: 12px 12px 6px 6px;
  background: transparent;
  transition: border-color 0.3s, background 0.3s;
}
.sweet:disabled { cursor: default; }
.sweet:not(:disabled):hover { border-color: var(--line); }
.sweet:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
.candy { font-size: calc(var(--u) * var(--s)); line-height: 1; }
.size { font: 600 clamp(10px, 2.8vw, 13px) var(--mono); color: var(--muted); }
.sweet.plated { background: var(--out); border-bottom-color: var(--accent); }
.sweet.plated .size { color: var(--accent); }
.sweet.held { border-color: var(--mid); }
.sweet.glow { animation: glow 0.9s ease-in-out 2; }
.sweet.shake { animation: shake 0.5s ease-in-out; }
.sweet.pulse { animation: pulse 1.2s ease-in-out infinite; }
.slide-move { transition: transform 0.6s ease-in-out; }

@keyframes glow {
  50% { box-shadow: 0 0 0 4px var(--mid), 0 0 18px 6px var(--mid); transform: translateY(-4px); }
}
@keyframes pulse {
  50% { box-shadow: 0 0 0 4px var(--mid); }
}
@keyframes shake {
  20%, 60% { transform: translateX(-4px) rotate(-6deg); }
  40%, 80% { transform: translateX(4px) rotate(6deg); }
}
@media (prefers-reduced-motion: reduce) {
  .who, .slide-move { transition: none; }
  .sweet.glow, .sweet.pulse, .sweet.shake { animation: none; box-shadow: 0 0 0 3px var(--mid); }
}
</style>
