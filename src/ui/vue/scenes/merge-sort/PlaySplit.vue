<script setup lang="ts">
import { computed } from 'vue';
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import { countChoices, cutAt, kidOf, splitTotal, type Piece, type SplitAction, type SplitGame } from '../../../../engine/merge-sort';

// 玩法二「拆一拆」的画面：一排一排的小动物，每个缝里有个 ✂️ 按钮，最后问一共分了几轮的选项也在这里画。
// 切歪的那一刀（probe）让左右两边亮起来，再歪一次正中间的 ✂️ 透光；答错的选项晃一下。都是 state 里的字段，这里只读。
const props = defineProps<{ state: SplitGame; clickable: boolean; t: (msg: Msg) => string }>();
const emit = defineEmits<{ act: [action: SplitAction] }>();

const s = computed(() => props.state);
const live = computed(() => s.value.rows.length - 1);
const choices = computed(() => countChoices(splitTotal(s.value)));

const cutOf = (r: number, p: Piece) => cutAt(s.value.cuts[r], p);

function side(r: number, p: Piece, x: number) {
  const pr = s.value.probe;
  if (r !== live.value || !pr || pr.start !== p.start) return '';
  return x < pr.at ? 'sa' : 'sb';
}
const canCut = (r: number, p: Piece) => props.clickable && r === live.value && p.size > 1 && cutOf(r, p) === undefined;
</script>

<template>
  <div class="split">
    <div class="rows" :style="{ '--n': s.n }">
      <template v-for="(row, r) in s.rows" :key="r">
        <div v-if="r > 0" class="between" aria-hidden="true">✂️ ↓<span v-if="s.hintNums">{{ t(m('scene.round', { r })) }}</span></div>
        <div class="grid">
          <div
            v-for="p in row"
            :key="p.start"
            class="piece"
            :class="{ live: r === live && s.phase === 'cut' && p.size > 1 }"
            :style="{ gridColumn: 'span ' + p.size }"
          >
            <div class="cards" :style="{ '--s': p.size }">
              <span v-for="x in p.size" :key="x" class="ca" :class="side(r, p, x - 1)">{{ kidOf(p.start + x - 1) }}</span>
              <i v-if="cutOf(r, p) !== undefined" class="line" :style="{ left: ((cutOf(r, p)! - p.start) / p.size) * 100 + '%' }" />
            </div>
            <template v-if="canCut(r, p)">
              <button
                v-for="at in p.size - 1"
                :key="at"
                type="button"
                class="joint"
                :class="{ glow: s.probe && s.probe.start === p.start && s.probe.misses >= 2 && at === p.size / 2 }"
                :style="{ left: (at / p.size) * 100 + '%' }"
                :aria-label="t(m('scene.joint', { at }))"
                @click="emit('act', { type: 'cut', start: p.start, at })"
              >✂️</button>
            </template>
          </div>
        </div>
      </template>
    </div>

    <div v-if="s.phase === 'ask'" class="answers ask-row">
      <button
        v-for="c in choices"
        :key="c + ':' + (s.wrong && s.wrong[0] === c ? s.wrong[1] : 0)"
        type="button"
        class="btn big"
        :class="{ shake: s.wrong && s.wrong[0] === c }"
        :aria-label="t(m('scene.roundsAria', { c }))"
        @click="emit('act', { type: 'answer', c })"
      >{{ t(m('scene.rounds', { c })) }}</button>
    </div>
  </div>
</template>

<style scoped>
.split { display: flex; flex-direction: column; gap: 14px; max-width: 560px; }
.rows { display: flex; flex-direction: column; gap: 4px; }
.grid { display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); gap: 4px; }
.piece { position: relative; min-width: 0; border: 1.5px dashed var(--line); border-radius: 8px; padding: 4px 2px; box-sizing: border-box; background: var(--bg); }
.piece.live { padding-bottom: 32px; border-style: solid; border-color: var(--accent); }
.cards { position: relative; display: grid; grid-template-columns: repeat(var(--s), minmax(0, 1fr)); }
.ca { text-align: center; font-size: clamp(16px, 5vw, 26px); line-height: 1.4; border-radius: 6px; transition: background 0.2s; }
.ca.sa { background: var(--mid); }
.ca.sb { background: var(--out); outline: 1.5px solid var(--mid); outline-offset: -1.5px; }
.line { position: absolute; top: 2px; bottom: 2px; width: 0; border-left: 3px solid var(--accent); transform: translateX(-1.5px); }
.joint {
  position: absolute; bottom: 2px; width: 30px; height: 28px; margin-left: -15px; padding: 0; font-size: 16px; line-height: 1;
  border: 1.5px solid var(--line); border-radius: 8px; background: var(--surface); cursor: pointer;
}
.joint:hover { border-color: var(--accent); }
.joint:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
.joint.glow { background: var(--mid); border-color: var(--mid); box-shadow: 0 0 0 4px color-mix(in srgb, var(--mid) 45%, transparent); }
.between { text-align: center; color: var(--muted); font-size: 13px; line-height: 1.2; }
.ask-row .btn { flex: 0 1 120px; font-size: 1.15rem; }
.btn.shake { animation: shake 0.5s; border-color: var(--warn); }
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-6px); }
  50% { transform: translateX(6px); }
  75% { transform: translateX(-4px); }
}
@media (prefers-reduced-motion: reduce) {
  .btn.shake { animation: none; }
}
</style>
