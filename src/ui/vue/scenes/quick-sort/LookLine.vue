<script setup lang="ts">
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import type { StoryFrame } from '../../../../engine/quick-sort';
import Lineup from './Lineup.vue';

// 看：绘本一页的画面。台词由 Book 控件显示，这里画一排同学和颜色的说明。
defineProps<{ frame: StoryFrame; t: (msg: Msg) => string }>();
</script>

<template>
  <Lineup :heights="frame.heights" :order="frame.order" :kinds="frame.kinds" :cmp="frame.cmp" :t="t" />
  <p class="legend" aria-hidden="true">
    <span><i class="sw low" />{{ t(m('look.legend.low')) }}</span>
    <span><i class="sw high" />{{ t(m('look.legend.high')) }}</span>
    <span><i class="sw pivot" />{{ t(m('look.legend.pivot')) }}</span>
    <span><i class="sw placed" />{{ t(m('look.legend.placed')) }}</span>
  </p>
</template>

<style scoped>
.legend { display: flex; flex-wrap: wrap; gap: 4px 14px; margin: 0; font-size: 13px; color: var(--muted); }
.legend span { display: inline-flex; align-items: center; gap: 5px; }
.sw { width: 12px; height: 12px; border-radius: 3px; border: 1.5px solid var(--line); display: inline-block; }
.sw.low { background: color-mix(in srgb, var(--accent) 40%, var(--bg)); border-color: var(--accent); }
.sw.high { background: color-mix(in srgb, var(--mid) 55%, var(--bg)); border-color: var(--mid); }
.sw.pivot { background: var(--warn); border-color: var(--warn); }
.sw.placed { background: var(--accent); border-color: var(--accent); }
</style>
