<script setup lang="ts">
import { kidOf } from '../../engine/merge-sort';

// 一只小动物：头顶是模样，身体是一根柱子，越高身体越长。看和玩共用，只负责画。
const props = withDefaults(defineProps<{
  id: number;
  v: number;
  /** 最高的身高，用来算柱子长度 */
  max?: number;
  /** cmp：正在比；moved：刚走出来；glow：透光提示 */
  state?: '' | 'cmp' | 'moved' | 'glow';
  shake?: boolean;
  /** 当成按钮（可以点） */
  pick?: boolean;
}>(), { max: 9, state: '', shake: false, pick: false });

defineEmits<{ pick: [id: number] }>();

const body = () => 22 + (props.v / props.max) * 50;
</script>

<template>
  <component
    :is="pick ? 'button' : 'div'"
    class="kid"
    :class="[state, { shake }]"
    :type="pick ? 'button' : undefined"
    :aria-label="pick ? '身高 ' + v + ' 的' + kidOf(id) : undefined"
    :aria-hidden="pick ? undefined : 'true'"
    @click="pick && $emit('pick', id)"
  >
    <span class="face">{{ kidOf(id) }}</span>
    <span class="body" :style="{ height: body() + 'px' }">{{ v }}</span>
  </component>
</template>

<style scoped>
.kid {
  font: inherit; color: var(--fg); background: none; border: 0; padding: 0;
  width: var(--kw, clamp(28px, 7.5vw, 44px)); display: flex; flex-direction: column; align-items: center; gap: 2px;
  flex: none;
}
button.kid { cursor: pointer; }
button.kid:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; border-radius: 8px; }
.face { font-size: var(--kf, clamp(18px, 5vw, 26px)); line-height: 1.1; }
.body {
  width: 100%; box-sizing: border-box; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 3px;
  border: 1.5px solid var(--line); border-radius: 8px 8px 3px 3px; background: var(--out); color: var(--fg);
  font: 700 13px var(--mono); transition: background 0.2s, border-color 0.2s, transform 0.2s;
}
button.kid:hover .body { border-color: var(--accent); }
.kid.cmp .body { background: var(--mid); border-color: var(--mid); color: var(--mid-ink); }
.kid.moved .body { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
.kid.glow .body { background: var(--mid); border-color: var(--mid); color: var(--mid-ink); box-shadow: 0 0 0 4px color-mix(in srgb, var(--mid) 45%, transparent); }
.kid.shake { animation: shake 0.5s; }
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px) rotate(-6deg); }
  40% { transform: translateX(6px) rotate(6deg); }
  60% { transform: translateX(-4px) rotate(-3deg); }
  80% { transform: translateX(4px) rotate(3deg); }
}
@media (prefers-reduced-motion: reduce) {
  .kid.shake { animation: none; }
  .kid.shake .body { border-color: var(--warn); }
}
</style>
