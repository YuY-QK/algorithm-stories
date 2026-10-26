<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  CLASH_BOOKS, CLASH_FETCH, bucketOf, clashFetch, clashPiles, clashPut, clashSpot, clashStart, clashes, divText,
  type ClashMode,
} from '../../engine/hash-lookup';
import { PAUSE_BEAT, PAUSE_START } from '../../components/shared/timing';
import { play } from '../../components/shared/sound';
import { useStageStop } from '../../components/shared/usePlayer';
import Shelves from './Shelves.vue';

// 玩法二「撞了同一个书架怎么办」：放五本书，31、17、9 会撞。第一次撞时孩子选办法（叠起来 / 放旁边），
// 之后这局都用这个办法。放完借两本书，数一数各看了几本；两种办法都玩过，就能比一比。
const MODES: Record<ClashMode, { icon: string; name: string }> = {
  chain: { icon: '📚', name: '叠在一起' },
  probe: { icon: '➡️', name: '放到旁边空架' },
};

const mode = ref<ClashMode | null>(null);
const table = ref(clashStart());
const n = ref(0); // 已经放了几本
const phase = ref<'place' | 'choose' | 'placed' | 'fetch' | 'fetching' | 'done'>('place');
const keeper = ref<number | null>(null);
const clash = ref<number | null>(null);
const shake = ref<[number, number] | null>(null);
const wrongs = ref(0);
const f = ref(0); // 借第几本
const looks = ref(0);
const total = ref(0);
const say = ref('');
const record = ref<Partial<Record<ClashMode, number>>>({});

let timer: ReturnType<typeof setTimeout> | null = null;
function stopAll() {
  if (timer) clearTimeout(timer);
  timer = null;
}
useStageStop(stopAll);

const book = computed(() => CLASH_BOOKS[n.value]);
const want = computed(() => CLASH_FETCH[f.value]);
const piles = computed(() => clashPiles(table.value, mode.value ?? 'chain'));

function reset() {
  stopAll();
  mode.value = null;
  table.value = clashStart();
  n.value = 0;
  phase.value = 'place';
  keeper.value = null;
  clash.value = null;
  f.value = 0;
  looks.value = 0;
  total.value = 0;
  say.value = '📕 ' + CLASH_BOOKS[0] + ' 号书来了。点「放书」，管理员先算一算。';
}
reset();

function put() {
  const k = book.value;
  const m = mode.value ?? 'chain';
  keeper.value = bucketOf(k);
  if (clashes(table.value, m, k) && mode.value === null) {
    clash.value = bucketOf(k);
    play('wrong');
    phase.value = 'choose';
    say.value = '💥 ' + divText(k) + '，' + bucketOf(k) + ' 号架已经有书了！怎么办？';
    return;
  }
  settle(m, k);
}

function choose(m: ClashMode) {
  mode.value = m;
  clash.value = null;
  settle(m, book.value);
}

function settle(m: ClashMode, k: number) {
  const hit = clashes(table.value, m, k);
  const spot = clashSpot(table.value, m, k);
  table.value = clashPut(table.value, m, k);
  keeper.value = spot;
  clash.value = null;
  play('right');
  say.value = '👍 ' + k + ' 号书放在 ' + spot + ' 号架' + (hit ? (m === 'chain' ? '，叠在 ' + bucketOf(k) + ' 号架的书上面' : '，' + bucketOf(k) + ' 号架满了，往后找到空架') : '');
  phase.value = 'placed';
}

function next() {
  if (n.value >= CLASH_BOOKS.length - 1) {
    n.value++;
    phase.value = 'fetch';
    keeper.value = null;
    say.value = '📖 书都放好了。现在有人来借 ' + want.value + ' 号书：点它该去的书架。';
    return;
  }
  n.value++;
  phase.value = 'place';
  keeper.value = null;
  say.value = '📕 ' + book.value + ' 号书来了。点「放书」。';
}

function tapShelf(i: number) {
  if (phase.value !== 'fetch') return;
  if (i !== bucketOf(want.value)) {
    play('wrong');
    wrongs.value++;
    shake.value = [i, wrongs.value];
    say.value = '🤔 ' + divText(want.value) + '，先去余数那一架';
    return;
  }
  const res = clashFetch(table.value, mode.value!, want.value);
  phase.value = 'fetching';
  looks.value = 0;
  let k = 0;
  say.value = '🚶 一本一本看……';
  const tick = () => {
    keeper.value = res.path[k];
    k++;
    looks.value = k;
    if (k < res.path.length) timer = setTimeout(tick, PAUSE_BEAT);
    else {
      total.value += res.looks;
      play('right');
      say.value = '找到 ' + want.value + ' 号书，一共看了 ' + res.looks + ' 本/架';
      timer = setTimeout(afterFetch, PAUSE_BEAT * 2);
    }
  };
  timer = setTimeout(tick, PAUSE_START);
}

