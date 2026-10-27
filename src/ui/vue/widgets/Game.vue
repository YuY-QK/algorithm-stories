<script setup lang="ts">
import { computed, onBeforeUnmount, shallowRef } from 'vue';
import VarChips from '../../../components/shared/VarChips.vue';
import { play } from '../../../components/shared/sound';
import { useStageStop } from '../../../components/shared/usePlayer';
import { actGame, interruptGame, resultOf, startGame, tickGame, type GameRun, type GameStep } from '../../../core/flows/game';
import type { GameRules } from '../../../core/types';
import { useCopy } from '../i18n';
import { getLevel, rulesOf, sceneOf } from '../levels';
import Controls from './Controls.vue';

// 玩和挑战：播放一份 GameRules。规则是纯函数，这里只负责执行副作用：出声、按 after 定时调用 tick、
// 切标签时让规则复位。画面由 scene 画，被点时 emit('act', 操作)。流程在 core/flows/game.ts。
const props = defineProps<{
  slug: string;
  id: string;
  rules: string;
  scene: string;
  /** 画在按钮和提示之后的第二块画面（如挑战的猜测记录） */
  after?: string;
  /** game：浅色凹槽里一列，目标提示是小贴士；stage：普通的操作区，开头一段普通文字 */
  frame?: 'game' | 'stage';
}>();
const { tr, ui, has } = useCopy();

const rules = rulesOf(props.slug, 'games', props.rules) as GameRules<any, unknown>;
const Scene = sceneOf(props.slug, props.scene);
const After = props.after ? sceneOf(props.slug, props.after) : null;
const scenes = getLevel(props.slug).scenes;
const lead = has(props.id + '.goal') ? tr({ key: props.id + '.goal' }) : '';

const first = startGame(rules);
const run = shallowRef<GameRun<any>>(first.run);
let timer: ReturnType<typeof setTimeout> | null = null;

function clear() {
  if (timer) clearTimeout(timer);
  timer = null;
}
function apply(step: GameStep<any>) {
  clear();
  run.value = step.run;
  for (const s of [step.sound ?? []].flat()) play(s);
  if (step.after !== undefined) timer = setTimeout(() => apply(tickGame(rules, run.value)), step.after);
}
function onAct(action: unknown) {
  const step = actGame(rules, run.value, action);
  if (step) apply(step);
}
// 开局就带自动步骤的游戏（页面一打开小熊就开始叠盘子）：开局的声音和定时器也要执行
if (first.sound || first.after !== undefined) apply(first);
// 切换标签或卸载时，定时器清掉，动画中途的状态复位到可再次操作
useStageStop(() => {
  clear();
  apply(interruptGame(rules, run.value));
});
onBeforeUnmount(clear);

const state = computed(() => run.value.state);
const hud = computed(() => rules.hud?.(state.value));
const chips = computed<[string, string | number][]>(() => (hud.value?.chips ?? []).map(([k, v]) => [tr(k), tr(v)]));
const result = computed(() => resultOf(rules, run.value));
const controls = computed(() => rules.controls(state.value));
</script>

<template>
  <div :class="frame === 'stage' ? 'stage' : 'game'">
    <p v-if="lead && frame === 'stage'">{{ lead }}</p>
    <p v-else-if="lead" class="small-note">{{ lead }}</p>
    <p v-if="run.say" class="say" aria-live="polite">{{ tr(run.say) }}</p>
    <component :is="Scene" :state="state" :clickable="rules.clickable(state)" :t="tr" @act="onAct" />
    <p v-if="hud?.tries !== undefined" class="tries" :aria-label="ui('ui.game.tries')">
      <span v-for="n in hud.tries" :key="n">👆</span>
    </p>
    <VarChips v-if="chips.length" :vars="chips" />
    <Controls v-if="!result" :controls="controls" :scenes="scenes" :tr="tr" @act="onAct" />
    <component :is="After" v-if="After" :state="state" :t="tr" @act="onAct" />

    <div v-if="result" class="result">
      <p v-if="result.stars" class="stars" :aria-label="ui('ui.game.stars', { n: result.stars })">
        <span v-for="n in 3" :key="n" :class="{ dim: n > result.stars }">⭐</span>
      </p>
      <h3 v-if="result.title">{{ tr(result.title) }}</h3>
      <p v-if="result.body">{{ tr(result.body) }}</p>
      <component :is="scenes[result.art.scene]" v-if="result.art" v-bind="result.art.props" :t="tr" />
      <div v-if="result.quiz && result.quiz.options.length" class="quiz">
        <p v-if="result.quiz.prompt" class="q">{{ tr(result.quiz.prompt) }}</p>
        <Controls :controls="result.quiz.options" :scenes="scenes" :tr="tr" @act="onAct" />
        <p v-if="result.quiz.after" class="q hint">{{ tr(result.quiz.after) }}</p>
      </div>
      <p v-else-if="result.quiz?.prompt" class="q">{{ tr(result.quiz.prompt) }}</p>
      <Controls :controls="controls" :scenes="scenes" :tr="tr" @act="onAct" />
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
.q.hint { color: var(--muted); font-size: 1.05rem; }
</style>
