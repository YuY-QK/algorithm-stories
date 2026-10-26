<script setup lang="ts">
import { computed, ref } from 'vue';
import CodePanel from '../../../components/shared/CodePanel.vue';
import Transport from '../../../components/shared/Transport.vue';
import VarChips from '../../../components/shared/VarChips.vue';
import { usePlayer } from '../../../components/shared/usePlayer';
import type { Step, TraceRules } from '../../../core/types';
import { useCopy } from '../i18n';
import { rulesOf, sceneOf } from '../levels';
import Controls from './Controls.vue';

// 做：逐步执行。输入由规则的 controls 修改，步骤轨迹由规则生成，这里只负责播放和排版。
const props = defineProps<{ slug: string; rules: string; scene: string; copy: Record<string, string> }>();
const { tr, ui } = useCopy(props.copy);

const rules = rulesOf(props.slug, 'trace', props.rules) as TraceRules<unknown, Step, unknown>;
const Scene = sceneOf(props.slug, props.scene);
const input = ref(rules.start());
const steps = computed(() => rules.trace(input.value));
const p = usePlayer(steps);
const s = computed(() => p.step.value);

const vars = computed<[string, string | number][]>(() => rules.vars(input.value, s.value).map(([k, v]) => [tr(k), tr(v)]));
const summary = computed(() => (s.value.done ? rules.summary?.(input.value, s.value) ?? null : null));
const controls = computed(() => rules.controls(input.value));
const note = computed(() => ui('ui.trace.step', { i: p.idx.value + 1, n: p.total.value, note: s.value.note }));

const tLabels = {
  reset: ui('ui.transport.reset'), prev: ui('ui.transport.prev'), play: ui('ui.transport.play'), pause: ui('ui.transport.pause'),
  step: ui('ui.transport.step'), next: ui('ui.transport.next'), speed: ui('ui.transport.speed'),
};
const codeLabels = { group: ui('ui.code.group', { lang: 'KOTLIN' }), line: (n: number, text: string) => ui('ui.code.line', { n, text }) };
</script>

<template>
  <Controls :controls="controls" variant="fields" :tr="tr" @act="(a) => (input = rules.act(input, a))" />

  <div class="stage">
    <component :is="Scene" :input="input" :step="s" :t="tr" />
    <VarChips :vars="vars" />
    <p class="note" aria-live="polite">{{ note }}</p>
    <Transport :player="p" :labels="tLabels" />
    <p v-if="summary" class="summary">{{ tr(summary) }}</p>
  </div>

  <CodePanel :lines="rules.code" :active="s.line" lang="KOTLIN" :labels="codeLabels" />
</template>
