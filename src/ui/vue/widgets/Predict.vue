<script setup lang="ts">
import { computed, ref } from 'vue';
import PredictFrame from '../../../components/shared/PredictFrame.vue';
import * as flow from '../../../core/flows/predict';
import { play } from '../../../components/shared/sound';
import type { PredictRules } from '../../../core/types';
import { useCopy } from '../i18n';
import { rulesOf, sceneOf } from '../levels';

// 做：猜下一步。按规则出的题一问一问地答，连对到目标过关。流程在 core/flows/predict.ts。
const props = defineProps<{ slug: string; rules: string; scene: string }>();
const { tr, ui } = useCopy();

const rules = rulesOf(props.slug, 'predict', props.rules) as PredictRules<unknown, unknown>;
const Scene = sceneOf(props.slug, props.scene);
const goal = rules.goal ?? 5;
const st = ref(flow.startPredict(rules.puzzle(), goal));
const v = computed(() => flow.viewOf(st.value));
const chips = computed(() => (v.value.chips ?? []).map(([k, val]) => ({ k: tr(k), val: tr(val) })));

function answer(value: unknown) {
  const out = flow.answer(st.value, value);
  if (!out) return;
  st.value = out.state;
  if (out.sound) play(out.sound);
}
const proceed = () => (st.value = flow.proceed(st.value) ?? st.value);
const next = () => (st.value = flow.nextPuzzle(st.value, rules.puzzle()));
</script>

<template>
  <PredictFrame
    :streak="st.streak"
    :goal="goal"
    :passed="st.passed"
    :prompt="tr(v.prompt)"
    :wrong="v.wrong ? tr(v.wrong) : null"
    :right="v.right ? tr(v.right) : null"
    :ended="v.ended"
    :continue-label="ui('ui.predict.cont')"
    :next-label="ui('ui.predict.next')"
    :streak-label="ui('ui.predict.streak')"
    :passed-label="ui('ui.predict.passed')"
    @continue="proceed"
    @next="next"
  >
    <template #chips>
      <span v-for="c in chips" :key="c.k" class="chip"><small>{{ c.k }}</small>{{ c.val }}</span>
    </template>
    <template #board>
      <component :is="Scene" :view="v.view" :picked="v.picked" :pickable="v.pickable" :t="tr" @act="answer" />
    </template>
    <template #answers>
      <div v-if="v.options" class="answers">
        <button v-for="(o, k) in v.options" :key="k" type="button" class="btn small mono" @click="answer(o.value)">{{ tr(o.label) }}</button>
      </div>
    </template>
  </PredictFrame>
</template>

<style scoped>
.mono { font-family: var(--mono); }
</style>
