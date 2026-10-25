<script setup lang="ts">
import { computed, ref } from 'vue';
import { STORY_KIDS, genStory, lookFrames } from '../../engine/merge-sort';
import BookPager from '../../components/shared/BookPager.vue';
import Queue from './Queue.vue';

// 看：会动的绘本。台词和画面全部由 lookFrames 生成，和真实的归并排序过程一致。
// 第一章：两个班各自排好队，合成一队；第二章：往回倒，一直对半分，再两两合并。
const values = ref<number[]>([...STORY_KIDS]);
const frames = computed(() => lookFrames(values.value));
const max = computed(() => Math.max(...values.value));

function another() {
  values.value = genStory();
}
</script>

<template>
  <BookPager :frames="frames" again-label="🔀 换一队再看一次" @again="another">
    <template #default="{ frame: f, index }">
      <div class="scene">
        <div class="lane" :class="{ two: f.out !== null }">
          <div v-for="(q, x) in f.queues" :key="x" class="slot">
            <small v-if="f.out !== null" class="cap">{{ x === 0 ? '🏫 一班' : '🏫 二班' }}</small>
            <Queue
              :ids="q" :values="values" :max="max" :cmp="f.cmp ?? []" :fresh="f.fresh.includes(x)"
              :empty="f.out !== null ? '走光啦' : ''" :label="f.out !== null ? (x === 0 ? '一班' : '二班') : '一队'"
            />
          </div>
        </div>
        <div v-if="f.out" class="slot">
          <small class="cap">🚩 新队伍</small>
          <Queue :ids="f.out" :values="values" :max="max" :moved="f.moved" :fresh="index >= frames.length - 1 || f.out.length === values.length" empty="从这里排起" label="新队伍" />
        </div>
      </div>
    </template>
  </BookPager>
</template>

<style scoped>
.scene { display: flex; flex-direction: column; gap: 12px; width: 100%; max-width: 560px; min-height: 250px; }
.lane { display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-end; }
.lane.two { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.slot { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.scene > .slot { max-width: 100%; }
.cap { color: var(--muted); font-size: 12px; }
</style>
