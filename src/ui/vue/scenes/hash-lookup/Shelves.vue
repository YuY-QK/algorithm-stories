<script setup lang="ts">
import { ref, watch } from 'vue';
import { m } from '../../../../core/i18n';
import { SHAKE_MS } from '../../../../core/timing';
import type { Msg } from '../../../../core/types';
import { TOMB, type Pile } from '../../../../engine/hash-lookup';
import { useStageStop } from '../../../../components/shared/usePlayer';

// 一排书架（桶）：每个书架上叠着书，管理员站在某个书架前。画面只管画，规则都在引擎里。
const props = withDefaults(defineProps<{
  piles: Pile[];
  keeper?: number | null;
  /** 亮起：找到的书架 */
  hit?: number | null;
  /** 透光提示 */
  glow?: number | null;
  /** 撞了的书架（摇晃） */
  clash?: number | null;
  /** 确认没有书的空书架 */
  miss?: number | null;
  /** 点错的书架：[下标, 第几次]，晃一下 */
  shake?: [number, number] | null;
  /** 点选中（描边） */
  picked?: number | null;
  clickable?: boolean;
  t: (msg: Msg) => string;
}>(), { keeper: null, hit: null, glow: null, clash: null, miss: null, shake: null, picked: null, clickable: false });

const emit = defineEmits<{ pick: [i: number] }>();

const shaking = ref<number | null>(null);
let timer: ReturnType<typeof setTimeout> | null = null;
function stopShake() {
  if (timer) clearTimeout(timer);
  timer = null;
  shaking.value = null;
}
watch(() => props.shake, (v) => {
  if (!v) return;
  stopShake();
  requestAnimationFrame(() => (shaking.value = v[0]));
  timer = setTimeout(() => (shaking.value = null), SHAKE_MS);
});
useStageStop(stopShake);

function label(i: number): string {
  const p = props.piles[i];
  const what = p.length === 0 ? props.t(m('scene.empty')) : p.map((b) => (b === TOMB ? props.t(m('scene.tomb')) : String(b))).join(props.t(m('scene.sep')));
  return props.t(m('scene.shelf', { i, what }));
}
</script>

<template>
  <div class="shelves" :style="{ '--n': piles.length }">
    <button
      v-for="(pile, i) in piles"
      :key="i"
      type="button"
      class="shelf"
      :class="{ here: keeper === i, hit: hit === i, glow: glow === i, clash: clash === i, miss: miss === i, shake: shaking === i, picked: picked === i }"
      :disabled="!clickable"
      :aria-label="label(i)"
      @click="emit('pick', i)"
    >
      <span class="who" aria-hidden="true">{{ keeper === i ? '🧑‍🏫' : '' }}</span>
      <span class="stack" aria-hidden="true">
        <span v-for="(b, k) in pile" :key="k" class="bk" :class="{ tomb: b === TOMB }">{{ b === TOMB ? '✕' : b }}</span>
      </span>
      <span class="board" aria-hidden="true" />
      <span class="idx" aria-hidden="true">{{ i }}</span>
    </button>
  </div>
</template>

<style scoped>
.shelves { display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); gap: 6px; }
.shelf {
  font: inherit; color: var(--fg); background: none; border: 0; padding: 0; min-width: 0;
  display: flex; flex-direction: column; align-items: center; gap: 3px; cursor: pointer;
}
.shelf:disabled { cursor: default; }
.shelf:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; border-radius: 6px; }
.who { height: 1.6em; font-size: 1.3rem; line-height: 1.6em; }
.stack {
  width: 100%; min-height: 112px; display: flex; flex-direction: column-reverse; justify-content: flex-start; gap: 3px;
  padding: 3px; box-sizing: border-box; border: 1.5px solid var(--line); border-radius: 6px 6px 0 0; background: var(--inset);
  transition: background 0.2s, border-color 0.2s;
}
.bk {
  display: grid; place-items: center; height: 24px; border-radius: 3px;
  background: var(--surface); border: 1.5px solid var(--line); font: 600 12px var(--mono); font-variant-numeric: tabular-nums;
}
.bk.tomb { border-style: dashed; color: var(--out-ink); background: var(--out); }
.board { width: 100%; height: 5px; border-radius: 2px; background: var(--line); }
.idx { font: 600 12px var(--mono); color: var(--muted); }
.shelf:not(:disabled):hover .stack { border-color: var(--accent); }
.shelf.here .stack { border-color: var(--accent); }
.shelf.here .idx { color: var(--accent); }
.shelf.hit .stack { background: var(--accent); border-color: var(--accent); }
.shelf.hit .bk { background: var(--surface); }
.shelf.miss .stack { border: 1.5px dashed var(--warn); }
.shelf.picked .stack { border-color: var(--mid); box-shadow: 0 0 0 2px var(--mid); }
.shelf.clash .stack { animation: shake 0.5s ease-in-out 2; border-color: var(--warn); }
.shelf.shake .stack { animation: shake 0.5s ease-in-out; }
.shelf.glow .stack { animation: glow 1s ease-in-out infinite; border-color: var(--mid); }
@keyframes glow { 50% { box-shadow: 0 0 0 4px var(--mid), 0 0 18px 6px var(--mid); } }
@keyframes shake {
  20%, 60% { transform: translateX(-4px) rotate(-3deg); }
  40%, 80% { transform: translateX(4px) rotate(3deg); }
}
@media (max-width: 480px) {
  .shelves { gap: 3px; }
  .bk { font-size: 11px; }
}
@media (prefers-reduced-motion: reduce) {
  .shelf.clash .stack, .shelf.shake .stack, .shelf.glow .stack { animation: none; box-shadow: 0 0 0 3px var(--mid); }
}
</style>
