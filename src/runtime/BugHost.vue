<script setup lang="ts">
import type { Component } from 'vue';
import type { BugsBlock } from '../levels/types';
import BugHunt from '../components/shared/BugHunt.vue';
import { t } from '../i18n/runtime';

// 找 bug：整个面板是共享的 BugHunt，画面组件只画出错过程里的一步
defineProps<{ block: BugsBlock; view?: Component }>();
</script>

<template>
  <BugHunt :bugs="block.bugs" :run="block.run" :vars="block.vars" :verdict="block.verdict">
    <template #input="{ bug }">{{ t(block.input(bug)) }}</template>
    <template #board="{ step, bug }">
      <component :is="view" v-if="view" :step="step" :bug="bug" />
    </template>
  </BugHunt>
</template>
