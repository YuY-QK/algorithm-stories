<script setup lang="ts">
import { computed, ref } from 'vue';
import { KID_N, lookFrames, pickSecret } from '../../engine/binary-search';
import BookPager from '../../components/shared/BookPager.vue';
import Street from './Street.vue';

// 看：会动的绘本。台词和画面全部由 lookFrames 生成，和真实的二分过程一致。
const secret = ref(11);
const frames = computed(() => lookFrames(secret.value));

function another() {
  secret.value = pickSecret(undefined, secret.value);
}
</script>

<template>
  <BookPager :frames="frames" again-label="✉️ 换个信箱再看一次" @again="another">
    <template #default="{ frame }">
      <Street :n="KID_N" :lo="frame.lo" :hi="frame.hi" :postman="frame.postman" :doors="frame.doors" :letter="frame.letter" />
    </template>
  </BookPager>
</template>
