<script setup lang="ts">
import { computed } from 'vue';
import { usePlayer } from './usePlayer';
import { BOOK_INTERVAL } from '../../../core/timing';

// 看：会动的绘本。台词 say 由引擎生成，画面通过默认插槽放。
const props = withDefaults(defineProps<{
  frames: { say: string }[];
  interval?: number;
  /** 末页按钮和翻页按钮的文字，按文案表传入 */
  againLabel: string;
  labels: Record<'prev' | 'auto' | 'pause' | 'next' | 'goPlay', string>;
}>(), { interval: BOOK_INTERVAL });
const emit = defineEmits<{ again: [] }>();

const frames = computed(() => props.frames);
const p = usePlayer(frames, [{ label: '', ms: props.interval }], 0);
const f = computed(() => frames.value[Math.min(p.idx.value, frames.value.length - 1)]);

function again() {
  p.reset();
  emit('again');
}
</script>

<template>
  <div class="book">
    <p class="say" aria-live="polite">{{ f.say }}</p>
    <slot :frame="f" :index="p.idx.value" />
    <div class="dots" aria-hidden="true">
      <span v-for="(_, i) in frames" :key="i" :class="{ on: i === p.idx.value }" />
    </div>
    <div class="nav">
      <button type="button" class="pager-btn" :disabled="p.atStart.value" :aria-label="labels.prev" @click="p.prev()">◀</button>
      <button type="button" class="pager-btn main" :aria-label="p.playing.value ? labels.pause : labels.auto" @click="p.toggle()">{{ p.playing.value ? '⏸' : '▶️' }}</button>
      <button type="button" class="pager-btn" :disabled="p.atEnd.value" :aria-label="labels.next" @click="p.next()">▶</button>
    </div>
    <div v-if="p.atEnd.value" class="row">
      <button type="button" class="btn" @click="again">{{ againLabel }}</button>
      <button type="button" class="btn primary" data-goto="play">{{ labels.goPlay }}</button>
    </div>
  </div>
</template>

<style scoped>
.book { display: flex; flex-direction: column; gap: 16px; align-items: flex-start; }
.say { font-size: clamp(1.3rem, 5vw, 1.9rem); min-height: 2.6em; }
</style>
