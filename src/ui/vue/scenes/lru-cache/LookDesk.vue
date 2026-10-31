<script setup lang="ts">
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import { KID_CAP, LOOK_BOOKS, type BookFrame } from '../../../../engine/lru-cache';
import Desk from './Desk.vue';

// 看：绘本一页的画面。书桌和书架，加一行「跑了几趟书架」。台词由 Book 控件显示。
defineProps<{ frame: BookFrame; t: (msg: Msg) => string }>();
</script>

<template>
  <Desk :cap="KID_CAP" :desk="frame.desk" :books="LOOK_BOOKS" :pulse="frame.pulse" :glow="frame.glow" :t="t" />
  <p class="trips" :aria-label="t(m('scene.tripsAria', { n: frame.trips }))">
    <span v-for="n in frame.trips" :key="n">🚶</span>
    <small v-if="!frame.trips">{{ t(m('scene.noTrips')) }}</small>
  </p>
</template>

<style scoped>
.trips { min-height: 1.8em; font-size: 1.2rem; display: flex; flex-wrap: wrap; gap: 2px; align-items: center; }
.trips small { font-size: 13px; color: var(--muted); }
</style>
