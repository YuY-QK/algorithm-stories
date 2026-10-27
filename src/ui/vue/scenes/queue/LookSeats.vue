<script setup lang="ts">
import { computed } from 'vue';
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import { SEATS, type LookPage } from '../../../../engine/queue';
import Seats from './Seats.vue';
import { seatLabel, tagText } from './seatLabel';

// 看：绘本的一页。椅子和已经买到奶茶的人，都由引擎真正执行入队、出队得到，这里只画。
const props = defineProps<{ frame: LookPage; t: (msg: Msg) => string }>();

/** 队头、队尾的小标签 */
const tags = computed(() => {
  const out: Record<number, string> = {};
  const { head, size } = props.frame;
  if (size === 0) return out;
  const tail = (head + size - 1) % SEATS;
  out[head] = tagText(props.t, size === 1 ? 'both' : 'head');
  if (size > 1) out[tail] = tagText(props.t, 'tail');
  return out;
});
const labels = computed(() => props.frame.seats.map((v, i) => seatLabel(props.t, i, v, tags.value[i] ?? null)));
</script>

<template>
  <Seats
    :seats="frame.seats" :ring="frame.ring" :tags="tags" :head="frame.size ? frame.head : null"
    :glow="frame.glow" center="🧑‍🍳🧋" empty="🪑" :labels="labels"
  />
  <p class="served" :aria-label="t(m('served.label'))">
    <span class="cup" aria-hidden="true">🧋</span>
    <span v-for="(a, i) in frame.served" :key="i">{{ a }}</span>
  </p>
</template>

<style scoped>
.served { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; min-height: 1.8em; font-size: 1.4rem; }
.cup { padding-right: 6px; margin-right: 4px; border-right: 1.5px solid var(--line); }
</style>
