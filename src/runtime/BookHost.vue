<script setup lang="ts">
import { computed, shallowRef, type Component } from 'vue';
import type { BookBlock, Rand } from '../levels/types';
import BookPager from '../components/shared/BookPager.vue';

// 看：会动的绘本。台词和画面都来自配置的 frames，画面组件只负责画一页
const props = defineProps<{ block: BookBlock; view: Component; rand: Rand }>();
const seed = shallowRef(props.block.initSeed(props.rand));
const frames = computed(() => props.block.frames(seed.value));
const againLabel = props.block.again ? { key: props.block.again } : undefined;

function another() {
  seed.value = props.block.nextSeed(seed.value, props.rand);
}
</script>

<template>
  <BookPager :frames="frames" :again-label="againLabel" @again="another">
    <template #default="{ frame }">
      <component :is="view" :frame="frame" />
    </template>
  </BookPager>
</template>
