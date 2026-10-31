<script setup lang="ts">
import { computed } from 'vue';
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import { BOOK_EMOJI, CHALLENGE_GOAL, CHALLENGE_LEN, challengeReveal, type ChallengeAction, type ChallengeState } from '../../../../engine/lru-cache';

// 做：挑战的画面。题干、这一串借书记录（揭晓后每本书下面标 LRU、FIFO 是否命中）、几个计数。输入框和「揭晓」由规则的 controls 给。
const props = defineProps<{ state: ChallengeState; clickable: boolean; t: (msg: Msg) => string }>();
defineEmits<{ act: [action: ChallengeAction] }>();

const s = computed(() => props.state);
const r = computed(() => (s.value.shown ? challengeReveal(s.value) : null));
</script>

<template>
  <p>{{ t(m('chal.intro.a')) }}<b>{{ s.c.cap }}</b>{{ t(m('chal.intro.b')) }}<b>{{ t(m('chal.intro.c')) }}</b>{{ t(m('chal.intro.d')) }}</p>
  <div class="seq" :aria-label="t(m('chal.seqAria'))">
    <span v-for="(b, k) in s.c.seq" :key="k" class="req">
      <span class="em">{{ BOOK_EMOJI[b] }}</span><small>{{ b }}</small>
      <template v-if="r">
        <i :class="r.lruRow[k] ? 'h' : 'm'" :title="r.lruRow[k] ? t(m('chal.t.lruHit')) : t(m('chal.t.lruMiss'))">{{ r.lruRow[k] ? '✅' : '🚶' }}</i>
        <i :class="r.fifoRow[k] ? 'h' : 'm'" :title="r.fifoRow[k] ? t(m('chal.t.fifoHit')) : t(m('chal.t.fifoMiss'))">{{ r.fifoRow[k] ? '✅' : '🚶' }}</i>
      </template>
    </span>
  </div>
  <div v-if="r" class="legend small-note">{{ t(m('chal.legend')) }}</div>

  <div class="vars">
    <span class="chip"><small>{{ t(m('chal.chip.cap')) }}</small>{{ s.c.cap }}</span>
    <span class="chip"><small>{{ t(m('chal.chip.total')) }}</small>{{ t(m('chal.chip.totalV', { n: CHALLENGE_LEN })) }}</span>
    <span class="chip"><small>{{ t(m('chal.chip.wins')) }}</small>{{ Math.min(s.wins, CHALLENGE_GOAL) }} / {{ CHALLENGE_GOAL }}</span>
    <span v-if="s.wins >= CHALLENGE_GOAL" class="chip win">{{ t(m('chal.chip.pass')) }}</span>
  </div>
</template>

<style scoped>
.seq { display: grid; grid-template-columns: repeat(auto-fill, minmax(34px, 1fr)); gap: 6px 4px; }
.req { display: flex; flex-direction: column; align-items: center; min-width: 0; line-height: 1.25; }
.req .em { font-size: 1.4rem; }
.req small { font: 400 10px var(--mono); color: var(--muted); }
.req i { font-style: normal; font-size: 0.9rem; }
.req i.m { opacity: 0.6; }
.win { border-color: var(--accent); color: var(--accent); }
</style>