function afterFetch() {
  if (f.value >= CLASH_FETCH.length - 1) {
    phase.value = 'done';
    record.value = { ...record.value, [mode.value!]: total.value };
    play('win');
    say.value = '两本书借完了，一共看了 ' + total.value + ' 次';
  } else {
    f.value++;
    phase.value = 'fetch';
    keeper.value = null;
    say.value = '再借 ' + want.value + ' 号书：点它该去的书架。';
  }
}

const both = computed(() => record.value.chain !== undefined && record.value.probe !== undefined);
const other = computed<ClashMode>(() => (mode.value === 'chain' ? 'probe' : 'chain'));
</script>

<template>
  <div class="game">
    <p class="small-note">目标：两本书算出同一个书架时，想办法放下它们。放完再借两本书，看看哪个办法走得少。</p>
    <div class="top">
      <span v-if="phase !== 'fetch' && phase !== 'fetching' && phase !== 'done' && n < CLASH_BOOKS.length" class="held" aria-label="手里的书">📕 {{ book }}</span>
      <span v-else-if="phase !== 'done'" class="held" aria-label="要借的书">🔎 {{ want }}</span>
      <span v-if="mode" class="chip"><small>办法</small>{{ MODES[mode].icon }} {{ MODES[mode].name }}</span>
      <span v-if="phase === 'fetching' || phase === 'done'" class="chip"><small>看了</small>{{ phase === 'done' ? total : total + looks }}</span>
    </div>
    <p class="say" aria-live="polite">{{ say }}</p>
    <Shelves :piles="piles" :keeper="keeper" :clash="clash" :shake="shake" :clickable="phase === 'fetch'" @pick="tapShelf" />

    <div class="row">
      <button v-if="phase === 'place'" type="button" class="btn primary" @click="put">📍 放书</button>
      <button v-if="phase === 'placed'" type="button" class="btn primary" @click="next">{{ n >= CLASH_BOOKS.length - 1 ? '去借书 ▶' : '下一本 ▶' }}</button>
    </div>
    <div v-if="phase === 'choose'" class="choices">
      <button v-for="m in (['chain', 'probe'] as ClashMode[])" :key="m" type="button" class="choice" @click="choose(m)">
        <span class="ic" aria-hidden="true">{{ MODES[m].icon }}</span>{{ MODES[m].name }}
      </button>
    </div>

    <div v-if="phase === 'done'" class="result">
      <h3>{{ MODES[mode!].icon }} 「{{ MODES[mode!].name }}」：借两本书一共看了 {{ total }} 次</h3>
      <p v-if="!both">换另一个办法再玩一局，比一比谁走得少。</p>
      <p v-else>📚 叠在一起 {{ record.chain }} 次，➡️ 放到旁边 {{ record.probe }} 次。书越多，撞得越多，要多走的路也越多。</p>
      <div class="row">
        <button type="button" class="btn primary" @click="reset">🔁 {{ both ? '再玩一局' : '换个办法再玩一局' }}</button>
      </div>
      <p v-if="!both" class="small-note">下一局第一次撞的时候，选「{{ MODES[other].name }}」。</p>
    </div>
  </div>
</template>

<style scoped>
.game { display: flex; flex-direction: column; gap: 14px; }
.top { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; min-height: 2.6em; }
.held { font: 700 1.6rem var(--mono); padding: 4px 14px; border-radius: 10px; border: 1.5px solid var(--line); background: var(--surface); }
.say { font-size: clamp(1.1rem, 4vw, 1.5rem); min-height: 2.8em; }
.choices { display: flex; flex-wrap: wrap; gap: 10px; }
.choice {
  font: inherit; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 6px; min-width: 120px;
  padding: 12px 16px; border-radius: 12px; border: 1.5px solid var(--line); background: var(--surface); color: var(--fg);
}
.choice:hover { border-color: var(--accent); }
.choice:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
.ic { font-size: 1.8rem; }
</style>
