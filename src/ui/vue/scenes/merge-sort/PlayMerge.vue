<script setup lang="ts">
import { computed } from 'vue';
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import type { MergeAction, MergeGame } from '../../../../engine/merge-sort';
import Queue from './Queue.vue';

// 玩法一「合并两队」的画面：一班、二班两队已经排好的小动物，加上新队伍。队头是按钮，被点时交给规则。
// 点错了摇一摇、更矮的透出光，都是 state 里的字段，这里只读。
const props = defineProps<{ state: MergeGame; clickable: boolean; t: (msg: Msg) => string }>();
const emit = defineEmits<{ act: [action: MergeAction] }>();

const s = computed(() => props.state);
const heads = computed(() => (s.value.phase === 'pick' ? [s.value.left[0], s.value.right[0]].filter((x) => x !== undefined) : []));
const max = computed(() => Math.max(...s.value.values, 9));
</script>

<template>
  <div class="play">
    <div class="two">
      <div class="slot">
        <small class="cap">{{ t(m('scene.class1')) }}</small>
        <Queue
          :ids="s.left" :values="s.values" :max="max" :cmp="heads" :glow="s.glow" :shake="s.shake" :t="t"
          :pick-head="clickable" :empty="t(m('scene.gone'))" :label="t(m('scene.class1Aria'))" @pick="emit('act', { type: 'pick', side: 'L' })"
        />
      </div>
      <div class="slot">
        <small class="cap">{{ t(m('scene.class2')) }}</small>
        <Queue
          :ids="s.right" :values="s.values" :max="max" :cmp="heads" :glow="s.glow" :shake="s.shake" :t="t"
          :pick-head="clickable" :empty="t(m('scene.gone'))" :label="t(m('scene.class2Aria'))" @pick="emit('act', { type: 'pick', side: 'R' })"
        />
      </div>
    </div>
    <div class="slot">
      <small class="cap">{{ t(m('scene.newQueue')) }}</small>
      <Queue :ids="s.out" :values="s.values" :max="max" :moved="s.moved" :fresh="s.phase === 'done'" :t="t" :empty="t(m('scene.startHere'))" :label="t(m('scene.newQueueAria'))" />
    </div>
  </div>
</template>

<style scoped>
.play { --kw: min(56px, calc((100vw - 100px) / 8)); --kf: clamp(18px, 6vw, 30px); display: flex; flex-direction: column; gap: 14px; max-width: 560px; }
.two { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.slot { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.cap { color: var(--muted); font-size: 12px; }
@media (max-width: 600px) { .two { grid-template-columns: minmax(0, 1fr); } }
</style>
