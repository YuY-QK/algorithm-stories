<script setup lang="ts">
import type { Component } from 'vue';
import type { PredictBlock, Rand } from '../levels/types';
import PredictFrame from '../components/shared/PredictFrame.vue';
import VarChips from '../components/shared/VarChips.vue';
import { useFlow } from './useFlow';

// 猜下一步：外框（连对、题干、答错提示、下一题）由状态里的标准字段决定，题目画面和答案按钮是画面组件的两个部分
const props = defineProps<{ block: PredictBlock; view: Component; rand: Rand }>();
const { state, send } = useFlow(props.block.flow, props.rand);
const key = (k: string | undefined) => (k ? { key: k } : undefined);
</script>

<template>
  <PredictFrame
    :streak="state.streak"
    :goal="state.goal"
    :passed="state.passed"
    :prompt="state.prompt"
    :wrong="state.wrong"
    :right="state.right ?? null"
    :ended="state.ended"
    :continue-label="key(state.continueLabel)"
    :next-label="key(state.nextLabel)"
    @continue="send({ type: 'continue' })"
    @next="send({ type: 'next' })"
  >
    <template #chips>
      <VarChips v-if="state.chips" class="inline-chips" :vars="state.chips" />
    </template>
    <template #board>
      <component :is="view" part="board" :s="state" :send="send" />
    </template>
    <template #answers>
      <component :is="view" part="answers" :s="state" :send="send" />
    </template>
  </PredictFrame>
</template>

<style scoped>
.inline-chips { display: contents; }
</style>
