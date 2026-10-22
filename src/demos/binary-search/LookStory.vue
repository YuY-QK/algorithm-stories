<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { KID_N, middle, narrow, postmanTrace, type Dir } from '../../engine/binary-search';
import { STAGE_CHANGE_EVENT } from '../../components/shared/usePlayer';
import Street from './Street.vue';

// 看：会动的绘本。画面全部由 postmanTrace 生成，和真实的二分过程一致。
interface Frame {
  say: string;
  lo: number;
  hi: number;
  postman: number;
  doors: Record<number, Dir>;
  letter: number | null;
}

const secret = ref(11);

const frames = computed<Frame[]>(() => {
  const probes = postmanTrace(KID_N, secret.value);
  const out: Frame[] = [];
  let doors: Record<number, Dir> = {};
  out.push({ say: '信藏在一个信箱里 ✉️ 小邮差 🐰 要找到它', lo: 1, hi: KID_N, postman: 0, doors, letter: null });
  out.push({ say: '一个一个找？太慢啦 🐢 小邮差的秘诀：先去正中间！', lo: 1, hi: KID_N, postman: middle(1, KID_N), doors, letter: null });
  for (const p of probes) {
    doors = { ...doors, [p.at]: p.dir };
    if (p.dir === 'hit') {
      out.push({ say: '找到啦 🎉 只看了 ' + probes.length + ' 次！', lo: p.at, hi: p.at, postman: p.at, doors, letter: p.at });
      break;
    }
    out.push({ say: '门上说：信在' + (p.dir === 'left' ? '左边 ⬅️' : '右边 ➡️'), lo: p.lo, hi: p.hi, postman: p.at, doors, letter: null });
    const r = narrow(p.lo, p.hi, p.at, p.dir);
    out.push({ say: (p.dir === 'left' ? '右' : '左') + '边一半都不用看了 👋 再去剩下的正中间', lo: r.lo, hi: r.hi, postman: middle(r.lo, r.hi), doors, letter: null });
  }
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
function another() {
  stop();
  let s = secret.value;
  while (s === secret.value) s = 1 + Math.floor(Math.random() * KID_N);
  secret.value = s;
  k.value = 0;
}

onMounted(() => window.addEventListener(STAGE_CHANGE_EVENT, stop));
onBeforeUnmount(() => { stop(); window.removeEventListener(STAGE_CHANGE_EVENT, stop); });
</script>

<template>
  <div class="book">
    <p class="say" aria-live="polite">{{ f.say }}</p>
    <Street :n="KID_N" :lo="f.lo" :hi="f.hi" :postman="f.postman" :doors="f.doors" :letter="f.letter" />
    <div class="dots" aria-hidden="true">
      <span v-for="(_, i) in frames" :key="i" :class="{ on: i === k }" />
    </div>
    <div class="nav">
      <button type="button" class="big" :disabled="k === 0" aria-label="上一页" @click="prev">◀</button>
      <button type="button" class="big main" :aria-label="timer ? '暂停' : '自动播放'" @click="play">{{ timer ? '⏸' : '▶️' }}</button>
      <button type="button" class="big" :disabled="last" aria-label="下一页" @click="next">▶</button>
    </div>
    <div v-if="last" class="row">
      <button type="button" class="btn" @click="another">✉️ 换个信箱再看一次</button>
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
