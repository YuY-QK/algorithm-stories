<script setup lang="ts">
import { computed, ref } from 'vue';
import { BOOK_EMOJI, CHALLENGE_LEN, genChallenge, judgeChallenge, simulate, type Challenge } from '../../engine/lru-cache';

// 做：挑战。看一串借书记录，先猜 LRU 能命中几次，再揭晓，并和 FIFO（满了放回最先上桌的）比一比。猜中 3 题过关。
const GOAL = 3;
const c = ref<Challenge>(genChallenge());
const input = ref('');
const msg = ref('');
const shown = ref(false);
const guess = ref(0);
const wins = ref(0);

const verdict = computed(() => judgeChallenge(c.value, guess.value));
const lruRow = computed(() => simulate(c.value.seq, c.value.cap, 'lru').map((a) => a.hit));
const fifoRow = computed(() => simulate(c.value.seq, c.value.cap, 'fifo').map((a) => a.hit));
const passed = computed(() => wins.value >= GOAL);

function submit() {
  if (shown.value) return;
  const g = parseInt(input.value, 10);
  if (isNaN(g) || g < 0 || g > CHALLENGE_LEN) {
    msg.value = '请输入 0 到 ' + CHALLENGE_LEN + ' 之间的整数。';
    return;
  }
  msg.value = '';
  guess.value = g;
  shown.value = true;
  if (judgeChallenge(c.value, g).diff === 0) wins.value++;
}

function next() {
  c.value = genChallenge();
  input.value = '';
  msg.value = '';
  shown.value = false;
}

const compare = computed(() => {
  const { lru, fifo } = verdict.value;
  return lru > fifo ? 'LRU 比 FIFO 多命中 ' + (lru - fifo) + ' 次：常借的书一直被挪到右边，没被赶走。'
    : lru < fifo ? '这一局 FIFO 反而多命中 ' + (fifo - lru) + ' 次，LRU 并不是每一局都赢。'
      : 'LRU 和 FIFO 命中一样多，这一局看不出差别。';
});
</script>

<template>
  <div class="stage">
    <p>管理员按下面的顺序借书，书桌放得下 <b>{{ c.cap }}</b> 本，满了放回最久没碰的（LRU）。先猜：<b>一共能命中几次？</b>（桌上本来就有，不用去书架）</p>
    <div class="seq" aria-label="借书顺序">
      <span v-for="(b, k) in c.seq" :key="k" class="req">
        <span class="em">{{ BOOK_EMOJI[b] }}</span><small>{{ b }}</small>
        <template v-if="shown">
          <i :class="lruRow[k] ? 'h' : 'm'" :title="lruRow[k] ? 'LRU 命中' : 'LRU 缺失'">{{ lruRow[k] ? '✅' : '🚶' }}</i>
          <i :class="fifoRow[k] ? 'h' : 'm'" :title="fifoRow[k] ? 'FIFO 命中' : 'FIFO 缺失'">{{ fifoRow[k] ? '✅' : '🚶' }}</i>
        </template>
      </span>
    </div>
    <div v-if="shown" class="legend small-note">每本书下面：第一行是 LRU，第二行是 FIFO（满了放回最先上桌的，不管碰没碰过）。</div>

    <div class="vars">
      <span class="chip"><small>容量</small>{{ c.cap }}</span>
      <span class="chip"><small>一共</small>{{ CHALLENGE_LEN }} 次借书</span>
      <span class="chip"><small>猜中</small>{{ Math.min(wins, GOAL) }} / {{ GOAL }}</span>
      <span v-if="passed" class="chip win">🏅 过关</span>
    </div>

    <form v-if="!shown" class="inline" @submit.prevent="submit">
      <label class="sr" for="lru-guess">LRU 命中几次</label>
      <input id="lru-guess" v-model="input" type="number" inputmode="numeric" min="0" :max="CHALLENGE_LEN" placeholder="命中几次">
      <button type="submit" class="btn small primary">揭晓</button>
    </form>
    <p v-if="msg" class="oops">{{ msg }}</p>

    <div v-else class="reveal" aria-live="polite">
      <p>
        <b>{{ verdict.diff === 0 ? '🎯 猜中了！' : '差 ' + verdict.diff + ' 次。' }}</b>
        你猜 {{ guess }}，LRU 命中 <b>{{ verdict.lru }}</b> 次，FIFO 命中 <b>{{ verdict.fifo }}</b> 次。
      </p>
      <p>{{ compare }}</p>
      <div class="row"><button type="button" class="btn small primary" @click="next">下一题</button></div>
    </div>
  </div>
</template>

<style scoped>
.seq { display: grid; grid-template-columns: repeat(auto-fill, minmax(34px, 1fr)); gap: 6px 4px; }
.req { display: flex; flex-direction: column; align-items: center; min-width: 0; line-height: 1.25; }
.req .em { font-size: 1.4rem; }
.req small { font: 400 10px var(--mono); color: var(--muted); }
.req i { font-style: normal; font-size: 0.9rem; }
.req i.m { opacity: 0.6; }
.win { border-color: var(--accent); color: var(--accent); }
.reveal { display: flex; flex-direction: column; gap: 10px; border-left: 3px solid var(--accent); padding-left: 12px; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
