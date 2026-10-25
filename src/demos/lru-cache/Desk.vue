<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { BOOK_EMOJI } from '../../engine/lru-cache';
import { SHAKE_MS } from '../../components/shared/timing';
import { useStageStop } from '../../components/shared/usePlayer';

// 书桌和书架：看、玩法一、玩法二共用，只负责画，不管规则。
// 桌上的书从左到右按「最近碰过」排：最左边最久没碰，最右边刚碰过。
const props = withDefaults(defineProps<{
  cap: number;
  desk: number[];
  /** 一共有几本书（编号 1 到 books），不在桌上的都在书架上 */
  books: number;
  /** 一闪一闪：该点它（桌上或书架上的书） */
  pulse?: number | null;
  /** 透光提示：它最久没碰 */
  glow?: number | null;
  /** 桌上的书能不能点 */
  deskClickable?: boolean;
  /** 书架上的书能不能点 */
  shelfClickable?: boolean;
  /** 显示「最久没碰 ←→ 刚碰过」的刻度 */
  ruler?: boolean;
  /** 每次变化就让这本书摇一下头，格式 [书, 计数] */
  shake?: [number, number] | null;
}>(), { pulse: null, glow: null, deskClickable: false, shelfClickable: false, ruler: true, shake: null });

const emit = defineEmits<{ pick: [book: number, where: 'desk' | 'shelf'] }>();

const shelf = computed(() => {
  const out: number[] = [];
  for (let b = 1; b <= props.books; b++) if (!props.desk.includes(b)) out.push(b);
  return out;
});

const shaking = ref<number | null>(null);
let shakeTimer: ReturnType<typeof setTimeout> | null = null;
function stopShake() {
  if (shakeTimer) clearTimeout(shakeTimer);
  shakeTimer = null;
  shaking.value = null;
}
useStageStop(stopShake);
watch(() => props.shake, (v) => {
  if (!v) return;
  stopShake();
  requestAnimationFrame(() => (shaking.value = v[0]));
  shakeTimer = setTimeout(() => (shaking.value = null), SHAKE_MS);
});

const name = (b: number) => b + ' 号书 ' + BOOK_EMOJI[b];
</script>

<template>
  <div class="scene">
    <div class="shelf">
      <span class="cap-label" aria-hidden="true">🗄️ 书架</span>
      <TransitionGroup name="bk" tag="div" class="shelf-books">
        <button
          v-for="b in shelf"
          :key="b"
          type="button"
          class="tile small"
          :class="{ pulse: pulse === b, shake: shaking === b }"
          :disabled="!shelfClickable"
          :aria-label="'书架上的' + name(b)"
          @click="emit('pick', b, 'shelf')"
        >
          <span class="em">{{ BOOK_EMOJI[b] }}</span><span class="no">{{ b }}</span>
        </button>
      </TransitionGroup>
    </div>

    <div class="desk" :style="{ '--cap': cap }">
      <div class="slots" aria-hidden="true"><span v-for="s in cap" :key="s" class="slot" /></div>
      <TransitionGroup name="bk" tag="div" class="on-desk" role="list" aria-label="书桌上的书，从左到右是最久没碰到刚碰过">
        <button
          v-for="b in desk"
          :key="b"
          type="button"
          class="tile"
          :class="{ pulse: pulse === b, glow: glow === b, shake: shaking === b }"
          role="listitem"
          :disabled="!deskClickable"
          :aria-label="'桌上的' + name(b)"
          @click="emit('pick', b, 'desk')"
        >
          <span class="em">{{ BOOK_EMOJI[b] }}</span><span class="no">{{ b }}</span>
          <span v-if="glow === b" class="web" aria-hidden="true">🕸️</span>
        </button>
      </TransitionGroup>
    </div>
    <div class="cap-label table" aria-hidden="true">🪑 书桌（放得下 {{ cap }} 本）</div>
    <div v-if="ruler" class="ruler" aria-hidden="true">
      <span>⬅️ 最久没碰</span><i /><span>刚碰过 ➡️</span>
    </div>
  </div>
</template>

<style scoped>
.scene { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.shelf {
  display: flex; align-items: center; gap: 10px; min-height: 64px; padding: 8px 10px; min-width: 0;
  border: 1.5px dashed var(--line); border-radius: 12px; background: var(--bg);
}
.cap-label { font-size: 13px; color: var(--muted); white-space: nowrap; }
.cap-label.table { text-align: center; }
.shelf-books { display: flex; flex-wrap: wrap; gap: 6px; min-width: 0; position: relative; }

.desk { position: relative; height: 92px; --gap: 8px; }
.slots, .on-desk {
  position: absolute; inset: 0; display: grid; gap: var(--gap);
  grid-template-columns: repeat(var(--cap), minmax(0, 1fr));
}
.slot { border: 2px dashed var(--line); border-radius: 12px; }

.tile {
  position: relative; font: inherit; color: var(--fg); cursor: default; padding: 0; min-width: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
  border: 2px solid var(--line); border-radius: 12px; background: var(--surface);
  transition: transform 0.5s ease, opacity 0.4s ease, box-shadow 0.3s, border-color 0.3s;
}
.tile:disabled { opacity: 1; color: var(--fg); }
.tile:not(:disabled) { cursor: pointer; }
.tile:not(:disabled):hover { border-color: var(--accent); }
.tile:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
.tile .em { font-size: 2.1rem; line-height: 1; }
.tile .no { font: 600 12px var(--mono); color: var(--muted); }
.tile.small { width: 46px; height: 48px; border-radius: 10px; }
.tile.small .em { font-size: 1.4rem; }
.tile.small .no { font-size: 10px; }
.tile.glow { border-color: var(--mid); box-shadow: 0 0 0 4px var(--mid), 0 0 18px var(--mid); }
.web { position: absolute; top: -10px; right: -6px; font-size: 1.1rem; }
.tile.pulse { animation: pulse 1.1s ease-in-out infinite; border-color: var(--accent); }
.tile.shake { animation: shake 0.5s; border-color: var(--warn); }

.ruler { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--muted); }
.ruler i { flex: 1; height: 2px; background: var(--line); min-width: 8px; }
.ruler span { white-space: nowrap; }

.bk-move { transition: transform 0.5s ease; }
.bk-enter-active { transition: opacity 0.4s ease, transform 0.4s ease; }
.bk-leave-active { transition: opacity 0.25s ease; position: absolute; pointer-events: none; }
.bk-enter-from { opacity: 0; transform: translateY(-16px); }
.bk-leave-to { opacity: 0; }

@keyframes pulse { 50% { box-shadow: 0 0 0 5px var(--mid); } }
@keyframes shake { 20% { transform: translateX(-7px); } 40% { transform: translateX(7px); } 60% { transform: translateX(-5px); } 80% { transform: translateX(5px); } }

@media (max-width: 480px) {
  .desk { height: 80px; --gap: 5px; }
  .tile .em { font-size: 1.7rem; }
  .shelf { gap: 6px; padding: 6px; }
}
@media (prefers-reduced-motion: reduce) {
  .tile, .bk-move, .bk-enter-active, .bk-leave-active { transition: none; }
  .tile.pulse { animation: none; box-shadow: 0 0 0 4px var(--mid); }
  .tile.shake { animation: none; }
}
</style>
