<script setup lang="ts">
import { computed, type Component } from 'vue';
import type { Rand, TraceBlock } from '../levels/types';
import CodePanel from '../components/shared/CodePanel.vue';
import Transport from '../components/shared/Transport.vue';
import VarChips from '../components/shared/VarChips.vue';
import { usePlayer } from '../components/shared/usePlayer';
import { t } from '../i18n/runtime';
import { useFlow } from './useFlow';

// 逐步执行：输入控件和画面是画面组件的两个部分；变量、步骤说明、播放条、总结、代码面板都在这里
const props = defineProps<{ block: TraceBlock; view: Component; rand: Rand }>();
const { state: input, send } = useFlow(props.block.input, props.rand);
const steps = computed(() => props.block.build(input.value));
const p = usePlayer(steps);
const s = computed(() => p.step.value);
const vars = computed(() => props.block.vars(s.value, input.value));
const summary = computed(() => (props.block.summary ? props.block.summary(s.value, input.value) : null));
</script>

<template>
  <div class="controls">
    <component :is="view" part="controls" :input="input" :send="send" :step="s" />
  </div>

  <div class="stage">
    <component :is="view" part="board" :input="input" :send="send" :step="s" />
    <VarChips :vars="vars" />
    <p class="note" aria-live="polite">{{ t('player.stepNote', { n: p.idx.value + 1, total: p.total.value, note: s.note }) }}</p>
    <Transport :player="p">
      <button v-for="j in block.jumps ?? []" :key="j.label" type="button" class="btn small" :disabled="p.atEnd.value" @click="p.jumpTo(j.to)">{{ t(j.label) }}</button>
    </Transport>
    <p v-if="summary" class="summary">{{ t(summary) }}</p>
  </div>

  <CodePanel :lines="block.code" :active="s.line" lang="KOTLIN" />
</template>
