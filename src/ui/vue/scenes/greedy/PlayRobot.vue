<script setup lang="ts">
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import { PUZZLES, desc, robotGlow, robotLeft, robotRobotLeft, type RobotAction, type RobotGame } from '../../../../engine/greedy';
import Shop from './Shop.vue';

// 玩法二「打败贪心机器人」的画面：奖牌、机器人的盘子、小卖部。说话和判定都在规则里。
const props = defineProps<{ state: RobotGame; clickable: boolean; t: (msg: Msg) => string }>();
const emit = defineEmits<{ act: [action: RobotAction] }>();
const coins = () => desc(PUZZLES[props.state.level].coins);
</script>

<template>
  <p class="medals" :aria-label="t(m('scene.robot.medals', { a: state.won.filter(Boolean).length, b: PUZZLES.length }))">
    <span v-for="(w, k) in state.won" :key="k" :class="{ dim: !w, cur: k === state.level && state.phase !== 'all' }">🏅</span>
  </p>

  <div class="robot-plate" :aria-label="t(m('scene.robot.plate', { list: state.robot.join('、') }))">
    <span class="r-icon" aria-hidden="true">🤖</span>
    <TransitionGroup name="drop" tag="span" class="r-pile" aria-hidden="true">
      <span v-for="(c, k) in state.robot" :key="k" class="r-coin">{{ c }}</span>
    </TransitionGroup>
    <span v-if="state.robot.length" class="r-cnt" aria-hidden="true">{{ robotRobotLeft(state) === 0 ? t(m('scene.shop.count', { n: state.robot.length })) : '' }}</span>
  </div>

  <Shop
    :coins="coins()" :left="robotLeft(state)" :plate="state.plate" who="🧒"
    :glow="robotGlow(state)" :shake="state.shake" :shake-plate="state.shakePlate" :clickable="clickable" :t="t"
    @pick="(coin) => emit('act', { type: 'tap', coin })"
  />
</template>

<style scoped>
.medals { font-size: 1.8rem; line-height: 1; display: flex; gap: 6px; }
.medals .dim { filter: grayscale(1); opacity: 0.25; }
.medals .cur { outline: 2px dashed var(--accent); outline-offset: 3px; border-radius: 50%; }
.robot-plate {
  display: flex; align-items: center; gap: 10px; min-height: 52px; padding: 6px 12px; max-width: 560px;
  border-radius: 999px; border: 2px dashed var(--line); background: var(--bg);
}
.r-icon { font-size: 1.5rem; flex: none; }
.r-pile { display: flex; flex-wrap: wrap; gap: 4px; flex: 1; min-width: 0; }
.r-coin {
  width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center;
  font: 700 12px var(--mono); background: var(--out); color: var(--fg); border: 1.5px solid var(--muted);
}
.r-cnt { flex: none; font: 600 14px var(--mono); color: var(--muted); }
.drop-enter-active { transition: transform 0.35s ease-out, opacity 0.35s; }
.drop-enter-from { transform: translateY(-20px) scale(0.6); opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .drop-enter-active { transition: none; }
}
</style>
