<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import { SHAKE_MS } from '../../../../components/shared/timing';
import { useStageStop } from '../../../../components/shared/usePlayer';
import { KID_N, countFinding, countLevel, noteOptions, pathSum, ways, type CountAction, type CountGame } from '../../../../engine/dynamic-programming';
import Stairs from './Stairs.vue';

// 玩法一「数跳法」的画面：楼梯和便签；找跳法时是「小跳」「大跳」两个按钮和已找到的跳法，猜便签时是四个数字。
// 摇头和闪光的次数在规则的状态里，这里负责让它们动一下（摇一下就停，闪光每次重新闪）。
const props = defineProps<{ state: CountGame; clickable: boolean; t: (msg: Msg) => string }>();
const emit = defineEmits<{ act: [action: CountAction] }>();

const level = () => countLevel(props.state);
const finding = () => countFinding(props.state);
const total = () => ways(level());

const shaking = ref<string | null>(null);
const glowing = ref<number[]>([]);
let timer: ReturnType<typeof setTimeout> | null = null;
function stop() {
  if (timer) clearTimeout(timer);
  timer = null;
  shaking.value = null;
}
watch(() => props.state.shake, (v) => {
  stop();
  if (!v) return;
  requestAnimationFrame(() => (shaking.value = v[0]));
  timer = setTimeout(() => (shaking.value = null), SHAKE_MS);
});
// 每猜错一次，闪光先灭再亮，让它重新闪一遍
watch(() => props.state.glowN, () => {
  glowing.value = [];
  requestAnimationFrame(() => (glowing.value = props.state.glow));
});
watch(() => props.state.glow, (g) => {
  if (!g.length) glowing.value = [];
});
useStageStop(stop);
onBeforeUnmount(stop);
</script>

<template>
  <Stairs
    :n="KID_N"
    :bunny="finding() && !state.allDone ? pathSum(state.path) : null"
    :notes="state.notes"
    :from="state.levelDone && !finding() ? [level() - 1, level() - 2] : []"
    :glow="glowing"
    :ask="state.levelDone || state.allDone ? null : level()"
    :goal="finding() && !state.allDone ? level() : null"
    :t="t"
  />

  <template v-if="!state.allDone">
    <template v-if="finding()">
      <div class="hops">
        <button type="button" class="pad" :class="{ shake: shaking === 'h1' }" :disabled="!clickable" :aria-label="t(m('scene.count.hop1'))" @click="emit('act', { type: 'hop', h: 1 })">
          <span class="hb h1">1</span> {{ t(m('scene.count.small')) }}
        </button>
        <button type="button" class="pad" :class="{ shake: shaking === 'h2' }" :disabled="!clickable" :aria-label="t(m('scene.count.hop2'))" @click="emit('act', { type: 'hop', h: 2 })">
          <span class="hb h2">2</span> {{ t(m('scene.count.big')) }}
        </button>
      </div>
      <ul class="slots" :aria-label="t(m('scene.count.slots', { n: level() }))">
        <li v-for="(_, s) in total()" :key="s" class="slot" :class="{ empty: !state.found[s] }">
          <template v-if="state.found[s]"><span v-for="(h, k) in state.found[s]" :key="k" class="hb" :class="'h' + h">{{ h }}</span></template>
          <template v-else>❓</template>
        </li>
      </ul>
      <p v-if="state.path.length" class="cur" :aria-label="t(m('scene.count.cur'))">
        <span v-for="(h, k) in state.path" :key="k" class="hb" :class="'h' + h">{{ h }}</span>
      </p>
    </template>
    <div v-else-if="!state.levelDone" class="options">
      <button
        v-for="o in noteOptions(level())" :key="o" type="button" class="opt"
        :class="{ shake: shaking === 'o' + o }" :disabled="state.tried.includes(o)"
        :aria-label="t(m('scene.count.opt', { v: o }))" @click="emit('act', { type: 'choose', v: o })"
      >{{ o }}</button>
    </div>
  </template>
</template>

<style scoped>
.hops { display: flex; gap: 12px; flex-wrap: wrap; }
.pad {
  font: 500 1.2rem var(--body); cursor: pointer; flex: 1 1 8em; max-width: 12em; min-height: 3em;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  border-radius: 16px; border: 1.5px solid var(--line); background: var(--surface); color: var(--fg);
}
.pad:disabled { opacity: 0.4; cursor: default; }
.pad:not(:disabled):hover { border-color: var(--accent); }
.pad:focus-visible, .opt:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
.hb {
  display: inline-grid; place-items: center; width: 1.7em; height: 1.7em; border-radius: 50%;
  font: 700 0.85rem var(--mono); line-height: 1;
}
.hb.h1 { background: var(--accent); color: var(--accent-ink); }
.hb.h2 { background: var(--mid); color: var(--mid-ink); }
.slots { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; }
.slot {
  min-width: 3em; min-height: 2.4em; padding: 4px 10px; display: flex; align-items: center; justify-content: center; gap: 4px;
  border-radius: 12px; background: var(--surface); border: 1.5px solid var(--accent);
}
.slot.empty { border-style: dashed; border-color: var(--line); color: var(--muted); }
.cur { display: flex; gap: 4px; min-height: 1.8em; }
.options { display: flex; flex-wrap: wrap; gap: 12px; }
.opt {
  font: 700 1.6rem var(--mono); width: 2.7em; height: 2.2em; cursor: pointer;
  border-radius: 14px; border: 1.5px solid var(--line); background: var(--mid); color: var(--mid-ink);
}
.opt:disabled { opacity: 0.35; cursor: default; background: var(--surface); color: var(--muted); }
.opt:not(:disabled):hover { border-color: var(--accent); }
.shake { animation: shake 0.5s ease-in-out; }

@keyframes shake {
  20%, 60% { transform: translateX(-5px) rotate(-3deg); }
  40%, 80% { transform: translateX(5px) rotate(3deg); }
}
@media (prefers-reduced-motion: reduce) {
  .shake { animation: none; border-color: var(--warn); }
}
</style>
