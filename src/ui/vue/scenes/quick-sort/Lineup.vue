<script setup lang="ts">
import { computed } from 'vue';
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import type { Kind } from '../../../../engine/quick-sort';
import KidBar from './KidBar.vue';

// 一排同学：每个同学按 id 固定在 DOM 里，换位置时 left 动画滑过去。
// 看（绘本）和玩法二「挑个好标杆」共用。pickable 时同学能点。
const props = withDefaults(defineProps<{
  /** 每个 id 的身高 */
  heights: number[];
  /** 每个位置上站着的同学 id */
  order: number[];
  kinds?: Kind[];
  /** 正在比较的位置 */
  cmp?: number | null;
  pickable?: boolean;
  /** 透光提示的同学 id */
  glow?: number | null;
  t: (msg: Msg) => string;
}>(), { kinds: () => [], cmp: null, pickable: false, glow: null });

const emit = defineEmits<{ pick: [id: number] }>();

const n = computed(() => props.heights.length);
const max = computed(() => Math.max(...props.heights));
const posOf = computed(() => {
  const m = new Map<number, number>();
  props.order.forEach((id, pos) => m.set(id, pos));
  return m;
});
const kindAt = (id: number): Kind => props.kinds[posOf.value.get(id) ?? 0] ?? 'plain';
</script>

<template>
  <div class="qk-line" :style="{ '--n': n }">
    <component
      :is="pickable ? 'button' : 'div'"
      v-for="(_, id) in heights"
      :key="id"
      :type="pickable ? 'button' : undefined"
      class="slot"
      :style="{ '--s': posOf.get(id) }"
      :aria-label="pickable ? t(m('pick.kid', { h: heights[id] })) : undefined"
      :aria-hidden="pickable ? undefined : true"
      @click="pickable && emit('pick', id)"
    >
      <KidBar
        :id="id" :v="heights[id]" :max="max" :kind="kindAt(id)" :flag="kindAt(id) === 'pivot'"
        :cmp="cmp === posOf.get(id)" :glow="glow === id"
      />
    </component>
  </div>
</template>

<style scoped>
.qk-line {
  --bar: clamp(70px, 24vw, 120px);
  position: relative; width: 100%; max-width: calc(var(--n) * 76px); box-sizing: border-box;
  height: calc(var(--bar) + 20px + 34px + 22px + 6px);
  border-bottom: 2px solid var(--line);
}
.slot {
  position: absolute; bottom: 0; left: calc(var(--s) * 100% / var(--n)); width: calc(100% / var(--n));
  height: 100%; display: flex; align-items: flex-end; box-sizing: border-box; padding: 0 2px;
  font: inherit; color: var(--fg); background: none; border: 0; transition: left 0.55s ease-in-out;
}
button.slot { cursor: pointer; border-radius: 8px; }
button.slot:hover { background: var(--surface); }
button.slot:focus-visible { outline: 2px solid var(--fg); outline-offset: -2px; }
@media (prefers-reduced-motion: reduce) {
  .slot { transition: none; }
}
</style>
