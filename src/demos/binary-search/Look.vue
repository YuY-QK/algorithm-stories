<script setup lang="ts">
import { KID_N, type LookPage } from '../../engine/binary-search';
import Street from './Street.vue';

// 看：绘本的一页
defineProps<{ frame: LookPage }>();
</script>

<template>
  <Street :n="KID_N" :lo="frame.lo" :hi="frame.hi" :postman="frame.postman" :doors="frame.doors" :letter="frame.letter" />
</template>
