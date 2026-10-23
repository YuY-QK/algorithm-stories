<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { STORY_KIDS, dealKids, storyFrames } from '../../engine/merge-sort';
import { STAGE_CHANGE_EVENT } from '../../components/shared/usePlayer';
import Queue from './Queue.vue';

// 看：会动的绘本。画面全部由 storyFrames 生成，和真实的归并排序过程一致。
// 第一章：两个班各自排好队，合成一队；第二章：往回倒，一直对半分，再两两合并。
const values = ref<number[]>([...STORY_KIDS]);
const frames = computed(() => storyFrames(values.value));
const max = computed(() => Math.max(...values.value));

const k = ref(0);
const f = computed(() => frames.value[Math.min(k.value, frames.value.length - 1)]);
const last = computed(() => k.value >= frames.value.length - 1);
/** 第一章：有「新队伍」那一排，上面固定两个班 */
const merging = computed(() => f.value.out !== null);

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
  values.value = dealKids(6, Math.random, 6);
  k.value = 0;
}

onMounted(() => window.addEventListener(STAGE_CHANGE_EVENT, stop));
onBeforeUnmount(() => { stop(); window.removeEventListener(STAGE_CHANGE_EVENT, stop); });
</script>

<template>
  <div class="book">
    <p class="say" aria-live="polite">{{ f.say }}</p>
    <div class="scene">
      <div class="lane" :class="{ two: merging }">
        <div v-for="(q, x) in f.queues" :key="x" class="slot">
          <small v-if="merging" class="cap">{{ x === 0 ? '🏫 一班' : '🏫 二班' }}</small>
          <Queue
            :ids="q" :values="values" :max="max" :cmp="f.cmp ?? []" :fresh="f.fresh.includes(x)"
            :empty="merging ? '走光啦' : ''" :label="merging ? (x === 0 ? '一班' : '二班') : '一队'"
          />
        </div>
      </div>
      <div v-if="f.out" class="slot">
        <small class="cap">🚩 新队伍</small>
        <Queue :ids="f.out" :values="values" :max="max" :moved="f.moved" :fresh="last || f.out.length === values.length" empty="从这里排起" label="新队伍" />
      </div>
    </div>
    <div class="dots" aria-hidden="true">
      <span v-for="(_, i) in frames" :key="i" :class="{ on: i === k }" />
    </div>
    <div class="nav">
      <button type="button" class="big" :disabled="k === 0" aria-label="上一页" @click="prev">◀</button>
      <button type="button" class="big main" :aria-label="timer ? '暂停' : '自动播放'" @click="play">{{ timer ? '⏸' : '▶️' }}</button>
      <button type="button" class="big" :disabled="last" aria-label="下一页" @click="next">▶</button>
    </div>
    <div v-if="last" class="row">
      <button type="button" class="btn" @click="another">🔀 换一队再看一次</button>
      <button type="button" class="btn primary" data-goto="play">🎮 去玩</button>
    </div>
  </div>
</template>

<style scoped>
.book { display: flex; flex-direction: column; gap: 16px; align-items: flex-start; width: 100%; }
.say { font-size: clamp(1.3rem, 5vw, 1.9rem); min-height: 2.6em; }
.scene { display: flex; flex-direction: column; gap: 12px; width: 100%; max-width: 560px; min-height: 250px; }
.lane { display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-end; }
.lane.two { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.slot { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.scene > .slot { max-width: 100%; }
.cap { color: var(--muted); font-size: 12px; }
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
