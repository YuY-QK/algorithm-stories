<script setup lang="ts">
import { KID_N, type LookPage } from '../../../../engine/binary-search';
import type { Msg } from '../../../../core/types';
import Street from './Street.vue';

// 看：绘本一页的画面。台词由 Book 控件显示，这里只画信箱街。
defineProps<{ frame: LookPage; t: (msg: Msg) => string }>();
</script>

<template>
  <Street :n="KID_N" :lo="frame.lo" :hi="frame.hi" :postman="frame.postman" :doors="frame.doors" :letter="frame.letter" :t="t" />
</template>
