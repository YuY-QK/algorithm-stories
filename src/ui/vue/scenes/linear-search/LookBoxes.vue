<script setup lang="ts">
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import type { LookPage } from '../../../../engine/linear-search';
import Boxes from './Boxes.vue';

// 看：绘本一页的画面。台词由 Book 控件显示，这里只画玩具箱、箭头和小朋友。
defineProps<{ frame: LookPage; t: (msg: Msg) => string }>();
</script>

<template>
  <Boxes :cells="frame.cells" :pointer="frame.pointer" :kid="frame.kid" :label="t(m('scene.toyBoxes'))" :t="t" />
</template>
