<script setup lang="ts">
import { computed } from 'vue';
import type { Msg } from '../../../../core/types';
import { placeView, toCards, type PlaceAction, type PlaceGame } from '../../../../engine/insertion-sort';
import Hand from './Hand.vue';

// 玩法一「找位置」的画面：牌桌，空隙上有 ▼ 可以点。台词和星星由 Game 控件显示。
const props = defineProps<{ state: PlaceGame; clickable: boolean; t: (msg: Msg) => string }>();
const emit = defineEmits<{ act: [action: PlaceAction] }>();
const cards = computed(() => toCards(props.state.values));
const view = computed(() => placeView(props.state));
</script>

<template>
  <Hand
    :cards="cards" :slots="view.slots" :held="view.held" :held-at="view.heldAt" :in-hand="view.inHand"
    :shake="state.shake" :glow="state.glow" :gaps="view.gaps" :t="t" @gap="(g: number) => emit('act', { type: 'gap', g })"
  />
</template>
