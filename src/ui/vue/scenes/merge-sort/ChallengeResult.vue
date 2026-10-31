<script setup lang="ts">
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import type { MergeInfo } from '../../../../engine/merge-sort';

// 挑战排满以后的结果：这一队比较了几次，每次合并各比几次，和理论上的最少、最多比一比。
// 放在结算里（Game 控件把它画在按钮前面），按钮由规则的 controls 给。
defineProps<{
  line: number[];
  mode: 'max' | 'min';
  total: number;
  merges: MergeInfo[];
  win: boolean;
  min: number;
  max: number;
  t: (msg: Msg) => string;
}>();

/** 合并 [lo, hi) 这一段，最少和最多各比几次 */
const lowest = (lo: number, hi: number) => Math.min(Math.floor((hi - lo) / 2), hi - lo - Math.floor((hi - lo) / 2));
</script>

<template>
  <div class="res">
    <h3>{{ win ? t(m('chal.win')) : t(m('chal.miss', { n: total })) }}</h3>
    <p>
      <b>[{{ line.join(', ') }}]</b>{{ t(m('chal.res.a')) }}<b>{{ total }}</b>{{ t(m('chal.res.b', { n: line.length, min, max })) }}
      <template v-if="win">{{ mode === 'max' ? t(m('chal.winMax')) : t(m('chal.winMin')) }}</template>
    </p>
    <ul class="merges">
      <li v-for="x in merges" :key="x.lo + '-' + x.hi">
        {{ t(m('chal.merge', { lo: x.lo, hi: x.hi, c: x.compares })) }}
        <small>{{ t(m('chal.mergeRange', { min: lowest(x.lo, x.hi), max: x.hi - x.lo - 1 })) }}</small>
      </li>
    </ul>
    <p class="tip">{{ t(m('chal.tip', { extra: mode === 'min' ? t(m('chal.tipMin', { min })) : t(m('chal.tipMax')) })) }}</p>
  </div>
</template>

<style scoped>
.res { display: flex; flex-direction: column; gap: 14px; }
.merges { margin: 0; padding-left: 1.2em; display: flex; flex-direction: column; gap: 2px; font: 500 13px var(--mono); }
.merges small { color: var(--muted); font-size: 12px; }
.tip { overflow-wrap: anywhere; }
</style>
