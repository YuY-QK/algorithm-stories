<script setup lang="ts">
import type { Component } from 'vue';
import type { GameBlock, Rand } from '../levels/types';
import type { Msg } from '../i18n/format';
import { t } from '../i18n/runtime';
import { useFlow } from './useFlow';

// 玩、挑战：目标一行小字、状态里的 say（若有），下面是画面组件。规则全在流程里
const props = defineProps<{ block: GameBlock; view: Component; rand: Rand }>();
const { state, send } = useFlow(props.block.flow, props.rand);
const say = (s: unknown) => (s as { say?: Msg | null }).say ?? null;
</script>

<template>
  <div class="game">
    <p v-if="block.goal" class="small-note">{{ t(block.goal) }}</p>
    <p v-if="say(state)" class="say" aria-live="polite">{{ t(say(state)!) }}</p>
    <component :is="view" :s="state" :send="send" />
  </div>
</template>

<style scoped>
.game { display: flex; flex-direction: column; gap: 16px; }
.say { font-size: clamp(1.3rem, 5vw, 1.9rem); min-height: 1.4em; }
</style>
