<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import { PLATE_ICONS, PLATE_NAMES } from '../../engine/stack';
import { useStageStop } from '../../components/shared/usePlayer';
import { SHAKE_MS } from '../../components/shared/timing';

// 一摞盘子加「拿走的」一排。看、玩法一共用，只负责画，不管规则。
const props = withDefaults(defineProps<{
  /** 叠着的盘子编号，最后一个在最上面 */
  stack: number[];
  /** 已经拿走的盘子，按先后 */
  taken: number[];
  /** 盘子能不能点 */
  clickable?: boolean;
  /** 透光提示：最上面那个 */
  glowTop?: boolean;
  /** 每次变化就让这个盘子晃一下，格式 [盘子, 计数] */
  shake?: [number, number] | null;
  /** 一摞最多几个，用来固定高度 */
  room?: number;
  /** 小熊手里端着的盘子（马上要放上去） */
  holding?: number | null;
}>(), { clickable: false, glowTop: false, shake: null, room: 5, holding: null });

const emit = defineEmits<{ pick: [plate: number] }>();

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
useStageStop(stopShake);
onBeforeUnmount(stopShake);

function label(p: number, k: number) {
  const top = k === props.stack.length - 1;
  return PLATE_NAMES[p] + '盘' + (top ? '，在最上面' : '，上面压着 ' + (props.stack.length - 1 - k) + ' 个盘子');
}
</script>

<template>
  <div class="scene" :style="{ '--room': room }">
    <div class="side">
      <div class="hand" aria-hidden="true">
        <span class="bear">🐻</span>
        <span v-if="holding !== null" class="dish mini" :class="'c' + (holding % 4)">{{ PLATE_ICONS[holding] }}</span>
      </div>
      <TransitionGroup tag="div" name="dish" class="pile">
        <button
          v-for="(p, k) in stack"
          :key="p"
          type="button"
          class="dish"
          :class="['c' + (p % 4), { top: k === stack.length - 1, glow: glowTop && k === stack.length - 1, shake: shaking === p }]"
          :disabled="!clickable"
          :aria-label="label(p, k)"
          @click="emit('pick', p)"
        >{{ PLATE_ICONS[p] }}</button>
      </TransitionGroup>
      <div class="table" aria-hidden="true" />
    </div>
    <div class="side">
      <p class="cap">拿走的</p>
      <TransitionGroup tag="ol" name="pop" class="taken" aria-label="拿走的顺序">
        <li v-for="(p, k) in taken" :key="p" :aria-label="'第 ' + (k + 1) + ' 个拿走：' + PLATE_NAMES[p] + '盘'">
          <span class="dish mini" :class="'c' + (p % 4)">{{ PLATE_ICONS[p] }}</span>
          <small>{{ k + 1 }}</small>
        </li>
      </TransitionGroup>
    </div>
  </div>
</template>

<style scoped>
.scene { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16px; max-width: 560px; width: 100%; align-items: end; }
.side { display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 0; }
.hand { height: 2.4rem; display: flex; align-items: center; gap: 6px; font-size: 1.8rem; line-height: 1; }
.pile {
  display: flex; flex-direction: column-reverse; align-items: center; justify-content: flex-start;
  min-height: calc(var(--room) * 38px + 8px); width: 100%;
}
.dish {
  font: inherit; cursor: pointer; padding: 0; margin-top: -4px;
  width: min(150px, 100%); height: 38px; display: grid; place-items: center;
  font-size: 1.25rem; line-height: 1; color: var(--fg);
  border-radius: 50% / 46%; border: 2px solid var(--line); border-bottom-width: 7px;
  background: var(--surface);
  transition: transform 0.2s, box-shadow 0.2s;
}
.dish:disabled { cursor: default; }
.dish:not(:disabled):hover { transform: translateY(-2px); }
.dish:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
.dish.c0 { border-color: var(--accent); }
.dish.c1 { border-color: var(--mid); }
.dish.c2 { border-color: var(--warn); }
.dish.c3 { border-color: var(--muted); }
.dish.mini { width: 46px; height: 28px; font-size: 0.95rem; border-bottom-width: 5px; margin: 0; cursor: default; }
.table { width: 100%; max-width: 190px; height: 8px; border-radius: 4px; background: var(--line); }
.cap { font-size: 13px; color: var(--muted); height: 2.4rem; display: flex; align-items: flex-end; }
.taken {
  list-style: none; margin: 0; padding: 0; width: 100%;
  display: flex; flex-wrap: wrap; justify-content: center; align-content: flex-end; gap: 8px 6px;
  min-height: calc(var(--room) * 38px + 16px);
}
.taken li { display: flex; flex-direction: column; align-items: center; gap: 0; }
.taken small { font: 500 11px var(--mono); color: var(--muted); }

.dish.glow { animation: glow 0.9s ease-in-out 2; }
.dish.shake { animation: shake 0.5s ease-in-out; }
@keyframes glow {
  50% { box-shadow: 0 0 0 4px var(--mid), 0 0 18px 6px var(--mid); transform: translateY(-6px); }
}
@keyframes shake {
  20%, 60% { transform: translateX(-5px) rotate(-4deg); }
  40%, 80% { transform: translateX(5px) rotate(4deg); }
}
.dish-enter-active, .dish-leave-active, .pop-enter-active { transition: transform 0.45s ease, opacity 0.45s ease; }
.dish-enter-from { transform: translateY(-60px); opacity: 0; }
.dish-leave-to { transform: translate(60px, -50px); opacity: 0; }
.pop-enter-from { transform: translateY(-20px) scale(0.6); opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .dish.glow, .dish.shake { animation: none; box-shadow: 0 0 0 3px var(--mid); }
  .dish-enter-active, .dish-leave-active, .pop-enter-active { transition: none; }
}
</style>
