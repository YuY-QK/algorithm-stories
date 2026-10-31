<script setup lang="ts">
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';

// 「当管理员」结算里的两句话：LRU 的秘诀，和没拿满三颗星时的小提醒。星星和「再来一局」由 Game 控件画。
defineProps<{ retry: boolean; t: (msg: Msg) => string }>();
</script>

<template>
  <p class="q">{{ t(m('evict.doneQ')) }}</p>
  <p v-if="retry" class="small-note">{{ t(m('evict.retry')) }}</p>
</template>

<style scoped>
.q { font-size: 1.2rem; max-width: 30em; }
</style>
