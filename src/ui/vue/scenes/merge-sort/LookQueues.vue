<script setup lang="ts">
import { computed } from 'vue';
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import type { LookPage } from '../../../../engine/merge-sort';
import Queue from './Queue.vue';

// 看：绘本一页的画面。第一章两个班合成一队，第二章往回倒，一直对半分，再两两合并。台词由 Book 控件显示。
// 每一页都带着这一队小动物的身高（frame.values），画面只管把队伍摆出来。
const props = defineProps<{ frame: LookPage; t: (msg: Msg) => string }>();
const values = computed(() => props.frame.values);
const max = computed(() => Math.max(...values.value));
const f = computed(() => props.frame);

/** 一队的读屏名字：合并的页分一班二班，对半分的页只是「一队」 */
function label(x: number) {
  if (f.value.out === null) return props.t(m('scene.queue'));
  return x === 0 ? props.t(m('scene.class1Aria')) : props.t(m('scene.class2Aria'));
}
</script>

<template>
  <div class="scene">
    <div class="lane" :class="{ two: f.out !== null }">
      <div v-for="(q, x) in f.queues" :key="x" class="slot">
        <small v-if="f.out !== null" class="cap">{{ x === 0 ? t(m('scene.class1')) : t(m('scene.class2')) }}</small>
        <Queue
          :ids="q" :values="values" :max="max" :cmp="f.cmp ?? []" :fresh="f.fresh.includes(x)" :t="t"
          :empty="f.out !== null ? t(m('scene.gone')) : ''"
          :label="label(x)"
        />
      </div>
    </div>
    <div v-if="f.out" class="slot">
      <small class="cap">{{ t(m('scene.newQueue')) }}</small>
      <Queue
        :ids="f.out" :values="values" :max="max" :moved="f.moved" :fresh="f.out.length === values.length" :t="t"
        :empty="t(m('scene.startHere'))" :label="t(m('scene.newQueueAria'))"
      />
    </div>
  </div>
</template>

<style scoped>
.scene { display: flex; flex-direction: column; gap: 12px; width: 100%; max-width: 560px; min-height: 250px; }
.lane { display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-end; }
.lane.two { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.slot { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.scene > .slot { max-width: 100%; }
.cap { color: var(--muted); font-size: 12px; }
</style>
