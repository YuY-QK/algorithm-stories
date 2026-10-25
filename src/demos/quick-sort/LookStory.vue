<script setup lang="ts">
import { computed, ref } from 'vue';
import { STORY_ROW, lookFrames, permutation } from '../../engine/quick-sort';
import BookPager from '../../components/shared/BookPager.vue';
import Lineup from './Lineup.vue';

// 看：会动的绘本。台词和画面全部由 lookFrames 生成，和真实的快速排序过程一致。
const values = ref<number[]>([...STORY_ROW]);
const frames = computed(() => lookFrames(values.value));

function another() {
  values.value = permutation(8);
}
</script>

<template>
  <BookPager :frames="frames" again-label="🔀 换一排同学再看一次" @again="another">
    <template #default="{ frame: f }">
      <Lineup :heights="values" :order="f.order" :kinds="f.kinds" :cmp="f.cmp" />
      <p class="legend" aria-hidden="true">
        <span><i class="sw low" />矮队</span>
        <span><i class="sw high" />高队</span>
        <span><i class="sw pivot" />标杆 🚩</span>
        <span><i class="sw placed" />站定了</span>
      </p>
    </template>
  </BookPager>
</template>

<style scoped>
.legend { display: flex; flex-wrap: wrap; gap: 4px 14px; margin: 0; font-size: 13px; color: var(--muted); }
.legend span { display: inline-flex; align-items: center; gap: 5px; }
.sw { width: 12px; height: 12px; border-radius: 3px; border: 1.5px solid var(--line); display: inline-block; }
.sw.low { background: color-mix(in srgb, var(--accent) 40%, var(--bg)); border-color: var(--accent); }
.sw.high { background: color-mix(in srgb, var(--mid) 55%, var(--bg)); border-color: var(--mid); }
.sw.pivot { background: var(--warn); border-color: var(--warn); }
.sw.placed { background: var(--accent); border-color: var(--accent); }
</style>
