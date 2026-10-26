<script setup lang="ts">
import { computed } from 'vue';
import { CHALLENGE_LIMIT, CHALLENGE_MAX } from '../../engine/binary-search';
import type { ChallengeAction, ChallengeState } from '../../levels/binary-search/flows';
import { t } from '../../i18n/runtime';

// 挑战的画面：剩下的范围条、输入框、猜过的记录、结果。规则在 flows.ts 的 challengeFlow
const props = defineProps<{ s: ChallengeState; send: (a: ChallengeAction) => void }>();
const left = computed(() => CHALLENGE_LIMIT - props.s.log.length);
const pct = (v: number) => ((v - 1) / (CHALLENGE_MAX - 1)) * 100 + '%';
const DIR = { hit: 'do.challenge.hit', up: 'do.challenge.up', down: 'do.challenge.down' };
</script>

<template>
  <div class="stage">
    <p>{{ t('do.challenge.intro', { max: CHALLENGE_MAX, limit: CHALLENGE_LIMIT }) }}</p>
    <div class="range" aria-hidden="true">
      <div class="live" :style="{ left: pct(s.lo), width: 'calc(' + pct(s.hi) + ' - ' + pct(s.lo) + ' + 3px)' }" />
      <span v-for="(e, k) in s.log" :key="k" class="tick" :class="e.dir" :style="{ left: pct(e.g) }" />
    </div>
    <div class="vars">
      <span class="chip"><small>{{ t('do.challenge.range') }}</small>{{ t('do.challenge.rangeVal', { lo: s.lo, hi: s.hi }) }}</span>
      <span class="chip"><small>{{ t('do.challenge.left') }}</small>{{ t('do.challenge.leftVal', { n: left }) }}</span>
    </div>
    <form v-if="s.state === 'play'" class="inline" @submit.prevent="send({ type: 'guess' })">
      <label class="sr" for="bs-guess">{{ t('do.challenge.guessLabel') }}</label>
      <input
        id="bs-guess" :value="s.input" type="number" inputmode="numeric" min="1" :max="CHALLENGE_MAX" :placeholder="t('do.challenge.guessLabel')"
        @input="send({ type: 'input', value: ($event.target as HTMLInputElement).value })"
      >
      <button type="submit" class="btn small primary">{{ t('do.challenge.guess') }}</button>
    </form>
    <p v-if="s.msg" class="oops">{{ t(s.msg) }}</p>
    <ol class="log">
      <li v-for="(e, k) in s.log" :key="k">
        <span class="mono">{{ e.g }}</span>
        {{ t(DIR[e.dir]) }}
        <small v-if="s.state !== 'play' && e.g !== e.mid" class="hint">{{ t('do.challenge.wasMid', { mid: e.mid }) }}</small>
      </li>
    </ol>
    <div v-if="s.state === 'win'" class="result">
      <h3>{{ t('do.challenge.winTitle', { n: s.log.length, secret: s.secret }) }}</h3>
      <p>{{ t('do.challenge.winText', { limit: CHALLENGE_LIMIT }) }}</p>
      <button type="button" class="btn small" @click="send({ type: 'again' })">{{ t('do.challenge.again') }}</button>
    </div>
    <div v-if="s.state === 'lose'" class="result">
      <h3>{{ t('do.challenge.loseTitle', { limit: CHALLENGE_LIMIT, secret: s.secret }) }}</h3>
      <p>{{ t('do.challenge.loseText') }}</p>
      <button type="button" class="btn small" @click="send({ type: 'again' })">{{ t('do.challenge.again') }}</button>
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
