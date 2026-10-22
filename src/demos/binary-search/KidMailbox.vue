<script setup lang="ts">
import { computed, ref } from 'vue';
import { kidGuess, kidNarrow, type KidAnswer } from '../../engine/binary-search';

// 初级：小邮差猜信箱。用户心里想一个号码，小邮差每次猜剩下范围的正中间。
const N = 100;

interface State {
  lo: number;
  hi: number;
  count: number;
  guess: number | null;
  mode: 'play' | 'done' | 'broken';
  found: number | null;
}

const fresh = (): State => ({ lo: 1, hi: N, count: 1, guess: kidGuess(1, N), mode: 'play', found: null });
const s = ref<State>(fresh());
const hist = ref<State[]>([]);

const playing = computed(() => s.value.mode === 'play');

function houseClass(i: number) {
  const { mode, lo, hi, found, guess } = s.value;
  const out = mode === 'broken' ? true : mode === 'done' ? i !== found : i < lo || i > hi;
  return { out, guess: mode === 'play' && i === guess, found: mode === 'done' && i === found };
}

function answer(a: KidAnswer) {
  if (!playing.value) return;
  hist.value.push({ ...s.value });
  const cur = s.value;
  if (a === 'hit') {
    s.value = { ...cur, mode: 'done', found: cur.guess };
    return;
  }
  const r = kidNarrow(cur.lo, cur.hi, a);
  s.value = r.empty
    ? { ...cur, lo: r.lo, hi: r.hi, mode: 'broken', guess: null }
    : { ...cur, lo: r.lo, hi: r.hi, count: cur.count + 1, guess: kidGuess(r.lo, r.hi) };
}

function undo() {
  const h = hist.value.pop();
  if (h) s.value = h;
}

function restart() {
  s.value = fresh();
  hist.value = [];
}
</script>

<template>
  <div class="houses" aria-label="1 到 100 号信箱">
    <div v-for="i in N" :key="i" class="house" :class="houseClass(i)">{{ i }}</div>
  </div>
  <div class="ask">
    <p class="say" aria-live="polite">
      <template v-if="s.mode === 'play'">我猜，是 <b>{{ s.guess }}</b> 号？</template>
      <template v-else-if="s.mode === 'done'">找到啦，是 <b>{{ s.found }}</b> 号！</template>
      <template v-else>咦，信箱街里没有这个号码了。</template>
    </p>
    <div class="answers">
      <button type="button" class="btn" :disabled="!playing" @click="answer('smaller')">我的号码比 {{ s.guess ?? '' }} 小</button>
      <button type="button" class="btn primary" :disabled="!playing" @click="answer('hit')">就是 {{ s.guess ?? '' }}</button>
      <button type="button" class="btn" :disabled="!playing" @click="answer('bigger')">我的号码比 {{ s.guess ?? '' }} 大</button>
    </div>
    <p class="status">
      <template v-if="s.mode === 'play'">第 {{ s.count }} 次猜 · 还剩 {{ s.hi - s.lo + 1 }} 个可能</template>
      <template v-else-if="s.mode === 'done'">一共猜了 {{ s.count }} 次</template>
      <template v-else>提示前后矛盾，点「撤销上一步」回到上一次猜测。</template>
    </p>
    <div class="row">
      <button type="button" class="link" :disabled="hist.length === 0" @click="undo">撤销上一步</button>
      <button type="button" class="link" @click="restart">重新开始</button>
    </div>
  </div>
  <div v-if="s.mode === 'done'" class="result">
    <h3>小邮差只猜了 {{ s.count }} 次就找到了 {{ s.found }} 号。</h3>
    <p>一个一个挨着找，最坏要找 100 次。小邮差每次都猜剩下范围的正中间，一次就能排除一半的信箱。</p>
    <p class="tip">再玩几局试试：不管你想的是几号，小邮差最多猜 7 次。</p>
    <button type="button" class="btn primary" @click="restart">再玩一局</button>
  </div>
</template>

<style scoped>
.houses { display: grid; grid-template-columns: repeat(10, 1fr); gap: 4px; max-width: 460px; }
.house {
  aspect-ratio: 1; display: grid; place-items: center;
  font: 500 12px var(--mono); border-radius: 6px;
  background: var(--surface); border: 1.5px solid var(--line); color: var(--fg);
  transition: background 0.25s, color 0.25s, border-color 0.25s;
}
.house.out { background: var(--out); border-color: transparent; color: var(--out-ink); }
.house.guess { background: var(--mid); border-color: var(--mid); color: var(--mid-ink); font-weight: 600; }
.house.found { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); font-weight: 600; }
</style>
