<script setup lang="ts">
import { computed, ref } from 'vue';
import CodePanel from '../../../components/shared/CodePanel.vue';
import Segmented from '../../../components/shared/Segmented.vue';
import Transport from '../../../components/shared/Transport.vue';
import VarChips from '../../../components/shared/VarChips.vue';
import { play } from '../../../components/shared/sound';
import { usePlayer } from '../../../components/shared/usePlayer';
import * as flow from '../../../core/flows/bughunt';
import type { BugInfo, BugRules, Step } from '../../../core/types';
import { useCopy } from '../i18n';
import { rulesOf, sceneOf } from '../levels';

// 做：找 bug。先看有 bug 的代码在动画里怎么跑错，再点出错的那一行。流程在 core/flows/bughunt.ts。
const props = defineProps<{ slug: string; rules: string; scene: string; copy: Record<string, string> }>();
const { tr, ui } = useCopy(props.copy);

const rules = rulesOf(props.slug, 'bugs', props.rules) as BugRules<BugInfo, Step>;
const Scene = sceneOf(props.slug, props.scene);
const st = ref(flow.startBugHunt(rules.bugs[0].id));
const bug = computed(() => rules.bugs.find((b) => b.id === st.value.which)!);
const steps = computed(() => rules.run(bug.value));
const p = usePlayer(steps);
const s = computed(() => p.step.value);

const ids = rules.bugs.map((b) => b.id);
const count = computed(() => flow.solvedCount(st.value, ids));
const options = computed(() => rules.bugs.map((b, k) => ({ value: b.id, label: ui(st.value.solved[b.id] ? 'ui.bug.pitDone' : 'ui.bug.pit', { n: k + 1 }) })));
const marks = computed(() => flow.marks(st.value, bug.value));
const vars = computed<[string, string | number][]>(() => rules.vars(s.value, bug.value).map(([k, v]) => [tr(k), tr(v)]));
const verdict = computed(() => rules.verdict(s.value, bug.value));
const note = computed(() => ui('ui.trace.step', { i: p.idx.value + 1, n: p.total.value, note: s.value.note }));

function pick(line: number) {
  const out = flow.pick(st.value, bug.value, line);
  if (!out) return;
  st.value = out.state;
  if (out.sound) play(out.sound);
}

const tLabels = {
  reset: ui('ui.transport.reset'), prev: ui('ui.transport.prev'), play: ui('ui.transport.play'), pause: ui('ui.transport.pause'),
  step: ui('ui.transport.step'), next: ui('ui.transport.next'), speed: ui('ui.transport.speed'),
};
const codeLabels = { group: ui('ui.code.group', { lang: 'KOTLIN' }), line: (n: number, text: string) => ui('ui.code.line', { n, text }) };
</script>

<template>
  <div class="controls">
    <Segmented :model-value="st.which" :legend="ui('ui.bug.legend')" :options="options" @update:model-value="(id: string) => (st = flow.choose(st, id))" />
    <span class="chip">{{ ui('ui.bug.found', { a: count, b: rules.bugs.length }) }}</span>
  </div>

  <div class="stage">
    <h3>{{ tr(bug.title) }}</h3>
    <p class="small-note">{{ ui('ui.bug.input') }}{{ tr(rules.input(bug)) }}</p>
    <component :is="Scene" :step="s" :bug="bug" :t="tr" />
    <VarChips :vars="vars" />
    <p class="note" aria-live="polite">{{ note }}</p>
    <Transport :player="p" :labels="tLabels" />
    <p v-if="verdict" class="summary verdict">{{ tr(verdict) }}</p>
  </div>

  <p class="ask"><b>{{ ui('ui.bug.askBold') }}</b>{{ ui('ui.bug.askTail') }}</p>
  <CodePanel :lines="bug.code" :active="s.line" lang="KOTLIN" pickable :marks="marks" :labels="codeLabels" @pick="pick" />
  <p v-if="st.miss !== null" class="oops">{{ ui('ui.bug.miss', { line: st.miss }) }}</p>
  <div v-if="st.solved[bug.id]" class="result">
    <h3>{{ ui('ui.bug.solved', { line: bug.wrongLine }) }}</h3>
    <p>{{ tr(bug.explain) }}</p>
    <p>{{ ui('ui.bug.fixTo') }}<code class="fix">{{ bug.fixed.trim() }}</code></p>
  </div>
</template>

<style scoped>
.verdict { font-weight: 700; }
.ask { font-size: 1.05rem; }
.fix { font: 500 0.95em var(--mono); background: var(--out); padding: 2px 6px; border-radius: 4px; word-break: break-all; }
.note { overflow-wrap: anywhere; }
</style>
