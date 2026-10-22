<script setup lang="ts">
import { computed, ref } from 'vue';
import { KID_N, middle, narrow, pointTo, stars, type Dir } from '../../engine/binary-search';
import Street from './Street.vue';

// 玩法二「当小邮差」：信由程序藏好，孩子自己点信箱找。
// 引导：点灰信箱会摇头；第一次排除时追问「灰色的还要看吗」；连续两局不到三颗星，
// 可以看小邮差的秘诀（正中间一闪一闪）；拿到三颗星后问「点哪里最快」，让孩子自己说出「中间」。
const pick = () => 1 + Math.floor(Math.random() * KID_N);

const secret = ref(pick());
const lo = ref(1);
const hi = ref(KID_N);
const at = ref(0);
const doors = ref<Record<number, Dir>>({});
const tries = ref(0);
const done = ref(false);
const shake = ref<[number, number] | null>(null);
const say = ref('🐰 现在你是小邮差！点一个信箱找信 ✉️');

const lowRounds = ref(0);
const hint = ref(false);
const asked = ref(false);
const quiz = ref<'ask' | 'right' | 'wrong' | null>(null);
let greyTold = false;

const earned = computed(() => stars(tries.value));
const pulse = computed(() => (hint.value && !done.value ? middle(lo.value, hi.value) : null));

function tap(i: number) {
  if (done.value) return;
  if (i < lo.value || i > hi.value) {
    shake.value = [i, (shake.value?.[1] ?? 0) + 1];
    say.value = '🙅 灰色的信箱里没有信';
    return;
  }
  tries.value++;
  at.value = i;
  const d = pointTo(secret.value, i);
  doors.value = { ...doors.value, [i]: d };
  if (d === 'hit') return finish();
  ({ lo: lo.value, hi: hi.value } = narrow(lo.value, hi.value, i, d));
  if (!greyTold) {
    greyTold = true;
    say.value = '信在' + (d === 'left' ? '左边 ⬅️' : '右边 ➡️') + ' 那灰色的还要看吗？🤔';
  } else {
    say.value = '信在' + (d === 'left' ? '左边 ⬅️' : '右边 ➡️');
  }
}

function finish() {
  done.value = true;
  say.value = '🎉 找到啦！用了 ' + tries.value + ' 次';
  if (earned.value === 3) {
    lowRounds.value = 0;
    if (!asked.value) {
      asked.value = true;
      quiz.value = 'ask';
    }
  } else {
    lowRounds.value++;
  }
}

function answerQuiz(where: 'edge' | 'middle') {
  quiz.value = where === 'middle' ? 'right' : 'wrong';
}

function again() {
  secret.value = pick();
  lo.value = 1;
  hi.value = KID_N;
  at.value = 0;
  doors.value = {};
  tries.value = 0;
  done.value = false;
  say.value = hint.value ? '💡 点一闪一闪的那个信箱试试' : '🐰 再找一封信 ✉️';
}

function useHint() {
  hint.value = true;
  lowRounds.value = 0;
  again();
}
</script>

<template>
  <div class="game">
    <p class="say" aria-live="polite">{{ say }}</p>
    <Street
      :n="KID_N" :lo="lo" :hi="hi" :postman="at" :doors="doors"
      :letter="done ? secret : null" :pulse="pulse" :shake="shake"
      :clickable="!done" @pick="tap"
    />
    <p class="tries" aria-label="已经点了几次">
      <span v-for="t in tries" :key="t">👆</span>
    </p>

    <div v-if="done" class="result">
      <p class="stars" :aria-label="earned + ' 颗星'">
        <span v-for="s in 3" :key="s" :class="{ dim: s > earned }">⭐</span>
      </p>

      <div v-if="quiz === 'ask'" class="quiz">
        <p class="q">🤔 点哪里最快？</p>
        <div class="choices">
          <button type="button" class="choice" @click="answerQuiz('edge')"><span class="mini"><b /><i /><i /><i /><i /></span>最边上</button>
          <button type="button" class="choice" @click="answerQuiz('middle')"><span class="mini"><i /><i /><b /><i /><i /></span>正中间</button>
          <button type="button" class="choice" @click="answerQuiz('edge')"><span class="mini"><i /><i /><i /><i /><b /></span>另一边</button>
        </div>
      </div>
      <p v-else-if="quiz === 'right'" class="q">🏅 对啦！点正中间，一下就能排除一半。这就是小邮差的秘诀！</p>
      <p v-else-if="quiz === 'wrong'" class="q">🤔 下一局都点那里试试，数数要几次？再和点正中间比一比。</p>

      <div class="row">
        <button type="button" class="btn primary" @click="again">🔁 再找一封</button>
        <button v-if="lowRounds >= 2 && !hint" type="button" class="btn" @click="useHint">💡 看看小邮差的秘诀</button>
        <button v-if="hint" type="button" class="btn" @click="hint = false; again()">🙈 关掉秘诀，自己找</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game { display: flex; flex-direction: column; gap: 16px; }
.say { font-size: clamp(1.3rem, 5vw, 1.9rem); min-height: 1.4em; }
.tries { min-height: 1.6em; font-size: 1.2rem; letter-spacing: 2px; }
.result { display: flex; flex-direction: column; gap: 14px; }
.stars { font-size: 2.4rem; line-height: 1; }
.stars .dim { filter: grayscale(1); opacity: 0.3; }
.quiz { display: flex; flex-direction: column; gap: 10px; }
.q { font-size: 1.2rem; max-width: 30em; }
.choices { display: flex; flex-wrap: wrap; gap: 10px; }
.choice {
  font: inherit; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 10px 14px; border-radius: 12px; border: 1.5px solid var(--line); background: var(--surface); color: var(--fg);
}
.choice:hover { border-color: var(--accent); }
.choice:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
.mini { display: flex; gap: 3px; }
.mini i, .mini b { width: 12px; height: 18px; border-radius: 4px 4px 2px 2px; border: 1.5px solid var(--line); }
.mini b { background: var(--mid); border-color: var(--mid); }
</style>
