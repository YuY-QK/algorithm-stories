<script setup lang="ts">
import { computed } from 'vue';
import VarChips from '../../shared/VarChips.vue';
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import { CHALLENGE_COUNT, permView, type PermGame } from '../../../../engine/stack';

// 挑战的画面：第几题、目标出栈顺序，判断以后再多出「排队等入栈」和栈，以及这一步的说明。
const props = defineProps<{ state: PermGame; clickable: boolean; t: (msg: Msg) => string }>();
const v = computed(() => permView(props.state));
const answered = computed(() => props.state.answer !== null);
const chips = computed<[string, string][]>(() => [
  [props.t(m('perm.chip.q')), props.t(m('perm.qOf', { q: props.state.q + 1, total: CHALLENGE_COUNT }))],
  [props.t(m('perm.chip.score')), String(props.state.score)],
]);
</script>

<template>
  <div class="perm">
    <VarChips :vars="chips" />

    <div class="lane">
      <span class="lname">{{ t(m('perm.lane.want')) }}</span>
      <div class="nums">
        <span
          v-for="(n, k) in v.want" :key="k" class="nt"
          :class="{ got: answered && k < v.step.out.length, stuck: answered && v.step.action === 'stuck' && k === v.step.out.length }"
        >{{ n }}</span>
      </div>
    </div>

    <template v-if="answered">
      <div class="lane">
        <span class="lname">{{ t(m('perm.lane.wait')) }}</span>
        <div class="nums">
          <span v-for="n in v.waiting" :key="n" class="nt dim">{{ n }}</span>
          <span v-if="!v.waiting.length" class="none">{{ t(m('perm.allIn')) }}</span>
        </div>
      </div>
      <div class="lane">
        <span class="lname">{{ t(m('perm.lane.stack')) }}</span>
        <div class="nums box">
          <span v-for="(n, k) in v.step.stack" :key="n" class="nt" :class="{ topn: k === v.step.stack.length - 1 }">{{ n }}</span>
          <span v-if="!v.step.stack.length" class="none">{{ t(m('perm.emptyStack')) }}</span>
        </div>
      </div>
      <p class="note" aria-live="polite">{{ t(v.step.note) }}</p>
    </template>
  </div>
</template>

<style scoped>
.perm { display: flex; flex-direction: column; gap: 16px; }
.lane { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; }
.lname { font-size: 13px; color: var(--muted); width: 8.5em; flex: none; }
.nums { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; min-height: 40px; }
.nums.box { padding: 3px 6px; border: 2px solid var(--line); border-right: 0; border-radius: 8px 0 0 8px; background: var(--bg); min-width: 60px; }
.nt {
  width: 36px; height: 36px; display: grid; place-items: center; box-sizing: border-box;
  font: 600 15px var(--mono); border: 1.5px solid var(--line); border-radius: 8px; background: var(--surface); color: var(--fg);
  transition: background 0.2s, color 0.2s;
}
.nt.dim { color: var(--muted); }
.nt.got { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
.nt.stuck { border-color: var(--warn); color: var(--warn); box-shadow: 0 0 0 2px var(--warn); }
.nt.topn { background: var(--mid); color: var(--mid-ink); border-color: var(--mid); }
.none { font-size: 13px; color: var(--muted); }
</style>
