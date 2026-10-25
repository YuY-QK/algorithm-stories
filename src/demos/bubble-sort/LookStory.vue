<script setup lang="ts">
import { computed, ref } from 'vue';
import { STORY_KIDS, lookFrames, randomKids, type Kid } from '../../engine/bubble-sort';
import BookPager from '../../components/shared/BookPager.vue';
import Lineup from './Lineup.vue';

// 看：会动的绘本。台词和画面全部由 lookFrames 生成，和真实的冒泡过程一致。
const kids = ref<Kid[]>(STORY_KIDS);
const frames = computed(() => lookFrames(kids.value));

function another() {
  kids.value = randomKids();
}
</script>

<template>
  <BookPager :frames="frames" again-label="🔀 换一群小伙伴再看" @again="another">
    <template #default="{ frame }">
      <Lineup :line="frame.line" :pair="frame.pair" :fixed-from="frame.fixedFrom" :photo="frame.photo" />
    </template>
  </BookPager>
</template>
