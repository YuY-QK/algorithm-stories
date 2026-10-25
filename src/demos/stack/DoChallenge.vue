<script setup lang="ts">
import { computed, ref } from 'vue';
import { CHALLENGE_COUNT, CHALLENGE_N, canPop, genChallenge, permTrace } from '../../engine/stack';
import Transport from '../../components/shared/Transport.vue';
import { usePlayer } from '../../components/shared/usePlayer';

// 做：挑战。1 到 5 依次入栈，中间随时可以出栈。给一个出栈顺序，先判断能不能做到，再看栈实际演一遍。
const COUNT = CHALLENGE_COUNT;
const puzzles = ref<number[][]>(genChallenge());
const q = ref(0);
const answer = ref<boolean | null>(null);
const score = ref(0);
const want = computed(() => puzzles.value[q.value]);
const truth = computed(() => canPop(CHALLENGE_N, want.value));
const steps = computed(() => permTrace(CHALLENGE_N, want.value));
const p = usePlayer(steps);
const st = computed(() => p.step.value);
const waiting = computed(() => Array.from({ length: CHALLENGE_N - st.value.next + 1 }, (_, k) => st.value.next + k));
const finished = computed(() => q.value === COUNT - 1 && answer.value !== null && st.value.done);

function judge(yes: boolean) {
  if (answer.value !== null) return;
  answer.value = yes;
  if (yes === truth.value) score.value++;
  p.reset();
  p.toggle();
}

function nextQ() {
  q.value++;
  answer.value = null;
}

function restart() {
  puzzles.value = genChallenge();
  q.value = 0;
  score.value = 0;
  answer.value = null;
}
</script>

<template>
  <div class="stage">
    <p>1 到 {{ CHALLENGE_N }} 按顺序排队入栈，中间随时可以把栈顶拿出来。下面这个出栈顺序，能做到吗？先判断，再看栈演一遍。</p>
    <div class="vars">
      <span class="chip"><small>第</small>{{ q + 1 }} / {{ COUNT }} 题</span>
      <span class="chip"><small>答对</small>{{ score }}</span>
    </div>

    <div class="lane">
      <span class="lname">目标顺序</span>
      <div class="nums">
        <span v-for="(v, k) in want" :key="k" class="nt" :class="{ got: answer !== null && k < st.out.length, stuck: answer !== null && st.action === 'stuck' && k === st.out.length }">{{ v }}</span>
      </div>
    </div>

    <template v-if="answer !== null">
      <div class="lane">
        <span class="lname">排队等入栈</span>
        <div class="nums">
          <span v-for="v in waiting" :key="v" class="nt dim">{{ v }}</span>
          <span v-if="!waiting.length" class="none">（都进去了）</span>
        </div>
      </div>
      <div class="lane">
        <span class="lname">栈（右边是栈顶）</span>
        <div class="nums box">
          <span v-for="(v, k) in st.stack" :key="v" class="nt" :class="{ topn: k === st.stack.length - 1 }">{{ v }}</span>
          <span v-if="!st.stack.length" class="none">空</span>
        </div>
      </div>
      <p class="note" aria-live="polite">{{ st.note }}</p>
      <Transport :player="p" />
    </template>

    <div v-if="answer === null" class="answers">
      <button type="button" class="btn primary" @click="judge(true)">✅ 能做到</button>
      <button type="button" class="btn" @click="judge(false)">❌ 做不到</button>
    </div>

    <p v-if="answer !== null && st.done" class="summary" aria-live="polite">
      {{ answer === truth ? '👍 判断对了' : '🤔 判断错了' }}：{{ truth ? '能做到' : '做不到' }}。
    </p>
    <div v-if="answer !== null && st.done && !finished" class="row">
      <button type="button" class="btn small primary" @click="nextQ">下一题</button>
    </div>

    <div v-if="finished" class="result">
      <h3>{{ score === COUNT ? '🏅 ' : '' }}{{ COUNT }} 题答对 {{ score }} 题{{ score === COUNT ? '，挑战成功！' : '' }}</h3>
      <p>窍门：一个数出栈时，比它小、还在栈里的数只能按从大到小的顺序出来。所以只要出现「先出一个大的，后面先小后中」（比如 3 … 1 … 2），就做不到。</p>
      <p>1 到 5 的 120 种顺序里，能做到的只有 42 种（卡特兰数）。LeetCode 946「验证栈序列」就是这道题，代码就是上面这段演示的贪心：想要的数不在栈顶就一直入栈，它被压在下面就做不到。</p>
      <button type="button" class="btn small" @click="restart">再来一组</button>
    </div>
  </div>
</template>

<style scoped>
.lane { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; }
.lname { font-size: 13px; color: var(--muted); width: 8.5em; flex: none; }
.nums { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; min-height: 40px; }
.nums.box { padding: 3px 6px; border: 2px solid var(--line); border-right: 0; border-radius: 8px 0 0 8px; background: var(--bg); min-width: 60px; }
.nt {
  width: 36px; height: 36px; display: grid; place-items: center; box-sizing: border-box;
  font: 600 15px var(--mono); border: 1.5px solid var(--line); border-radius: 8px; background: var(--surface); color: var(--fg);
  transition: background 0.2s, color 0.2s;
}
.nt.dim { color: var(--muted); }
.nt.got { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
.nt.stuck { border-color: var(--warn); color: var(--warn); box-shadow: 0 0 0 2px var(--warn); }
.nt.topn { background: var(--mid); color: var(--mid-ink); border-color: var(--mid); }
.none { font-size: 13px; color: var(--muted); }
</style>
