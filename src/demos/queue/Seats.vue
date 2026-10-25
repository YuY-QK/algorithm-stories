<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useStageStop } from '../../components/shared/usePlayer';
import { SHAKE_MS } from '../../components/shared/timing';

// 奶茶店的椅子：排成一排或者围成一圈（两种摆法之间有动画）。
// 看、玩法二、做的「逐步执行」共用，只负责画，不管规则。
const props = withDefaults(defineProps<{
  /** 每把椅子上坐着谁（emoji 或数字），null 是空椅子 */
  seats: (string | number | null)[];
  /** true：围成一圈；false：排成一排 */
  ring?: boolean;
  /** 椅子上方的小标签，比如「队头」「head」 */
  tags?: Record<number, string>;
  /** 队头：描粗边 */
  head?: number | null;
  /** 下一个空位（tail）：虚线边 */
  tail?: number | null;
  /** 这些椅子上的值已经不在队里了（做：出队后留在数组里的旧值） */
  stale?: number[];
  /** 正在读写的椅子 */
  touched?: number | null;
  /** 透光提示 */
  glow?: number[];
  /** 每次变化就让这把椅子晃一下，格式 [椅子, 计数] */
  shake?: [number, number] | null;
  /** 这把椅子上的人举手 🙋 */
  raise?: number | null;
  /** 圈中间显示的东西 */
  center?: string;
  /** 空椅子上显示什么 */
  empty?: string;
  clickable?: boolean;
  /** 每把椅子的读屏文字 */
  labels?: string[];
}>(), {
  ring: false, tags: () => ({}), head: null, tail: null, stale: () => [], touched: null, glow: () => [],
  shake: null, raise: null, center: '', empty: '', clickable: false, labels: () => [],
});

const emit = defineEmits<{ pick: [i: number] }>();

const n = computed(() => props.seats.length);

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

/** 圈的半径（占容器宽度的百分比） */
const R = 35;
function angle(i: number) {
  return ((-90 + (i * 360) / n.value) * Math.PI) / 180;
}
function pos(i: number) {
  if (!props.ring) return { left: ((i + 0.5) / n.value) * 100 + '%', top: '58%' };
  const a = angle(i);
  return { left: 50 + R * Math.cos(a) + '%', top: 50 + R * Math.sin(a) + '%' };
}
/** 两把椅子中间的小箭头，指向下一把 */
function arrow(i: number) {
  const a = angle(i + 0.5);
  return {
    left: 50 + R * Math.cos(a) + '%',
    top: 50 + R * Math.sin(a) + '%',
    transform: 'translate(-50%, -50%) rotate(' + ((a * 180) / Math.PI + 90) + 'deg)',
  };
}

const show = (v: string | number | null) => (v === null ? props.empty : String(v));
</script>

<template>
  <div class="seats" :class="{ round: ring }" :style="{ '--n': n }">
    <span v-for="i in n" :key="'a' + i" class="arrow" :style="arrow(i - 1)" aria-hidden="true">›</span>
    <span class="center" aria-hidden="true">{{ center }}</span>
    <button
      v-for="(v, i) in seats"
      :key="i"
      type="button"
      class="seat"
      :class="{
        taken: v !== null && !stale.includes(i),
        old: stale.includes(i),
        head: head === i,
        tail: tail === i,
        touched: touched === i,
        glow: glow.includes(i),
        shake: shaking === i,
      }"
      :style="pos(i)"
      :disabled="!clickable"
      :aria-label="labels[i] ?? (i + ' 号椅子')"
      @click="emit('pick', i)"
    >
      <span v-if="tags[i]" class="flag">{{ tags[i] }}</span>
      <span class="who">{{ show(v) }}</span>
      <span class="no">{{ i }}</span>
      <span v-if="raise === i" class="hand" aria-hidden="true">🙋</span>
    </button>
  </div>
</template>

<style scoped>
.seats {
  --s: calc(100cqi / var(--n) - 8px);
  container-type: inline-size;
  position: relative; width: 100%; max-width: 380px;
  aspect-ratio: var(--n) / 1.75;
}
.seats.round { --s: 17cqi; aspect-ratio: 1; }
.seat {
  position: absolute; width: var(--s); aspect-ratio: 1; transform: translate(-50%, -50%);
  font: inherit; padding: 0; cursor: pointer; min-width: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  border-radius: 28% 28% 14% 14%; border: 2px solid var(--line);
  background: var(--surface); color: var(--fg);
  transition: left 0.9s ease-in-out, top 0.9s ease-in-out, width 0.9s, background 0.3s, border-color 0.3s;
}
.seat:disabled { cursor: default; }
.seat:not(:disabled):hover { border-color: var(--accent); }
.seat:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
.who { font-size: calc(var(--s) * 0.48); line-height: 1.1; font-variant-numeric: tabular-nums; }
.no { font: 500 calc(var(--s) * 0.2) var(--mono); color: var(--muted); line-height: 1; }
.seat.taken { background: var(--bg); }
.seat.old .who { color: var(--out-ink); }
.seat.old { background: var(--out); border-color: transparent; }
.seat.head { border-color: var(--accent); border-width: 3px; }
.seat.tail { border-style: dashed; border-color: var(--mid); }
.seat.touched { background: var(--mid); border-color: var(--mid); }
.seat.touched .who, .seat.touched .no { color: var(--mid-ink); }
.flag {
  position: absolute; bottom: calc(100% + 2px); left: 50%; transform: translateX(-50%);
  font: 600 11px/1.2 var(--mono); white-space: nowrap; color: var(--fg);
  background: var(--surface); border-radius: 4px; padding: 0 3px;
}
.hand { position: absolute; top: -0.9em; right: -0.5em; font-size: calc(var(--s) * 0.38); animation: wave 0.6s ease-in-out infinite alternate; }
.arrow {
  position: absolute; font: 700 5cqi/1 var(--mono); color: var(--muted);
  opacity: 0; transition: opacity 0.6s 0.6s; pointer-events: none;
}
.round .arrow { opacity: 0.8; }
.center {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  font-size: 11cqi; opacity: 0; transition: opacity 0.6s 0.6s; white-space: nowrap;
}
.round .center { opacity: 1; }
.seat.glow { animation: glow 0.9s ease-in-out 2; }
.seat.shake { animation: shake 0.5s ease-in-out; }

@keyframes glow {
  50% { box-shadow: 0 0 0 4px var(--mid), 0 0 18px 6px var(--mid); }
}
@keyframes shake {
  20%, 60% { transform: translate(-50%, -50%) translateX(-4px) rotate(-5deg); }
  40%, 80% { transform: translate(-50%, -50%) translateX(4px) rotate(5deg); }
}
@keyframes wave {
  to { transform: translateY(-3px) rotate(12deg); }
}
@media (prefers-reduced-motion: reduce) {
  .seat, .arrow, .center { transition: none; }
  .seat.glow, .seat.shake, .hand { animation: none; }
  .seat.glow { box-shadow: 0 0 0 3px var(--mid); }
}
</style>
