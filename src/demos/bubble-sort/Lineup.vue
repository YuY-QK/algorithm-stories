<script setup lang="ts">
import { ref, watch } from 'vue';
import { KID_MAX_H, KID_MIN_H, type Kid } from '../../engine/bubble-sort';

// 排队的小伙伴：一排站着的小动物，高矮按身高画。看、玩法一、玩法二共用，只负责画，不管规则。
// 换位置时用 TransitionGroup 让两人真的走过去。
const props = withDefaults(defineProps<{
  line: Kid[];
  /** 摄影师正在看的一对（左边下标），没有是 null */
  pair?: number | null;
  /** 从这个下标开始已经站好（⭐） */
  fixedFrom?: number;
  /** 透光提示的小伙伴 id */
  glow?: string | null;
  /** 每次变化就让这个小伙伴摇一下，格式 [id, 计数] */
  shake?: [string, number] | null;
  /** 能不能点 */
  clickable?: boolean;
  /** 拍照：闪一下 */
  photo?: boolean;
}>(), { pair: null, fixedFrom: Infinity, glow: null, shake: null, clickable: false, photo: false });

const emit = defineEmits<{ pick: [index: number, kid: Kid] }>();

const shaking = ref<string | null>(null);
watch(() => props.shake, (v) => {
  if (!v) return;
  shaking.value = null;
  requestAnimationFrame(() => (shaking.value = v[0]));
  setTimeout(() => (shaking.value = null), 600);
});

const frac = (h: number) => (h - KID_MIN_H) / (KID_MAX_H - KID_MIN_H);

function label(k: number, kid: Kid): string {
  return kid.name + '，' + kid.h + ' 厘米' + (k >= props.fixedFrom ? '，已经站好' : '');
}
</script>

<template>
  <div class="lineup" :class="{ flash: photo }" :style="{ '--n': line.length }">
    <div class="eyes" aria-hidden="true">
      <span v-if="pair !== null" class="cam" :style="{ left: ((pair + 1) / line.length) * 100 + '%' }">👀</span>
    </div>
    <TransitionGroup tag="div" name="kid" class="crowd">
      <button
        v-for="(kid, k) in line"
        :key="kid.id"
        type="button"
        class="pal"
        :class="{
          look: pair !== null && (k === pair || k === pair + 1),
          fixed: k >= fixedFrom,
          glow: glow === kid.id,
          shake: shaking === kid.id,
        }"
        :disabled="!clickable"
        :aria-label="label(k, kid)"
        @click="emit('pick', k, kid)"
      >
        <span class="star" aria-hidden="true">{{ k >= fixedFrom ? '⭐' : '' }}</span>
        <span class="face" aria-hidden="true">{{ kid.face }}</span>
        <span class="torso" :style="{ '--f': frac(kid.h) }" aria-hidden="true" />
        <span class="cm" aria-hidden="true">{{ kid.h }}</span>
      </button>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.lineup { position: relative; max-width: 560px; width: 100%; display: flex; flex-direction: column; gap: 2px; }
.eyes { position: relative; height: 1.5em; font-size: clamp(18px, 5vw, 26px); }
.cam { position: absolute; bottom: 0; transform: translateX(-50%); line-height: 1; transition: left 0.5s ease-in-out; }
.crowd {
  display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); gap: clamp(4px, 1.6vw, 12px);
  align-items: end; border-bottom: 2px solid var(--line); padding: 0 2px;
}
.pal {
  font: inherit; color: var(--fg); background: none; border: 0; padding: 4px 0 2px; margin: 0; min-width: 0;
  display: flex; flex-direction: column; align-items: center; gap: 2px; cursor: pointer; border-radius: 12px 12px 0 0;
}
.pal:disabled { cursor: default; }
.pal:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
.pal:not(:disabled):hover .torso { border-color: var(--accent); }
.star { height: 1.2em; font-size: clamp(12px, 3.4vw, 18px); line-height: 1.2; }
.face { font-size: clamp(26px, 8vw, 42px); line-height: 1; }
.torso {
  display: block; width: 72%; max-width: 54px; border-radius: 14px 14px 4px 4px;
  height: calc(var(--f) * clamp(70px, 26vw, 130px) + 26px);
  background: var(--surface); border: 1.5px solid var(--line);
  transition: background 0.3s, border-color 0.3s;
}
.cm { font: 600 clamp(10px, 2.8vw, 13px) var(--mono); font-variant-numeric: tabular-nums; color: var(--muted); }
.pal.look { background: color-mix(in srgb, var(--mid) 22%, transparent); }
.pal.look .torso { background: var(--mid); border-color: var(--mid); }
.pal.fixed .torso { background: var(--accent); border-color: var(--accent); }
.pal.fixed .cm { color: var(--accent); }
.pal.glow { animation: glow 0.9s ease-in-out 2; }
.pal.shake { animation: shake 0.5s ease-in-out; }
.lineup.flash::after {
  content: ""; position: absolute; inset: 0; border-radius: 12px; background: var(--surface);
  pointer-events: none; animation: flash 0.7s ease-out forwards;
}

.kid-move { transition: transform 0.5s ease-in-out; }

@keyframes glow {
  50% { box-shadow: 0 0 0 3px var(--mid), 0 0 18px 6px var(--mid); transform: translateY(-6px); }
}
@keyframes shake {
  20%, 60% { transform: translateX(-4px) rotate(-4deg); }
  40%, 80% { transform: translateX(4px) rotate(4deg); }
}
@keyframes flash {
  from { opacity: 0.9; }
  to { opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .kid-move, .cam { transition: none; }
  .pal.glow, .pal.shake { animation: none; box-shadow: 0 0 0 3px var(--mid); }
  .lineup.flash::after { animation: none; opacity: 0; }
}
</style>
