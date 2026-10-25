<script setup lang="ts">
import { computed, ref } from 'vue';
import { CHALLENGE_LIMIT, CHALLENGE_MAX, genChallenge, middle } from '../../engine/binary-search';

// 做：挑战。1 到 1000 里猜一个数，10 次以内猜中过关。
const secret = ref(0);
const lo = ref(1);
const hi = ref(CHALLENGE_MAX);
const log = ref<{ g: number; dir: 'up' | 'down' | 'hit'; mid: number }[]>([]);
const input = ref('');
const msg = ref('');
const state = ref<'play' | 'win' | 'lose'>('play');

function fresh() {
  secret.value = genChallenge();
  lo.value = 1;
  hi.value = CHALLENGE_MAX;
  log.value = [];
  input.value = '';
  msg.value = '';
  state.value = 'play';
}
fresh();

function guess() {
  if (state.value !== 'play') return;
  const g = parseInt(input.value, 10);
  if (isNaN(g) || g < 1 || g > CHALLENGE_MAX) {
    msg.value = '请输入 1 到 ' + CHALLENGE_MAX + ' 之间的整数。';
    return;
  }
  if (g < lo.value || g > hi.value) {
    msg.value = g + ' 已经被排除了，答案在 ' + lo.value + ' 到 ' + hi.value + ' 之间。这次不算。';
    return;
  }
  msg.value = '';
  const dir = g === secret.value ? 'hit' : g < secret.value ? 'up' : 'down';
  log.value.push({ g, dir, mid: middle(lo.value, hi.value) });
  input.value = '';
  if (dir === 'hit') state.value = 'win';
  else {
    if (dir === 'up') lo.value = g + 1;
    else hi.value = g - 1;
    if (log.value.length >= CHALLENGE_LIMIT) state.value = 'lose';
  }
}

const left = computed(() => CHALLENGE_LIMIT - log.value.length);
const pct = (v: number) => ((v - 1) / (CHALLENGE_MAX - 1)) * 100 + '%';
</script>

<template>
  <div class="stage">
    <p>我想好了一个 1 到 {{ CHALLENGE_MAX }} 之间的整数。你最多猜 {{ CHALLENGE_LIMIT }} 次，每次我会告诉你大了还是小了。</p>
    <div class="range" aria-hidden="true">
      <div class="live" :style="{ left: pct(lo), width: 'calc(' + pct(hi) + ' - ' + pct(lo) + ' + 3px)' }" />
      <span v-for="(e, k) in log" :key="k" class="tick" :class="e.dir" :style="{ left: pct(e.g) }" />
    </div>
    <div class="vars">
      <span class="chip"><small>还可能是</small>{{ lo }} ～ {{ hi }}</span>
      <span class="chip"><small>还剩</small>{{ left }} 次</span>
    </div>
    <form v-if="state === 'play'" class="inline" @submit.prevent="guess">
      <label class="sr" for="bs-guess">你猜</label>
      <input id="bs-guess" v-model="input" type="number" inputmode="numeric" min="1" :max="CHALLENGE_MAX" placeholder="你猜">
      <button type="submit" class="btn small primary">猜</button>
    </form>
    <p v-if="msg" class="oops">{{ msg }}</p>
    <ol class="log">
      <li v-for="(e, k) in log" :key="k">
        <span class="mono">{{ e.g }}</span>
        {{ e.dir === 'hit' ? '🎉 就是它' : e.dir === 'up' ? '⬆️ 小了，答案更大' : '⬇️ 大了，答案更小' }}
        <small v-if="state !== 'play' && e.g !== e.mid" class="hint">（当时的正中间是 {{ e.mid }}）</small>
      </li>
    </ol>
    <div v-if="state === 'win'" class="result">
      <h3>🏅 {{ log.length }} 次猜中 {{ secret }}，挑战成功！</h3>
      <p>每次都猜剩下范围的正中间，1000 个数最多 {{ CHALLENGE_LIMIT }} 次，因为 2¹⁰ = 1024 ≥ 1000。</p>
      <button type="button" class="btn small" @click="fresh">再来一局</button>
    </div>
    <div v-if="state === 'lose'" class="result">
      <h3>{{ CHALLENGE_LIMIT }} 次用完了，答案是 {{ secret }}。</h3>
      <p>提示：每次都猜剩下范围的正中间，一次就能排除一半。</p>
      <button type="button" class="btn small" @click="fresh">再来一局</button>
    </div>
  </div>
</template>

<style scoped>
.range { position: relative; height: 14px; border-radius: 7px; background: var(--out); }
.live { position: absolute; top: 0; bottom: 0; border-radius: 7px; background: var(--accent); opacity: 0.6; transition: left 0.3s, width 0.3s; }
.tick { position: absolute; top: -4px; bottom: -4px; width: 3px; margin-left: -1px; border-radius: 2px; background: var(--fg); }
.tick.hit { background: var(--mid); }
.inline { display: flex; gap: 8px; align-items: center; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
.log { margin: 0; padding-left: 1.6em; display: flex; flex-direction: column; gap: 4px; }
.mono { font: 600 15px var(--mono); display: inline-block; min-width: 3em; }
.hint { color: var(--muted); }
</style>
