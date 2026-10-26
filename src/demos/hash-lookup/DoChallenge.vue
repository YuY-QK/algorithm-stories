<script setup lang="ts">
import { computed, ref } from 'vue';
import { CHALLENGE_CAPS, CHALLENGE_LIMIT, chainStats, genChallenge } from '../../engine/hash-lookup';
import { play } from '../../components/shared/sound';

// 做：挑战。8 本书的书号是同一个数的 1 到 8 倍，选一个书架数，让最高的一摞不超过 2 本。
const keys = ref(genChallenge());
const cap = ref<number | null>(null);
const tries = ref(0);
const won = ref(false);

const stats = computed(() => (cap.value === null ? null : chainStats(keys.value, cap.value)));
const maxCount = computed(() => Math.max(1, ...(stats.value?.counts ?? [1])));

function choose(c: number) {
  cap.value = c;
  tries.value++;
  const st = chainStats(keys.value, c);
  if (st.longest <= CHALLENGE_LIMIT) {
    won.value = true;
    play('win');
  } else play('wrong');
}
function fresh() {
  keys.value = genChallenge();
  cap.value = null;
  tries.value = 0;
  won.value = false;
}
</script>

<template>
  <div class="stage">
    <p>8 本书的书号：<b class="mono">{{ keys.join('、') }}</b>。选一个书架数 n，每本书放进「书号除以 n 的余数」号架，撞了就叠起来。<b>让最高的一摞不超过 {{ CHALLENGE_LIMIT }} 本</b>就过关。</p>
    <div class="caps" role="group" aria-label="选书架数">
      <button v-for="c in CHALLENGE_CAPS" :key="c" type="button" class="btn small cap" :class="{ on: cap === c }" :disabled="won" @click="choose(c)">{{ c }}</button>
    </div>
    <div v-if="stats" class="bars" aria-hidden="true">
      <div v-for="(n, b) in stats.counts" :key="b" class="col">
        <div class="well"><div class="fill" :class="{ tall: n > CHALLENGE_LIMIT }" :style="{ height: (n / maxCount) * 100 + '%' }" /></div>
        <span class="num">{{ n }}</span>
        <span class="idx">{{ b }}</span>
      </div>
    </div>
    <div class="vars">
      <span class="chip"><small>试了</small>{{ tries }} 次</span>
      <span v-if="stats" class="chip"><small>最高一摞</small>{{ stats.longest }} 本</span>
      <span v-if="stats" class="chip"><small>各借一遍要看</small>{{ stats.looks }} 本</span>
    </div>
    <p v-if="stats && !won" class="note" aria-live="polite">{{ stats.longest > CHALLENGE_LIMIT ? '最高一摞有 ' + stats.longest + ' 本，太挤了。换一个书架数试试。' : '' }}</p>
    <div v-if="won" class="result">
      <h3>🏅 {{ tries }} 次找到：{{ cap }} 个书架，最高一摞 {{ stats!.longest }} 本！</h3>
      <p>书号有规律（都是同一个数的倍数）时，书架数如果和它有公约数，书就会只挤进几个书架。所以真实的哈希表常用质数做容量，或者先把书号打散再取余。</p>
      <button type="button" class="btn small" @click="fresh">再来一题</button>
    </div>
  </div>
</template>

<style scoped>
.mono { font-family: var(--mono); overflow-wrap: anywhere; }
.caps { display: flex; flex-wrap: wrap; gap: 8px; }
.cap { min-width: 44px; }
.cap.on { border-color: var(--accent); color: var(--accent); }
.bars { display: flex; gap: 4px; align-items: flex-end; }
.col { flex: 1 1 0; min-width: 0; max-width: 40px; display: flex; flex-direction: column; align-items: center; gap: 2px; }
.well { width: 100%; height: 80px; display: flex; align-items: flex-end; background: var(--inset); border-radius: 4px; }
.fill { width: 100%; background: var(--accent); border-radius: 4px; transition: height 0.25s; }
.fill.tall { background: var(--warn); }
.num { font: 600 12px var(--mono); }
</style>
