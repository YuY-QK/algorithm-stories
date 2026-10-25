<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  BEAR, hideBear, KID_N, PLAY_QUIZ, PLAY_START, playSay, playStars, playSummary, tapBox, TOYS,
  type Cell, type PlayRow, type PlayState,
} from '../../engine/linear-search';
import { play } from '../../components/shared/sound';
import Boxes from './Boxes.vue';

// 玩法一「开箱子找小熊」：小熊由程序藏好，孩子自己点箱子。
// 引导：点开过的箱子会晃一下并提示；星星只看有没有重复开，不看运气；
// 玩过三局以后追问「最倒霉要开几个」「没有小熊呢」，让孩子自己说出「最坏要全开」。
const row = ref<PlayRow>(hideBear());
const st = ref<PlayState>(PLAY_START);
const shake = ref<[number, number] | null>(null);
const say = ref('🐻 小熊藏好啦！点一个箱子打开它');
const games = ref(0);
const quizAt = ref(0);
const quizState = ref<'ask' | 'right' | 'wrong'>('ask');

const cells = computed<Cell[]>(() =>
  row.value.ids.map((id, k) => {
    if (!st.value.opened.includes(k)) return { label: '', state: 'closed' };
    return { label: TOYS[id], state: id === BEAR ? 'hit' : 'seen' };
  }),
);
const earned = computed(() => playStars(st.value.repeats));
const quiz = computed(() => (games.value >= 3 && st.value.found ? PLAY_QUIZ[quizAt.value] ?? null : null));

function tap(k: number) {
  const { state, outcome } = tapBox(row.value, st.value, k);
  st.value = state;
  say.value = playSay(outcome, row.value, k);
  if (outcome === 'repeat') {
    shake.value = [k, (shake.value?.[1] ?? 0) + 1];
    play('wrong');
  } else if (outcome === 'found') {
    games.value++;
    play('win');
  } else if (outcome === 'open') {
    play('right');
  }
}

function answer(n: number) {
  const q = PLAY_QUIZ[quizAt.value];
  quizState.value = n === q.correct ? 'right' : 'wrong';
  play(n === q.correct ? 'right' : 'wrong');
}
function nextQuiz() {
  quizAt.value++;
  quizState.value = 'ask';
}

function again() {
  row.value = hideBear();
  st.value = PLAY_START;
  shake.value = null;
  say.value = '🐻 再藏一次！点一个箱子打开它';
  quizState.value = 'ask';
}
</script>

<template>
  <div class="game">
    <p class="small-note">目标：小熊藏在某个箱子里。点箱子把它打开找小熊，每个箱子只要开一次。</p>
    <p class="say" aria-live="polite">{{ say }}</p>
    <Boxes :cells="cells" :clickable="!st.found" :shake="shake" label="8 个玩具箱" @pick="tap" />
    <p class="count" aria-label="已经开了几个箱子">已开 <b>{{ st.opened.length }}</b> / {{ KID_N }}</p>

    <div v-if="st.found" class="result">
      <p class="stars" :aria-label="earned + ' 颗星'">
        <span v-for="s in 3" :key="s" :class="{ dim: s > earned }">⭐</span>
      </p>
      <p class="q">{{ playSummary(row, st) }}</p>

      <div v-if="quiz" class="quiz">
        <p class="q">{{ quiz.ask }}</p>
        <div v-if="quizState !== 'right'" class="choices">
          <button v-for="n in quiz.options" :key="n" type="button" class="choice" @click="answer(n)">{{ n }} 个</button>
        </div>
        <p v-if="quizState === 'wrong'" class="hint">{{ quiz.why }}</p>
        <template v-if="quizState === 'right'">
          <p class="q">🏅 {{ quiz.right }}</p>
          <button v-if="quizAt + 1 < PLAY_QUIZ.length" type="button" class="btn small" @click="nextQuiz">再问一个</button>
        </template>
      </div>

      <div class="row">
        <button type="button" class="btn primary" @click="again">🔁 再藏一次</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game { display: flex; flex-direction: column; gap: 16px; }
.say { font-size: clamp(1.2rem, 4.5vw, 1.8rem); min-height: 1.4em; }
.count { color: var(--muted); font-size: 0.95rem; }
.result { display: flex; flex-direction: column; gap: 14px; }
.stars { font-size: 2.2rem; line-height: 1; }
.stars .dim { filter: grayscale(1); opacity: 0.3; }
.quiz { display: flex; flex-direction: column; gap: 10px; }
.q { font-size: 1.15rem; max-width: 30em; }
.hint { color: var(--muted); max-width: 30em; }
.choices { display: flex; flex-wrap: wrap; gap: 10px; }
.choice {
  font: inherit; font-size: 1.1rem; cursor: pointer; min-height: 44px; min-width: 64px;
  padding: 8px 18px; border-radius: 12px; border: 1.5px solid var(--line); background: var(--surface); color: var(--fg);
}
.choice:hover { border-color: var(--accent); }
.choice:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
</style>
