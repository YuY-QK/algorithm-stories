<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { LOOK_OPS, PLATE_ICONS, runPlates, type PlateState } from '../../engine/stack';
import { STAGE_CHANGE_EVENT } from '../../components/shared/usePlayer';
import Plates from './Plates.vue';

// 看：会动的绘本。每一页的盘子都由 runPlates 生成，文字按这一步做了什么来写。
interface Frame extends PlateState { say: string }

const frames = computed<Frame[]>(() => {
  const states = runPlates(LOOK_OPS);
  let pushed = 0;
  let popped = 0;
  const out: Frame[] = states.map((s, k) => {
    const icon = s.moved === null ? '' : PLATE_ICONS[s.moved];
    let say = '小熊 🐻 洗好了盘子，要一个一个叠起来 🍽️';
    if (s.op?.kind === 'push') {
      say = pushed++ === 0 ? '先放上 ' + icon + ' 盘' : '再放 ' + icon + ' 盘，叠在最上面';
    } else if (s.op?.kind === 'pop') {
      const prev = states[k - 1];
      const justPut = prev.op?.kind === 'push' && prev.moved === s.moved;
      if (popped++ === 0) say = '要拿一个盘子：只能拿最上面的 ' + icon;
      else if (s.stack.length === 0) say = '最先放的 ' + icon + '，最后才拿到';
      else if (justPut) say = '拿走 ' + icon + '：刚放上去的，最先拿走';
      else say = '再拿最上面的 ' + icon;
    }
    return { ...s, say };
  });
  const last = states[states.length - 1];
  out.push({ ...last, say: '后放的先拿，先放的后拿：这就叫「栈」📚' });
  return out;
});

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
  timer.value = setInterval(() => (last.value ? stop() : k.value++), 2200);
}
function next() { stop(); if (!last.value) k.value++; }
function prev() { stop(); if (k.value > 0) k.value--; }
function replay() { stop(); k.value = 0; }

onMounted(() => window.addEventListener(STAGE_CHANGE_EVENT, stop));
onBeforeUnmount(() => { stop(); window.removeEventListener(STAGE_CHANGE_EVENT, stop); });
</script>

<template>
  <div class="book">
    <p class="say" aria-live="polite">{{ f.say }}</p>
    <Plates :stack="f.stack" :taken="f.taken" :room="3" :glow-top="false" />
    <div class="dots" aria-hidden="true">
      <span v-for="(_, i) in frames" :key="i" :class="{ on: i === k }" />
    </div>
    <div class="nav">
      <button type="button" class="big" :disabled="k === 0" aria-label="上一页" @click="prev">◀</button>
      <button type="button" class="big main" :aria-label="timer ? '暂停' : '自动播放'" @click="play">{{ timer ? '⏸' : '▶️' }}</button>
      <button type="button" class="big" :disabled="last" aria-label="下一页" @click="next">▶</button>
    </div>
    <div v-if="last" class="row">
      <button type="button" class="btn" @click="replay">🔁 再看一次</button>
      <button type="button" class="btn primary" data-goto="play">🎮 去玩</button>
    </div>
  </div>
</template>

<style scoped>
.book { display: flex; flex-direction: column; gap: 16px; align-items: flex-start; }
.say { font-size: clamp(1.3rem, 5vw, 1.9rem); min-height: 2.6em; }
.dots { display: flex; gap: 6px; }
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
