<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import type { Dir } from '../../engine/binary-search';
import { useStageStop } from '../../components/shared/usePlayer';
import { FLASH_MS, SHAKE_MS } from '../../components/shared/timing';
import { t } from '../../i18n/runtime';

// 信箱街：一排信箱加上方的小邮差。看、玩法一、玩法二共用，只负责画，不管规则。
const props = withDefaults(defineProps<{
  n: number;
  /** 还可能有信的范围，范围外的信箱变灰 */
  lo: number;
  hi: number;
  /** 小邮差站在第几个信箱上方，0 表示还在街口 */
  postman?: number;
  /** 已经打开的信箱门上显示的提示 */
  doors?: Record<number, Dir>;
  /** 信露出来的位置 */
  letter?: number | null;
  /** 盖着叶子的信箱 */
  covered?: number | null;
  /** 透光提示：信在这里。格式 [信箱, 计数]，计数变了就重播一遍 */
  glow?: [number, number] | null;
  /** 一闪一闪：小邮差的秘诀 */
  pulse?: number | null;
  /** 信箱能不能点 */
  clickable?: boolean;
  /** 每次变化就让这个信箱摇一下头，格式 [信箱, 计数] */
  shake?: [number, number] | null;
}>(), { postman: 0, doors: () => ({}), letter: null, covered: null, glow: null, pulse: null, clickable: false, shake: null });

const emit = defineEmits<{ pick: [i: number] }>();

const shaking = ref<number | null>(null);
let shakeTimer: ReturnType<typeof setTimeout> | null = null;
function stopShake() {
  if (shakeTimer) clearTimeout(shakeTimer);
  shakeTimer = null;
  shaking.value = null;
}

// 透光：先去掉再加回 class，动画才会重播
const glowing = ref<number | null>(null);
let glowTimer: ReturnType<typeof setTimeout> | null = null;
function stopGlow() {
  if (glowTimer) clearTimeout(glowTimer);
  glowTimer = null;
  glowing.value = null;
}
watch(() => props.glow, (v) => {
  stopGlow();
  if (!v) return;
  requestAnimationFrame(() => (glowing.value = v[0]));
  glowTimer = setTimeout(() => (glowing.value = null), FLASH_MS);
});
watch(() => props.shake, (v) => {
  if (!v) return;
  stopShake();
  requestAnimationFrame(() => (shaking.value = v[0]));
  shakeTimer = setTimeout(() => (shaking.value = null), SHAKE_MS);
});
// 切换标签或卸载时，晃动动画停下
useStageStop(() => {
  stopShake();
  stopGlow();
});
onBeforeUnmount(() => {
  stopShake();
  stopGlow();
});

const ICON: Record<Dir, string> = { left: '⬅️', right: '➡️', hit: '✉️' };

function door(i: number): string {
  if (props.covered === i) return '🍃';
  if (props.letter === i) return '✉️';
  const d = props.doors[i];
  return d ? ICON[d] : '';
}

function label(i: number): string {
  const d = props.doors[i];
  const box = t(d === 'left' ? 'street.boxLeft' : d === 'right' ? 'street.boxRight' : 'street.box', { i });
  return i < props.lo || i > props.hi ? t('street.out', { box }) : box;
}

const left = (p: number) => (p <= 0 ? '0%' : 'calc(' + ((p - 0.5) / props.n) * 100 + '% - 0.8em)');
</script>

<template>
  <div class="street" :style="{ '--n': n }">
    <div class="lane" aria-hidden="true">
      <span class="postman" :style="{ left: left(postman) }">🐰</span>
    </div>
    <div class="boxes">
      <button
        v-for="i in n"
        :key="i"
        type="button"
        class="box"
        :class="{
          out: i < lo || i > hi,
          open: !!doors[i],
          leaf: covered === i,
          glow: glowing === i,
          pulse: pulse === i,
          shake: shaking === i,
          here: postman === i,
        }"
        :disabled="!clickable"
        :aria-label="label(i)"
        @click="emit('pick', i)"
      >
        <span class="door">{{ door(i) }}</span>
        <span class="no">{{ i }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.street { display: flex; flex-direction: column; gap: 4px; max-width: 640px; width: 100%; }
.lane { position: relative; height: 1.4em; font-size: clamp(18px, 5vw, 28px); }
.postman {
  position: absolute; bottom: 0; width: 1.6em; text-align: center; line-height: 1;
  transition: left 0.6s ease-in-out;
}
.boxes { display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); gap: clamp(2px, 0.8vw, 6px); }
.box {
  font: inherit; padding: 0; cursor: pointer; min-width: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: space-between;
  height: clamp(56px, 14vw, 80px);
  border-radius: 10px 10px 4px 4px; border: 1.5px solid var(--line);
  background: var(--surface); color: var(--fg);
  transition: background 0.35s, border-color 0.35s, opacity 0.35s, transform 0.2s;
}
.box:disabled { cursor: default; }
.box:not(:disabled):hover { border-color: var(--accent); }
.box:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
.door { flex: 1; display: grid; place-items: center; font-size: clamp(12px, 3.6vw, 22px); line-height: 1; }
.no { font: 500 clamp(9px, 2.4vw, 12px) var(--mono); color: var(--muted); padding-bottom: 3px; }
.box.out { background: var(--out); border-color: transparent; opacity: 0.55; }
.box.out .no { color: var(--out-ink); }
.box.open { border-color: var(--mid); }
.box.here { border-color: var(--mid); background: var(--mid); }
.box.here .no { color: var(--mid-ink); }
.box.leaf { background: var(--accent); border-color: var(--accent); }
.box.leaf .no { color: var(--accent-ink); }
.box.glow { animation: glow 0.9s ease-in-out 2; }
.box.pulse { animation: pulse 1.2s ease-in-out infinite; }
.box.shake { animation: shake 0.5s ease-in-out; }

@keyframes glow {
  50% { box-shadow: 0 0 0 4px var(--mid), 0 0 18px 6px var(--mid); transform: translateY(-4px); }
}
@keyframes pulse {
  50% { box-shadow: 0 0 0 4px var(--accent); }
}
@keyframes shake {
  20%, 60% { transform: translateX(-4px) rotate(-4deg); }
  40%, 80% { transform: translateX(4px) rotate(4deg); }
}
/* 手机上 15 个信箱挤不下：街道伸到屏幕边缘、去掉间隙，每个信箱至少 24px 宽 */
@media (max-width: 480px) {
  .street { width: calc(100% + 2 * var(--bleed, 12px)); max-width: none; margin-inline: calc(-1 * var(--bleed, 12px)); }
  .boxes { gap: 0; }
  .box { border-radius: 8px 8px 3px 3px; }
}
@media (prefers-reduced-motion: reduce) {
  .postman { transition: none; }
  .box.glow, .box.pulse, .box.shake { animation: none; box-shadow: 0 0 0 3px var(--mid); }
}
</style>
