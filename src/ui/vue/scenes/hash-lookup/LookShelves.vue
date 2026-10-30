<script setup lang="ts">
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import type { LookPage } from '../../../../engine/hash-lookup';
import Shelves from './Shelves.vue';

// 看：绘本一页的画面。台词由 Book 控件显示，这里画手里的书、算式和一排书架。
defineProps<{ frame: LookPage; t: (msg: Msg) => string }>();
</script>

<template>
  <div class="scene">
    <div class="hand">
      <span v-if="frame.book !== null" class="held" :aria-label="t(m('scene.held'))">📕 {{ frame.book }}</span>
      <span v-if="frame.calc" class="calc">{{ t(frame.calc) }}</span>
    </div>
    <Shelves :piles="frame.piles" :keeper="frame.keeper" :hit="frame.hit" :clash="frame.clash" :miss="frame.miss" :t="t" />
  </div>
</template>

<style scoped>
.scene { width: 100%; display: flex; flex-direction: column; gap: 10px; }
.hand { min-height: 2.2em; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.held { font: 700 1.1rem var(--mono); padding: 2px 10px; border-radius: 8px; border: 1.5px solid var(--line); background: var(--surface); }
.calc { font: 600 1rem var(--mono); color: var(--accent); }
</style>
