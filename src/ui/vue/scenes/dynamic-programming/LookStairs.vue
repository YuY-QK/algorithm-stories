<script setup lang="ts">
import type { Msg } from '../../../../core/types';
import { KID_N, type LookPage } from '../../../../engine/dynamic-programming';
import Stairs from './Stairs.vue';

// 看：绘本一页的画面。台词由 Book 控件显示，这里只画楼梯、小兔子和便签。
defineProps<{ frame: LookPage; t: (msg: Msg) => string }>();
</script>

<template>
  <Stairs :n="KID_N" :bunny="frame.bunny" :notes="frame.notes" :from="frame.from" :ask="frame.ask" :t="t" />
</template>
