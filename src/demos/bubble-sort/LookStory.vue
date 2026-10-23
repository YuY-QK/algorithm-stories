<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { STORY_KIDS, lookFrames, randomKids, type Kid } from '../../engine/bubble-sort';
import { STAGE_CHANGE_EVENT } from '../../components/shared/usePlayer';
import Lineup from './Lineup.vue';

// 看：会动的绘本。画面全部由 lookFrames 生成，和真实的冒泡过程一致。
const kids = ref<Kid[]>(STORY_KIDS);
const frames = computed(() => lookFrames(kids.value));

const k = ref(0);
const f = computed(() => frames.value[Math.min(k.value, frames.value.length - 1)]);
const last = computed(() => k.value >= frames.value.length - 1);

const timer = ref<ReturnType<typeof setInterval> | null>(null);
function stop() {
  if (timer.value) clearInterval(timer.value);
  timer.value = null;
}
function play() {
  if (timer.value) return stop();
  if (last.value) k.value = 0;
  timer.value = setInterval(() => (last.value ? stop() : k.value++), 1900);
}
function next() { stop(); if (!last.value) k.value++; }
function prev() { stop(); if (k.value > 0) k.value--; }
function another() {
  stop();
  kids.value = randomKids();
  k.value = 0;
}

onMounted(() => window.addEventListener(STAGE_CHANGE_EVENT, stop));
onBeforeUnmount(() => { stop(); window.removeEventListener(STAGE_CHANGE_EVENT, stop); });
</script>

<template>
  <div class="book">
    <p class="say" aria-live="polite">{{ f.say }}</p>
    <Lineup :line="f.line" :pair="f.pair" :fixed-from="f.fixedFrom" :photo="f.photo" />
    <div class="dots" aria-hidden="true">
      <span v-for="(_, i) in frames" :key="i" :class="{ on: i === k }" />
    </div>
    <div class="nav">
      <button type="button" class="big" :disabled="k === 0" aria-label="上一页" @click="prev">◀</button>
      <button type="button" class="big main" :aria-label="timer ? '暂停' : '自动播放'" @click="play">{{ timer ? '⏸' : '▶️' }}</button>
      <button type="button" class="big" :disabled="last" aria-label="下一页" @click="next">▶</button>
    </div>
    <div v-if="last" class="row">
      <button type="button" class="btn" @click="another">🔀 换一群小伙伴再看</button>
      <button type="button" class="btn primary" data-goto="play">🎮 去玩</button>
    </div>
  </div>
</template>

<style scoped>
.book { display: flex; flex-direction: column; gap: 16px; align-items: flex-start; }
.say { font-size: clamp(1.3rem, 5vw, 1.9rem); min-height: 2.6em; }
.dots { display: flex; flex-wrap: wrap; gap: 6px; }
.dots span { width: 8px; height: 8px; border-radius: 50%; background: var(--line); }
.dots span.on { background: var(--accent); }
.nav { display: flex; gap: 12px; }
.big {
  font: inherit; font-size: 1.4rem; width: 3.2em; height: 2.4em; cursor: pointer;
  border-radius: 14px; border: 1.5px solid var(--line); background: var(--surface); color: var(--fg);
}
.big.main { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
.big:disabled { opacity: 0.35; cursor: not-allowed; }
.big:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
</style>
