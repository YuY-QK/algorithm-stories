<script setup lang="ts">
import { computed } from 'vue';
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import { BOOK_EMOJI, EVICT_BOOKS, EVICT_BOOKS_SEQ, KID_CAP, evictAccess, evictRuler, type EvictAction, type EvictGame } from '../../../../engine/lru-cache';
import Desk from './Desk.vue';

// 玩法一「当管理员」的画面：书桌和书架，加一行借书进度。
// 要点的书一闪一闪；点错的那本晃一下，最久没碰的那本透光（带蜘蛛网）；点错一次以后才出现刻度。都是 state 里的字段，这里只读。
const props = defineProps<{ state: EvictGame; clickable: boolean; t: (msg: Msg) => string }>();
const emit = defineEmits<{ act: [action: EvictAction] }>();

const s = computed(() => props.state);
const cur = computed(() => evictAccess(s.value));
const done = computed(() => s.value.phase === 'done');

function pick(book: number, where: 'desk' | 'shelf') {
  emit('act', where === 'desk' ? { type: 'desk', book } : { type: 'shelf', book });
}
</script>

<template>
  <Desk
    :cap="KID_CAP" :desk="s.desk" :books="EVICT_BOOKS"
    :pulse="s.phase === 'fetch' ? cur.book : null" :glow="s.glow" :shake="s.shake" :ruler="evictRuler(s)"
    :desk-clickable="clickable" :shelf-clickable="s.phase === 'fetch' && !cur.hit" :t="t"
    @pick="pick"
  />
  <p class="progress" :aria-label="t(m('scene.progress'))">
    <span v-for="(b, k) in EVICT_BOOKS_SEQ" :key="k" :class="{ done: k < s.i || done, now: k === s.i && !done }">{{ BOOK_EMOJI[b] }}</span>
  </p>
</template>

<style scoped>
.progress { display: flex; flex-wrap: wrap; gap: 4px; font-size: 1.1rem; }
.progress span { opacity: 0.3; filter: grayscale(1); }
.progress span.done { opacity: 1; filter: none; }
.progress span.now { opacity: 1; filter: none; outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 4px; }
</style>
