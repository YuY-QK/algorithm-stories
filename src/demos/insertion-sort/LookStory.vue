<script setup lang="ts">
import { computed, ref } from 'vue';
import { STORY_HAND, dealHand, lookFrames, toCards } from '../../engine/insertion-sort';
import BookPager from '../../components/shared/BookPager.vue';
import Hand from './Hand.vue';

// 看：会动的绘本。台词和画面全部由 lookFrames 生成，和真实的插入排序过程一致。
const values = ref<number[]>([...STORY_HAND]);
const cards = computed(() => toCards(values.value));
const frames = computed(() => lookFrames(values.value));

function another() {
  values.value = dealHand(5);
}
</script>

<template>
  <BookPager :frames="frames" again-label="🃏 换一手牌再看一次" @again="another">
    <template #default="{ frame }">
      <Hand :cards="cards" :slots="frame.slots" :held="frame.held" :held-at="frame.heldAt" :in-hand="frame.inHand" :vs="frame.cmp" />
    </template>
  </BookPager>
</template>
