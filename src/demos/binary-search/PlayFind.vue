<script setup lang="ts">
import { computed } from 'vue';
import { KID_N, middle, stars } from '../../engine/binary-search';
import type { FindAction, FindState } from '../../levels/binary-search/flows';
import { t } from '../../i18n/runtime';
import Street from './Street.vue';

// 玩法二「当小邮差」的画面：信箱街、点了几次、星星、「点哪里最快」、秘诀按钮。规则在 flows.ts 的 findFlow
const props = defineProps<{ s: FindState; send: (a: FindAction) => void }>();
const earned = computed(() => stars(props.s.tries));
const pulse = computed(() => (props.s.hint && !props.s.done ? middle(props.s.lo, props.s.hi) : null));
</script>

<template>
  <Street
    :n="KID_N" :lo="s.lo" :hi="s.hi" :postman="s.at" :doors="s.doors"
    :letter="s.done ? s.secret : null" :pulse="pulse" :shake="s.shake"
    :clickable="!s.done" @pick="(i) => send({ type: 'tap', i })"
  />
  <p class="tries" :aria-label="t('play.find.tries')">
    <span v-for="k in s.tries" :key="k">👆</span>
  </p>

  <div v-if="s.done" class="result">
    <p class="stars" :aria-label="t('play.find.stars', { n: earned })">
      <span v-for="k in 3" :key="k" :class="{ dim: k > earned }">⭐</span>
    </p>

    <div v-if="s.quiz === 'ask'" class="quiz">
      <p class="q">{{ t('play.find.quiz') }}</p>
      <div class="choices">
        <button type="button" class="choice" @click="send({ type: 'quiz', where: 'edge' })"><span class="mini"><b /><i /><i /><i /><i /></span>{{ t('play.find.quizEdge') }}</button>
        <button type="button" class="choice" @click="send({ type: 'quiz', where: 'middle' })"><span class="mini"><i /><i /><b /><i /><i /></span>{{ t('play.find.quizMiddle') }}</button>
        <button type="button" class="choice" @click="send({ type: 'quiz', where: 'edge' })"><span class="mini"><i /><i /><i /><i /><b /></span>{{ t('play.find.quizOther') }}</button>
      </div>
    </div>
    <p v-else-if="s.quiz === 'right'" class="q">{{ t('play.find.quizRight') }}</p>
    <p v-else-if="s.quiz === 'wrong'" class="q">{{ t('play.find.quizWrong') }}</p>

    <div class="row">
      <button type="button" class="btn primary" @click="send({ type: 'again' })">{{ t('play.find.againBtn') }}</button>
      <button v-if="s.lowRounds >= 2 && !s.hint" type="button" class="btn" @click="send({ type: 'hint', on: true })">{{ t('play.find.hint') }}</button>
      <button v-if="s.hint" type="button" class="btn" @click="send({ type: 'hint', on: false })">{{ t('play.find.hintOff') }}</button>
    </div>
  </div>
</template>

<style scoped>
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
