<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import { BIG, type NextAction, type NextGame } from '../../../../engine/queue';
import { useStageStop } from '../../../../components/shared/usePlayer';
import { SHAKE_MS } from '../../../../core/timing';

// 玩法一「谁先买到？」的画面：柜台、排队的顾客（被点的用 act 交给规则）、已经买到奶茶的。
// 点错时规则把 shake 加一次，被点的顾客晃一下；举手的队头是 state.raise。
const props = defineProps<{ state: NextGame; clickable: boolean; t: (msg: Msg) => string }>();
const emit = defineEmits<{ act: [action: NextAction] }>();

const shaking = ref<string | null>(null);
let shakeTimer: ReturnType<typeof setTimeout> | null = null;
function stopShake() {
  if (shakeTimer) clearTimeout(shakeTimer);
  shakeTimer = null;
  shaking.value = null;
}
watch(() => props.state.shake, (v) => {
  if (!v) return;
  stopShake();
  requestAnimationFrame(() => (shaking.value = v[0]));
  shakeTimer = setTimeout(() => (shaking.value = null), SHAKE_MS);
});
useStageStop(stopShake);
onBeforeUnmount(stopShake);
</script>

<template>
  <div class="shop">
    <div class="counter" aria-hidden="true">🧑‍🍳<small>🧋</small></div>
    <TransitionGroup name="q" tag="div" class="queue">
      <button
        v-for="(a, i) in state.line"
        :key="a"
        type="button"
        class="guest"
        :class="{ big: a === BIG, shake: shaking === a, out: state.leaving === a }"
        :disabled="!clickable"
        :aria-label="t(m('next.guest', { n: i + 1, who: a }))"
        @click="emit('act', { type: 'pick', who: a })"
      >
        {{ a }}
        <span v-if="state.raise === a" class="hand" aria-hidden="true">🙋</span>
      </button>
    </TransitionGroup>
  </div>
  <p class="served" :aria-label="t(m('served.label'))">
    <span class="cup" aria-hidden="true">🧋</span>
    <span v-for="a in state.served" :key="a">{{ a }}</span>
  </p>
</template>

<style scoped>
.shop { display: flex; align-items: flex-end; gap: 10px; min-height: 84px; }
.counter {
  flex: none; display: flex; flex-direction: column; align-items: center; justify-content: center;
  width: clamp(52px, 15vw, 72px); height: clamp(64px, 18vw, 84px); font-size: clamp(1.6rem, 7vw, 2.2rem); line-height: 1.1;
  border-radius: 12px 12px 4px 4px; background: var(--accent); border: 1.5px solid var(--accent);
}
.counter small { font-size: 0.7em; }
.queue { display: flex; gap: clamp(4px, 1.5vw, 10px); min-width: 0; align-items: flex-end; }
.guest {
  position: relative; font: inherit; font-size: clamp(1.8rem, 9vw, 2.6rem); line-height: 1;
  width: 1.5em; height: 1.5em; padding: 0; cursor: pointer; flex: none;
  border-radius: 14px; border: 1.5px solid var(--line); background: var(--surface);
}
.guest.big { font-size: clamp(2.2rem, 11vw, 3.2rem); width: 1.3em; height: 1.3em; }
.guest:disabled { cursor: default; }
.guest:not(:disabled):hover { border-color: var(--accent); }
.guest:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
.guest.shake { animation: shake 0.5s ease-in-out; }
.guest.out { transform: translateX(-30px) scale(0.85); opacity: 0.4; transition: transform 0.6s, opacity 0.6s; }
.hand { position: absolute; top: -0.55em; right: -0.35em; font-size: 0.5em; animation: wave 0.6s ease-in-out infinite alternate; }
.served { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; min-height: 1.8em; font-size: 1.4rem; }
.cup { padding-right: 6px; margin-right: 4px; border-right: 1.5px solid var(--line); }

.q-enter-active { transition: transform 0.5s ease-out, opacity 0.5s; }
.q-enter-from { transform: translateX(60px); opacity: 0; }
.q-leave-active { position: absolute; opacity: 0; }
.q-move { transition: transform 0.45s ease-in-out; }

@keyframes shake {
  20%, 60% { transform: translateX(-4px) rotate(-6deg); }
  40%, 80% { transform: translateX(4px) rotate(6deg); }
}
@keyframes wave {
  to { transform: translateY(-3px) rotate(12deg); }
}
@media (prefers-reduced-motion: reduce) {
  .guest.shake, .hand { animation: none; }
  .guest.shake { box-shadow: 0 0 0 3px var(--mid); }
  .q-enter-active, .q-move, .guest.out { transition: none; }
}
</style>
