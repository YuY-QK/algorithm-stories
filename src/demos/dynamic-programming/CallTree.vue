<script setup lang="ts">
import { computed } from 'vue';
import type { CallNode } from '../../engine/dynamic-programming';

// 递归调用树：每个圆圈是一次「到第 n 级有几种跳法」的调用，下面两个孩子是它要先问的两个小问题。
// 贴了便签的圆圈（lookup）直接抄答案，下面整棵子树都不用算，变灰。
const props = withDefaults(defineProps<{
  node: CallNode;
  /** 已经被找出来的 lookup 节点 */
  found?: number[];
  /** 全部显示为用了便签 */
  reveal?: boolean;
  glow?: number[];
  shakeId?: number | null;
  clickable?: boolean;
  dimmed?: boolean;
}>(), { found: () => [], reveal: false, glow: () => [], shakeId: null, clickable: false, dimmed: false });

const emit = defineEmits<{ pick: [node: CallNode] }>();

const noted = computed(() => props.node.kind === 'lookup' && (props.reveal || props.found.includes(props.node.id)));
const below = computed(() => props.dimmed || noted.value);
</script>

<template>
  <div class="tree">
    <button
      type="button" class="nd"
      :class="{ noted, dim: dimmed, glow: glow.includes(node.id), shake: shakeId === node.id }"
      :disabled="!clickable || dimmed"
      :aria-label="'第 ' + node.n + ' 级' + (noted ? '，直接抄便签' : '')"
      @click="emit('pick', node)"
    >{{ node.n }}</button>
    <div v-if="node.children.length" class="kids">
      <CallTree
        v-for="c in node.children" :key="c.id" :node="c"
        :found="found" :reveal="reveal" :glow="glow" :shake-id="shakeId" :clickable="clickable" :dimmed="below"
        @pick="emit('pick', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.tree { display: flex; flex-direction: column; align-items: center; min-width: 0; }
.kids { display: flex; gap: 2px; justify-content: center; padding-top: 8px; position: relative; }
.kids::before { content: ''; position: absolute; top: 0; left: 25%; right: 25%; height: 8px; border: 1.5px solid var(--line); border-bottom: 0; border-radius: 4px 4px 0 0; }
.nd {
  font: 600 clamp(10px, 3vw, 13px) var(--mono); padding: 0; cursor: pointer;
  width: var(--w, 30px); height: calc(var(--w, 30px) * 0.9); min-width: 18px;
  border-radius: 50%; border: 1.5px solid var(--line); background: var(--surface); color: var(--fg);
  transition: opacity 0.35s, background 0.35s, border-color 0.35s;
}
.nd:disabled { cursor: default; }
.nd:not(:disabled):hover { border-color: var(--accent); }
.nd:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
.nd.noted { background: var(--mid); border-color: var(--mid); color: var(--mid-ink); }
.nd.dim { opacity: 0.25; background: var(--out); }
.nd.glow { animation: glow 0.9s ease-in-out 3; }
.nd.shake { animation: shake 0.5s ease-in-out; }

@keyframes glow {
  50% { box-shadow: 0 0 0 3px var(--mid), 0 0 12px 4px var(--mid); }
}
@keyframes shake {
  20%, 60% { transform: translateX(-3px); }
  40%, 80% { transform: translateX(3px); }
}
@media (prefers-reduced-motion: reduce) {
  .nd.glow { animation: none; box-shadow: 0 0 0 3px var(--mid); }
  .nd.shake { animation: none; border-color: var(--warn); }
}
</style>
