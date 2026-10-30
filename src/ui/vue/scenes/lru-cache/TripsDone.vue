<script setup lang="ts">
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import { TRIP_BIG_CAP } from '../../../../engine/lru-cache';

// 「猜猜去几趟书架」借完后的结算：一共跑了几趟，大书桌少跑了几趟，和一句小字。按钮由规则的 controls 给。
defineProps<{ count: number; big: boolean; saved: number; hasSmall: boolean; t: (msg: Msg) => string }>();
</script>

<template>
  <p class="q">{{ t(m('trips.res.a')) }}<b>{{ count }}</b>{{ t(m('trips.res.b')) }}<span v-if="big && hasSmall">{{ t(m('trips.res.saved', { n: saved })) }}</span></p>
  <p v-if="!big" class="small-note">{{ t(m('trips.note.small', { n: TRIP_BIG_CAP })) }}</p>
  <p v-else class="small-note">{{ t(m('trips.note.big')) }}</p>
</template>

<style scoped>
.q { font-size: 1.2rem; max-width: 30em; }
</style>
