<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { KID_N, robotFrames, robotNote, type RobotFrame, type Tally, type Cell } from '../../engine/linear-search';
import { useStageStop } from '../../components/shared/usePlayer';
import { FOLLOW_STEP } from '../../components/shared/timing';
import { play } from '../../components/shared/sound';
import Boxes from './Boxes.vue';

// 玩法二「藏小熊」：孩子选一个箱子藏小熊（或者不藏），小机器人从左往右一个个开。
// 引导：记下每次开了几个，试过最前面和最后面以后，说出「越靠后越慢，没有捷径」。
const frames = ref<RobotFrame[]>([]);
const at = ref(0);
const hidden = ref<number | null | undefined>(undefined);
const running = ref(false);
const tally = ref<Tally>([]);
let timer: ReturnType<typeof setTimeout> | null = null;

const closed: Cell[] = Array.from({ length: KID_N }, () => ({ label: '', state: 'closed' }));
const cur = computed(() => frames.value[at.value]);
const cells = computed(() => cur.value?.cells ?? closed);
const say = computed(() => cur.value?.say ?? '🐻 选一个箱子，把小熊藏进去吧');
const note = computed(() => robotNote(tally.value));

function stop() {
  if (timer) clearTimeout(timer);
  timer = null;
  running.value = false;
}
useStageStop(stop);
onBeforeUnmount(stop);

function tick() {
  if (at.value >= frames.value.length - 1) {
    running.value = false;
    const last = frames.value[at.value];
    const key = hidden.value ?? null;
    tally.value = [...tally.value.filter((t) => t.at !== key), { at: key, count: last.count }].sort((a, b) => (a.at ?? KID_N) - (b.at ?? KID_N));
    play('win');
    return;
  }
  at.value++;
  play('tick');
  timer = setTimeout(tick, FOLLOW_STEP);
}

function start(h: number | null) {
  if (running.value) return;
  hidden.value = h;
  frames.value = robotFrames(h);
  at.value = 0;
  running.value = true;
  play('tap');
  timer = setTimeout(tick, FOLLOW_STEP);
}
const label = (t: { at: number | null; count: number }) => (t.at === null ? '不藏' : '第 ' + (t.at + 1) + ' 个') + '：' + t.count + ' 个';
</script>

<template>
  <div class="game">
    <p class="small-note">目标：你来藏小熊，小机器人从左往右一个个找。试试藏在不同的地方，看它要开几个。</p>
    <p class="say" aria-live="polite">{{ say }}</p>
    <Boxes :cells="cells" :pointer="cur ? cur.pointer : -1" kid="🤖" label="8 个玩具箱" />

    <div class="pick">
      <p class="small-note">把小熊藏在：</p>
      <div class="picks">
        <button v-for="k in KID_N" :key="k" type="button" class="btn small" :disabled="running" :aria-label="'藏在第 ' + k + ' 个'" @click="start(k - 1)">{{ k }}</button>
        <button type="button" class="btn small" :disabled="running" @click="start(null)">不藏</button>
      </div>
    </div>

    <div v-if="tally.length" class="tally" aria-label="试过的结果">
      <span v-for="t in tally" :key="String(t.at)" class="chip">{{ label(t) }}</span>
    </div>
    <p class="q" aria-live="polite">{{ note }}</p>
  </div>
</template>

<style scoped>
.game { display: flex; flex-direction: column; gap: 16px; }
.say { font-size: clamp(1.2rem, 4.5vw, 1.8rem); min-height: 1.4em; }
.picks { display: flex; flex-wrap: wrap; gap: 8px; }
.picks .btn { min-width: 44px; min-height: 44px; }
.tally { display: flex; flex-wrap: wrap; gap: 8px; }
.q { font-size: 1.1rem; max-width: 32em; }
</style>
