<script setup lang="ts">
import { onBeforeUnmount, reactive, watch } from 'vue';
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import type { BlocksGame } from '../../../../engine/stack';
import { useStageStop } from '../../shared/usePlayer';
import { FLASH_MS } from '../../../../core/timing';
import Piece from './Piece.vue';

// 玩法二「拼积木」的画面：这一串积木、篮子、拼好的。篮子里是栈，球怎么走由规则管，这里只画。
// 点错时规则把 wiggle / glowTop / glowBasket 加一，这里让对应的东西闪一会儿（FLASH_MS）。
const props = defineProps<{ state: BlocksGame; clickable: boolean; t: (msg: Msg) => string }>();

type Flash = 'wiggle' | 'glowTop' | 'glowBasket';
const on = reactive<Record<Flash, boolean>>({ wiggle: false, glowTop: false, glowBasket: false });
const timers: Partial<Record<Flash, ReturnType<typeof setTimeout>>> = {};

function stop(which: Flash) {
  clearTimeout(timers[which]);
  delete timers[which];
  on[which] = false;
}
/** 重新触发提示动画：先熄掉，下一帧再亮，FLASH_MS 以后熄 */
function flash(which: Flash) {
  stop(which);
  requestAnimationFrame(() => {
    on[which] = true;
    timers[which] = setTimeout(() => (on[which] = false), FLASH_MS);
  });
}
function stopAll() {
  (['wiggle', 'glowTop', 'glowBasket'] as Flash[]).forEach(stop);
}
for (const which of ['wiggle', 'glowTop', 'glowBasket'] as Flash[]) {
  watch(() => props.state[which], (v) => (v ? flash(which) : stop(which)));
}
useStageStop(stopAll);
onBeforeUnmount(stopAll);

const NAME: Record<string, Msg> = {
  '(': m('blocks.name.roundL'), ')': m('blocks.name.roundR'),
  '[': m('blocks.name.squareL'), ']': m('blocks.name.squareR'),
  '{': m('blocks.name.curlyL'), '}': m('blocks.name.curlyR'),
};

function pieceLabel(c: string, k: number) {
  const s = props.state;
  const now = k === s.i && s.phase === 'act';
  return props.t(NAME[c]) + (now ? props.t(m('blocks.piece.now')) : k < s.i ? props.t(m('blocks.piece.seen')) : '');
}
</script>

<template>
  <div class="scene">
    <div class="dots" :aria-label="t(m('blocks.dots'))">
      <span v-for="(_, k) in state.rounds" :key="k" :class="{ on: k === state.r, past: k < state.r }" />
    </div>

    <ol class="tape" :aria-label="t(m('blocks.tape'))">
      <li
        v-for="(c, k) in state.rounds[state.r]" :key="state.r + '-' + k" :aria-label="pieceLabel(c, k)"
        :class="{ past: k < state.i, now: k === state.i && state.phase === 'act', wig: k === state.i && on.wiggle }"
      >
        <span class="arrow" aria-hidden="true">{{ k === state.i && state.phase === 'act' ? '⬇️' : '' }}</span>
        <Piece :c="c" />
      </li>
    </ol>

    <div class="floor">
      <div class="col">
        <div class="basket" :class="{ glow: on.glowBasket }" :aria-label="t(m('blocks.basket'))">
          <TransitionGroup name="blk">
            <span v-for="(c, k) in state.basket" :key="k + c" class="slot" :class="{ glow: on.glowTop && k === state.basket.length - 1 }">
              <Piece :c="c" />
            </span>
          </TransitionGroup>
        </div>
        <p class="cap">{{ t(m('blocks.basketCap')) }}</p>
      </div>
      <div class="col">
        <div class="made" :aria-label="t(m('blocks.made'))">
          <TransitionGroup name="blk">
            <span v-for="(piece, k) in state.made" :key="k + piece"><Piece :c="piece" small /></span>
          </TransitionGroup>
        </div>
        <p class="cap">{{ t(m('blocks.madeCap')) }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scene { display: flex; flex-direction: column; gap: 16px; }
.dots { display: flex; gap: 6px; }
.dots span { width: 10px; height: 10px; border-radius: 50%; background: var(--line); }
.dots span.past { background: var(--muted); }
.dots span.on { background: var(--accent); }
.tape { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(40px, 44px)); gap: 6px; }
.tape li { display: flex; flex-direction: column; align-items: center; gap: 2px; transition: opacity 0.3s; }
.tape li.past { opacity: 0.3; }
.tape li.now :deep(.piece) { box-shadow: 0 0 0 3px var(--fg); }
.tape li.wig { animation: shake 0.5s ease-in-out; }
.arrow { height: 1.3rem; font-size: 1rem; line-height: 1.3rem; }
.floor { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16px; max-width: 460px; }
.col { display: flex; flex-direction: column; align-items: center; gap: 6px; min-width: 0; }
.basket {
  display: flex; flex-direction: column-reverse; align-items: center; gap: 4px;
  width: 76px; min-height: 216px; padding: 6px; box-sizing: border-box;
  border: 2px solid var(--line); border-top: 0; border-radius: 0 0 16px 16px; background: var(--bg);
}
.basket.glow { animation: glow 0.9s ease-in-out 2; }
.slot { display: block; border-radius: 10px; }
.slot.glow { animation: glow 0.9s ease-in-out 2; }
.made { display: flex; flex-wrap: wrap; align-content: flex-end; justify-content: center; gap: 6px; min-height: 216px; width: 100%; }
.cap { font-size: 13px; color: var(--muted); }

.blk-enter-active, .blk-leave-active { transition: transform 0.35s ease, opacity 0.35s ease; }
.blk-enter-from { transform: translateY(-30px); opacity: 0; }
.blk-leave-to { transform: translateX(40px); opacity: 0; }
@keyframes glow {
  50% { box-shadow: 0 0 0 4px var(--mid), 0 0 18px 6px var(--mid); }
}
@keyframes shake {
  20%, 60% { transform: translateX(-5px) rotate(-5deg); }
  40%, 80% { transform: translateX(5px) rotate(5deg); }
}
@media (prefers-reduced-motion: reduce) {
  .tape li.wig, .basket.glow, .slot.glow { animation: none; box-shadow: 0 0 0 3px var(--mid); }
  .blk-enter-active, .blk-leave-active { transition: none; }
}
</style>
