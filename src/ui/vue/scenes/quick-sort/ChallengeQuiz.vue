<script setup lang="ts">
import { computed } from 'vue';
import Segmented from '../../../../components/shared/Segmented.vue';
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import {
  CHALLENGE_N, CHALLENGE_OPTIONS, INPUT_NAME, STRATEGY_NAME, TABLE_KINDS, TABLE_SIZES, TABLE_STRATEGIES,
  challengeAnswer, challengeRounds, challengeTable, worstCompares, type ChallengeAction, type ChallengeState,
} from '../../../../engine/quick-sort';

// 做：挑战的画面。先预测三种 10 个数的输入「每次拿最后一个当标杆」要比较几次（选项会标出对错，答完讲道理），
// 三题答完以后把三种输入、三种选标杆的办法放在一起比（n = 10、100、1000）。全部操作都发给规则。
const props = defineProps<{ state: ChallengeState; clickable: boolean; t: (msg: Msg) => string }>();
const emit = defineEmits<{ act: [action: ChallengeAction] }>();

const N = CHALLENGE_N;
const q = computed(() => props.state.qs[props.state.qi]);
const answer = computed(() => challengeAnswer(q.value));
const rounds = computed(() => challengeRounds(q.value));
const last = computed(() => props.state.qi >= props.state.qs.length - 1);

const table = computed(() => challengeTable(props.state.size));
const top = computed(() => Math.max(...table.value.flat()));
const width = (v: number) => (Math.log10(1 + v) / Math.log10(1 + top.value)) * 100 + '%';
const fmt = (v: number) => Math.round(v).toLocaleString('en-US');
</script>

<template>
  <template v-if="!state.finished">
    <p class="note">{{ t(m('chal.q1', { i: state.qi + 1, n: state.qs.length })) }}<b>{{ t(q.name) }}</b>{{ t(m('chal.q2')) }}<b>{{ t(m('chal.q3')) }}</b>{{ t(m('chal.q4')) }}<code class="path">arr[j] &lt; pivot</code>{{ t(m('chal.q5')) }}</p>
    <div class="opts">
      <button
        v-for="o in CHALLENGE_OPTIONS" :key="o" type="button" class="btn small mono" :disabled="state.picked !== null"
        :class="{ ok: state.picked !== null && o === answer, no: state.picked === o && o !== answer }"
        :aria-label="t(m('chal.times', { n: o }))" @click="emit('act', { type: 'pick', n: o })"
      >{{ t(m('chal.times', { n: o })) }}</button>
    </div>
    <div v-if="state.picked !== null" class="result">
      <h3>{{ t(state.picked === answer ? m('chal.right', { a: answer }) : m('chal.wrong', { a: answer })) }}</h3>
      <p>
        {{ t(m('chal.exp', {
          size: rounds[0]?.size ?? 0, cmp: rounds[0]?.cmp ?? 0, n1: N - 1,
          why: q.arr[0] === q.arr[N - 1] ? m('chal.why.same') : m('chal.why.extreme'),
        })) }}
      </p>
      <p class="chain mono">{{ t(m('chal.chain', { chain: rounds.map((r) => r.cmp).join(' + '), a: answer, worst: worstCompares(N) })) }}</p>
      <button type="button" class="btn small primary" @click="emit('act', { type: 'next' })">{{ t(last ? m('chal.table') : m('chal.next')) }}</button>
    </div>
  </template>

  <template v-else>
    <h3>{{ state.right === state.qs.length ? t(m('chal.all')) : t(m('chal.some', { right: state.right, total: state.qs.length })) }}</h3>
    <p class="note">{{ t(m('chal.fin1', { w: worstCompares(N) })) }}<b>{{ t(m('chal.fin2')) }}</b>{{ t(m('chal.fin3')) }}</p>
    <Segmented
      :model-value="state.size" :legend="t(m('chal.size'))"
      :options="TABLE_SIZES.map((n) => ({ value: n, label: String(n) }))"
      @update:model-value="(v: string | number) => emit('act', { type: 'size', n: Number(v) })"
    />
    <div class="tbl" role="table" :aria-label="t(m('chal.tableAria', { n: state.size }))">
      <div class="r head" role="row">
        <span class="c0" role="columnheader">{{ t(m('chal.col0')) }}</span>
        <span v-for="s in TABLE_STRATEGIES" :key="s" role="columnheader">{{ t(STRATEGY_NAME[s]) }}</span>
      </div>
      <div v-for="(kind, ki) in TABLE_KINDS" :key="kind" class="r" role="row">
        <span class="c0" role="rowheader">{{ t(INPUT_NAME[kind]) }}</span>
        <span v-for="(s, si) in TABLE_STRATEGIES" :key="s" role="cell" class="cell" :class="{ worst: table[ki][si] === top }">
          <b>{{ fmt(table[ki][si]) }}</b>
          <i class="meter"><i :style="{ width: width(table[ki][si]) }" /></i>
        </span>
      </div>
    </div>
    <p class="small-note">{{ t(m('chal.tableNote', { worst: fmt(worstCompares(state.size)) })) }}</p>
    <div class="row">
      <button type="button" class="btn small" @click="emit('act', { type: 'again' })">{{ t(m('chal.again')) }}</button>
    </div>
  </template>
</template>

<style scoped>
.path { font: 500 0.9em var(--mono); background: var(--out); padding: 1px 6px; border-radius: 4px; }
.opts { display: flex; flex-wrap: wrap; gap: 10px; }
.mono { font-family: var(--mono); }
.opts .btn.ok { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); opacity: 1; }
.opts .btn.no { border-color: var(--warn); box-shadow: 0 0 0 2px var(--warn); opacity: 1; }
.chain { overflow-wrap: anywhere; }
.tbl { display: flex; flex-direction: column; gap: 8px; }
.r { display: grid; grid-template-columns: minmax(0, 0.9fr) repeat(3, minmax(0, 1fr)); gap: 8px; align-items: center; font-size: 13px; }
.r.head { color: var(--muted); font-size: 12px; align-items: end; }
.c0 { font-weight: 600; }
.cell { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.cell b { font: 700 13px var(--mono); font-variant-numeric: tabular-nums; }
.meter { display: block; height: 8px; border-radius: 4px; background: var(--out); overflow: hidden; }
.meter i { display: block; height: 100%; background: var(--accent); }
.cell.worst b { color: var(--warn); }
.cell.worst .meter i { background: var(--warn); }
</style>
