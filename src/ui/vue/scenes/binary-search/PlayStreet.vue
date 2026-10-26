<script setup lang="ts">
import { KID_N, type PlayAction, type StreetView } from '../../../../engine/binary-search';
import type { Msg } from '../../../../core/types';
import Street from './Street.vue';

// 玩：藏信和当小邮差共用的信箱街。状态里有什么就画什么，被点的信箱用 act 交给规则。
defineProps<{ state: StreetView; clickable: boolean; t: (msg: Msg) => string }>();
const emit = defineEmits<{ act: [action: PlayAction] }>();
</script>

<template>
  <Street
    :n="KID_N" :lo="state.lo" :hi="state.hi" :postman="state.at" :doors="state.doors"
    :letter="state.letter" :covered="state.covered" :glow="state.glow" :pulse="state.pulse" :shake="state.shake"
    :clickable="clickable" :t="t" @pick="(i: number) => emit('act', { type: 'pick', i })"
  />
</template>
