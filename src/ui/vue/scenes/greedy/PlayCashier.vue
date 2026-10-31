<script setup lang="ts">
import { KID_COINS, cashierDone, cashierLeft, cashierPulse, desc, type CashierAction, type CashierGame } from '../../../../engine/greedy';
import type { Msg } from '../../../../core/types';
import Shop from './Shop.vue';

// 玩法一「当收银员」的画面：小熊的小卖部。点硬币 emit 一个 tap 操作，规则判断放不放得进盘子。
defineProps<{ state: CashierGame; clickable: boolean; t: (msg: Msg) => string }>();
const emit = defineEmits<{ act: [action: CashierAction] }>();
const COINS = desc(KID_COINS);
</script>

<template>
  <Shop
    :coins="COINS" :left="cashierLeft(state)" :plate="state.plate" who="🐻"
    :pulse="cashierPulse(state)" :shake="state.shake" :clickable="clickable && !cashierDone(state)" :t="t"
    @pick="(coin) => emit('act', { type: 'tap', coin })"
  />
</template>
