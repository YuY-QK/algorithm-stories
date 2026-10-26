<script setup lang="ts">
import { computed, ref } from 'vue';
import { PREDICT_GOAL, rounds, slotPiles, type Round } from '../../engine/hash-lookup';
import PredictFrame from '../../components/shared/PredictFrame.vue';
import { useStreak } from '../../components/shared/useStreak';
import Shelves from './Shelves.vue';

// 做：猜下一步。三种题：算桶号（含负数）、撞了往后放（含回绕）、查到哪个桶能下结论。连对 5 次过关。
const list = ref<Round[]>(rounds());
const r = ref(0);
const phase = ref<'ask' | 'wrong' | 'end'>('ask');
const picked = ref<number | null>(null);
const { streak, passed, hit, miss } = useStreak(PREDICT_GOAL);

const cur = computed(() => list.value[r.value]);

function tap(i: number) {
  if (phase.value !== 'ask') return;
  picked.value = i;
  if (i === cur.value.correct) {
    hit();
    phase.value = 'end';
  } else {
    miss();
    phase.value = 'wrong';
  }
}
function goOn() {
  phase.value = 'end';
}
function next() {
  if (r.value >= list.value.length - 1) {
    list.value = rounds();
    r.value = 0;
  } else r.value++;
  phase.value = 'ask';
  picked.value = null;
}

const prompt = computed(() => (phase.value === 'end' ? (picked.value === cur.value.correct ? '✅ ' : '') + cur.value.ok : cur.value.prompt));
</script>

<template>
  <PredictFrame
    :streak="streak"
    :goal="PREDICT_GOAL"
    :passed="passed"
    :prompt="prompt"
    :wrong="phase === 'wrong' ? cur.why : null"
    :ended="phase === 'end'"
    @continue="goOn"
    @next="next"
  >
    <template #chips>
      <span class="chip"><small>key</small>{{ cur.key }}</span>
    </template>
    <template #board>
      <Shelves
        :piles="slotPiles(cur.slots)"
        :clickable="phase === 'ask'"
        :picked="phase === 'ask' ? null : picked"
        :hit="phase === 'ask' ? null : cur.correct"
        @pick="tap"
      />
    </template>
  </PredictFrame>
</template>
