<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { m } from '../../../../core/i18n';
import { WIGGLE_MS } from '../../../../core/timing';
import type { Msg } from '../../../../core/types';
import { STAND_MAX, standDone, standHeights, type StandAction, type StandState } from '../../../../engine/quick-sort';
import { useStageStop } from '../../shared/usePlayer';
import KidBar from './KidBar.vue';

// 玩法一「站两边」的画面：排队的同学，当前这位头上有 👆；两个大按钮选站哪边；下面是左右两队和标杆。
// 点错时规则把 wiggle 加一，这里让当前同学晃一晃、标杆透光 WIGGLE_MS，并拉出一条和标杆一样高的线。
const props = defineProps<{ state: StandState; clickable: boolean; t: (msg: Msg) => string }>();
const emit = defineEmits<{ act: [action: StandAction] }>();

const heights = computed(() => standHeights(props.state));
const pivotId = computed(() => props.state.game.queue.length);
const waiting = computed(() => props.state.game.queue.map((_, id) => id).slice(props.state.qi));
const done = computed(() => standDone(props.state));
const cur = computed(() => props.state.qi);

const wiggling = ref(false);
let timer: ReturnType<typeof setTimeout> | null = null;
let frame = 0;
function stopWiggle() {
  if (timer) clearTimeout(timer);
  cancelAnimationFrame(frame);
  timer = null;
  wiggling.value = false;
}
watch(() => props.state.wiggle, (n) => {
  stopWiggle();
  if (n === 0) return;
  frame = requestAnimationFrame(() => (wiggling.value = true));
  timer = setTimeout(() => (wiggling.value = false), WIGGLE_MS);
});
useStageStop(stopWiggle);
onBeforeUnmount(stopWiggle);
</script>

<template>
  <div class="qbox" :aria-label="t(m('stand.queue'))">
    <div class="queue">
      <div v-for="id in waiting" :key="id" class="qslot" :class="{ cur: id === cur && !done }">
        <KidBar
          :id="id" :v="heights[id]" :max="STAND_MAX" :mark="id === cur ? '👆' : ''"
          :shake="id === cur && wiggling" :glow="id === cur && wiggling"
        />
      </div>
    </div>
    <div v-if="state.ruler" class="ruler" :style="{ bottom: 'calc(22px + var(--bar) * ' + state.game.pivot / STAND_MAX + ')' }" aria-hidden="true">
      <span>{{ t(m('stand.ruler')) }}</span>
    </div>
  </div>

  <div v-if="!done" class="choose">
    <button type="button" class="btn primary choice" :aria-label="t(m('stand.aria.left'))" @click="emit('act', { type: 'side', side: 'left' })">{{ t(m('stand.left')) }}</button>
    <button type="button" class="btn primary choice" :aria-label="t(m('stand.aria.right'))" @click="emit('act', { type: 'side', side: 'right' })">{{ t(m('stand.right')) }}</button>
  </div>

  <div class="stand">
    <div class="grp">
      <span class="cap">{{ t(m('stand.capLeft')) }}</span>
      <div class="kids"><KidBar v-for="id in state.left" :key="id" :id="id" :v="heights[id]" :max="STAND_MAX" kind="low" class="pop" /></div>
    </div>
    <div class="grp mid">
      <span class="cap">&nbsp;</span>
      <div class="kids">
        <KidBar :id="pivotId" :v="state.game.pivot" :max="STAND_MAX" :kind="done ? 'placed' : 'pivot'" flag :glow="wiggling" />
      </div>
    </div>
    <div class="grp">
      <span class="cap">{{ t(m('stand.capRight')) }}</span>
      <div class="kids"><KidBar v-for="id in state.right" :key="id" :id="id" :v="heights[id]" :max="STAND_MAX" kind="high" class="pop" /></div>
    </div>
  </div>
</template>

<style scoped>
.qbox { --bar: clamp(70px, 22vw, 110px); position: relative; border-bottom: 2px solid var(--line); min-height: calc(var(--bar) + 80px); display: flex; align-items: flex-end; }
.queue { display: flex; width: 100%; gap: 2px; align-items: flex-end; }
.qslot { flex: 0 1 56px; min-width: 0; padding: 0 2px; border-radius: 8px; }
.qslot.cur { background: var(--surface); box-shadow: 0 0 0 2px var(--accent); }
.ruler {
  position: absolute; left: 0; right: 0; border-top: 2px dashed var(--warn); pointer-events: none;
}
.ruler span { position: absolute; right: 0; top: -22px; font-size: 13px; color: var(--warn); background: var(--bg); padding: 0 4px; border-radius: 4px; }
.choose { display: flex; gap: 12px; }
.choice { flex: 1 1 0; font-size: 1.15rem; padding: 14px 10px; min-width: 0; }
.stand { --bar: 64px; display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); gap: 8px; align-items: end; }
.grp { display: flex; flex-direction: column; gap: 6px; min-width: 0; align-items: stretch; }
.grp.mid { align-items: center; width: 56px; }
.cap { font-size: 13px; color: var(--muted); text-align: center; }
.kids { display: flex; gap: 1px; align-items: flex-end; justify-content: center; border-bottom: 2px solid var(--line); min-height: calc(var(--bar) + 70px); }
.kids > * { flex: 1 1 0; min-width: 0; max-width: 44px; }
.grp.mid .kids { width: 100%; }
.pop { animation: pop 0.4s ease-out; }
@keyframes pop { from { transform: translateY(-14px) scale(0.8); opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
  .pop { animation: none; }
}
</style>
