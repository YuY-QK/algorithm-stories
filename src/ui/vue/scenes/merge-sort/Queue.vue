<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import Kid from './Kid.vue';
import { m } from '../../../../core/i18n';
import { SHAKE_MS } from '../../../../core/timing';
import type { Msg } from '../../../../core/types';
import { kidOf } from '../../../../engine/merge-sort';
import { useStageStop } from '../../../../components/shared/usePlayer';

// 一队小动物，站在一条地线上，从左到右是队头到队尾。队头可以当按钮点。
const props = withDefaults(defineProps<{
  ids: number[];
  values: number[];
  max?: number;
  /** 正在比身高的小动物 */
  cmp?: number[];
  moved?: number | null;
  glow?: number | null;
  /** 每次变化就让这个小动物摇一下，格式 [id, 计数] */
  shake?: [number, number] | null;
  /** 队头能点 */
  pickHead?: boolean;
  /** 刚合成的队，加个框 */
  fresh?: boolean;
  label?: string;
  /** 队伍为空时显示的提示 */
  empty?: string;
  t: (msg: Msg) => string;
}>(), { max: 9, cmp: () => [], moved: null, glow: null, shake: null, pickHead: false, fresh: false, label: '', empty: '' });

const emit = defineEmits<{ pick: [id: number] }>();

const shaking = ref<number | null>(null);
let shakeTimer: ReturnType<typeof setTimeout> | null = null;
function stopShake() {
  if (shakeTimer) clearTimeout(shakeTimer);
  shakeTimer = null;
  shaking.value = null;
}
watch(() => props.shake, (v) => {
  if (!v) return;
  stopShake();
  requestAnimationFrame(() => (shaking.value = v[0]));
  shakeTimer = setTimeout(() => (shaking.value = null), SHAKE_MS);
});
// 切换标签或卸载时，晃动动画停下
useStageStop(stopShake);
onBeforeUnmount(stopShake);

const stateOf = (id: number) => (props.moved === id ? 'moved' : props.glow === id ? 'glow' : props.cmp.includes(id) ? 'cmp' : '');
</script>

<template>
  <div class="queue" :class="{ fresh }" role="group" :aria-label="label || undefined">
    <TransitionGroup name="kid" tag="div" class="line-up">
      <Kid
        v-for="(id, x) in ids"
        :key="id"
        :id="id"
        :v="values[id]"
        :max="max"
        :state="stateOf(id)"
        :shake="shaking === id"
        :pick="pickHead && x === 0"
        :label="t(m('scene.kid', { v: values[id], kid: kidOf(id) }))"
        @pick="emit('pick', $event)"
      />
    </TransitionGroup>
    <p v-if="!ids.length && empty" class="none">{{ empty }}</p>
  </div>
</template>

<style scoped>
.queue {
  min-width: 0; min-height: calc(var(--kw, 40px) + 60px); padding: 8px 10px 6px; box-sizing: border-box;
  display: flex; flex-direction: column; justify-content: flex-end; position: relative;
  border-radius: 10px; border: 1.5px dashed var(--line);
}
.queue.fresh { border-style: solid; border-color: var(--accent); }
.line-up { display: flex; align-items: flex-end; gap: var(--kgap, 5px); border-bottom: 3px solid var(--line); padding-bottom: 2px; min-height: 28px; }
.none { position: absolute; inset: 0; display: grid; place-items: center; color: var(--muted); font-size: 13px; margin: 0; }
.kid-enter-active { transition: opacity 0.35s, transform 0.35s; }
.kid-enter-from { opacity: 0; transform: translateY(-16px); }
@media (prefers-reduced-motion: reduce) {
  .kid-enter-active { transition: none; }
}
</style>
