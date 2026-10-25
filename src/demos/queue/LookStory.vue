<script setup lang="ts">
import { computed } from 'vue';
import { lookFrames, SEATS, type LookPage } from '../../engine/queue';
import BookPager from '../../components/shared/BookPager.vue';
import Seats from './Seats.vue';

// 看：会动的绘本。每一页的台词和椅子都由 lookFrames 真正执行入队、出队得到。
const frames = lookFrames();

/** 队头、队尾的小标签 */
function tagsOf(f: LookPage) {
  const t: Record<number, string> = {};
  const { head, size } = f;
  if (size === 0) return t;
  const tail = (head + size - 1) % SEATS;
  t[head] = size === 1 ? '队头·队尾' : '队头';
  if (size > 1) t[tail] = '队尾';
  return t;
}
const tagList = computed(() => frames.map(tagsOf));
const labelOf = (f: LookPage, tags: Record<number, string>) =>
  f.seats.map((v, i) => i + ' 号椅子' + (v ? '：' + v : '：空') + (tags[i] ? '，' + tags[i] : ''));
</script>

<template>
  <BookPager :frames="frames" again-label="🔁 从头再看一次">
    <template #default="{ frame: f, index }">
      <Seats
        :seats="f.seats" :ring="f.ring" :tags="tagList[index]" :head="f.size ? f.head : null"
        :glow="f.glow" center="🧑‍🍳🧋" empty="🪑" :labels="labelOf(f, tagList[index])"
      />
      <p class="served" aria-label="已经买到奶茶的">
        <span class="cup" aria-hidden="true">🧋</span>
        <span v-for="(a, i) in f.served" :key="i">{{ a }}</span>
      </p>
    </template>
  </BookPager>
</template>

<style scoped>
.served { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; min-height: 1.8em; font-size: 1.4rem; }
.cup { padding-right: 6px; margin-right: 4px; border-right: 1.5px solid var(--line); }
</style>
