<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import PredictFrame from '../../../components/shared/PredictFrame.vue';
import * as flow from '../../../core/flows/predict';
import { play } from '../../../components/shared/sound';
import { useStageStop } from '../../../components/shared/usePlayer';
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

// 有动画（Ask.anim）的问：答完后按节拍一帧帧播，播完进入下一问。定时器只在这里
let timer: ReturnType<typeof setTimeout> | null = null;
function clear() {
  if (timer) clearTimeout(timer);
  timer = null;
}
function set(next: typeof st.value) {
  clear();
  // 不停在结局页的题（Puzzle.endless）：答完最后一问直接换下一道，连对保留
  if (next.phase === 'end' && next.puzzle.endless) next = flow.nextPuzzle(next, rules.puzzle());
  st.value = next;
  const delay = flow.animDelay(next);
  if (delay !== null) {
    timer = setTimeout(() => {
      const n = flow.tickAnim(st.value);
      if (n) set(n);
    }, delay);
  }
}
// 切标签时动画停下；停在半路的这一题作废，换一题，免得卡在「进行中」
useStageStop(() => {
  if (st.value.phase === 'anim') set(flow.nextPuzzle(st.value, rules.puzzle()));
  else clear();
});
onBeforeUnmount(clear);

function answer(value: unknown) {
  const out = flow.answer(st.value, value);
  if (!out) return;
  set(out.state);
  if (out.sound) play(out.sound);
}
const proceed = () => set(flow.proceed(st.value) ?? st.value);
const next = () => set(flow.nextPuzzle(st.value, rules.puzzle()));
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
    :continue-label="rules.continueLabel ? tr(rules.continueLabel) : ui('ui.predict.cont')"
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
        <button v-for="(o, k) in v.options" :key="k" type="button" class="btn small mono" :aria-label="o.aria ? tr(o.aria) : undefined" @click="answer(o.value)">{{ tr(o.label) }}</button>
      </div>
    </template>
  </PredictFrame>
</template>

<style scoped>
.mono { font-family: var(--mono); }
</style>
