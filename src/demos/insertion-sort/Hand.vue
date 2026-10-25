<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { isRed, suitOf, type Card } from '../../engine/insertion-sort';
import { useStageStop } from '../../components/shared/usePlayer';
import { SHAKE_MS } from '../../components/shared/timing';

// 牌桌：一排位置，牌放在位置上，拿在手上的牌悬在空位上方。
// 看、玩法一、玩法二共用，只负责画，不管规则。
const props = withDefaults(defineProps<{
  cards: Card[];
  /** 每个位置上的牌 id，null 是空位 */
  slots: (number | null)[];
  held?: number | null;
  heldAt?: number;
  /** 前 inHand 个位置是「手里」，后面的还在桌上（变淡） */
  inHand?: number;
  /** 正在比大小的牌 */
  vs?: number | null;
  /** 透光提示的牌 id；-1 表示透光的是空位 */
  glow?: number | null;
  /** 每次变化就让这张牌摇一下，格式 [牌 id, 计数] */
  shake?: [number, number] | null;
  /** 显示几个能点的空隙（0 到 gaps - 1 号），0 表示不显示 */
  gaps?: number;
  /** 手里的牌和空位能不能点 */
  pickable?: boolean;
}>(), { held: null, heldAt: 0, inHand: 0, vs: null, glow: null, shake: null, gaps: 0, pickable: false });

const emit = defineEmits<{ gap: [g: number]; card: [id: number]; hole: [] }>();

const n = computed(() => props.slots.length);
const slotOf = computed(() => {
  const m = new Map<number, number>();
  props.slots.forEach((id, s) => { if (id !== null) m.set(id, s); });
  return m;
});

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
useStageStop(stopShake);
onBeforeUnmount(stopShake);

function where(id: number) {
  const lifted = props.held === id;
  return { s: lifted ? props.heldAt : slotOf.value.get(id) ?? 0, lifted };
}

function label(c: Card) {
  return '牌 ' + c.v + (props.held === c.id ? '，拿在手上' : '');
}
</script>

<template>
  <div class="felt" :style="{ '--n': n }">
    <div class="box">
      <div class="floor">
        <div v-if="inHand > 0" class="band" :style="{ width: 'calc(' + (inHand * 100) / n + '%)' }" aria-hidden="true" />
        <template v-for="(id, s) in slots" :key="'s' + s">
          <button
            v-if="id === null && pickable"
            type="button"
            class="hole"
            :class="{ glow: glow === -1 }"
            :style="{ '--s': s }"
            aria-label="空位：把手上的牌放这里"
            @click="emit('hole')"
          >⬇️</button>
          <span v-else-if="id === null" class="hole" :style="{ '--s': s }" aria-hidden="true" />
        </template>
        <component
          :is="pickable && where(c.id).s < inHand && !where(c.id).lifted ? 'button' : 'div'"
          v-for="c in cards"
          :key="c.id"
          :type="pickable ? 'button' : undefined"
          class="pc"
          :class="{
            up: where(c.id).lifted,
            away: inHand > 0 && where(c.id).s >= inHand && !where(c.id).lifted,
            vs: vs === c.id,
            glow: glow === c.id,
            shake: shaking === c.id,
            red: isRed(c.id),
          }"
          :style="{ '--s': where(c.id).s }"
          :aria-label="label(c)"
          @click="pickable && emit('card', c.id)"
        >
          <span class="pip" aria-hidden="true">{{ suitOf(c.id) }}</span>
          <span class="rank">{{ c.v }}</span>
        </component>
        <button
          v-for="g in gaps"
          :key="'g' + g"
          type="button"
          class="gap"
          :style="{ '--s': g - 1 }"
          :aria-label="'插在第 ' + g + ' 个位置'"
          @click="emit('gap', g - 1)"
        ><span aria-hidden="true">▼</span></button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.felt { width: 100%; max-width: calc(var(--n) * 84px + 28px); padding-inline: 14px; box-sizing: border-box; }
.box { container-type: inline-size; width: 100%; }
.floor {
  --w: calc(100cqw / var(--n) - 8px);
  --h: calc(var(--w) * 1.38);
  --lift: calc(var(--h) * 0.72);
  position: relative; height: calc(var(--lift) + var(--h) + 6px);
}
.band {
  position: absolute; left: -4px; top: calc(var(--lift) - 6px); height: calc(var(--h) + 12px);
  border-radius: 14px; background: var(--out); border: 1.5px dashed var(--accent);
  transition: width 0.4s ease-out;
}
.pc, .hole {
  position: absolute; box-sizing: border-box; width: var(--w); height: var(--h);
  left: calc(var(--s) * 100% / var(--n) + 4px); top: var(--lift);
  border-radius: calc(var(--w) * 0.14);
}
.hole {
  font: inherit; font-size: calc(var(--w) * 0.32); padding: 0; color: var(--muted);
  display: grid; place-items: center;
  border: 2px dashed var(--line); background: transparent;
}
button.hole { cursor: pointer; border-color: var(--accent); }
button.hole:hover { background: var(--surface); }
.pc {
  font: inherit; padding: 0; color: var(--fg); background: var(--surface);
  border: 1.5px solid var(--line); box-shadow: 0 2px 0 var(--line);
  display: grid; place-items: center;
  transition: left 0.45s ease-in-out, top 0.35s ease-out, transform 0.35s, opacity 0.35s, border-color 0.25s, background 0.25s;
}
button.pc { cursor: pointer; }
button.pc:hover { border-color: var(--accent); }
.pc:focus-visible, .hole:focus-visible, .gap:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
.pip { position: absolute; top: 3%; left: 9%; font-size: calc(var(--w) * 0.26); line-height: 1; }
.pc.red .pip { color: var(--warn); }
.rank { font: 700 calc(var(--w) * 0.5) / 1 var(--mono); font-variant-numeric: tabular-nums; }
.pc.up { top: 0; transform: rotate(-5deg); border-color: var(--accent); box-shadow: 0 6px 12px color-mix(in srgb, var(--fg) 18%, transparent); z-index: 2; }
.pc.away { opacity: 0.45; }
.pc.vs { border-color: var(--mid); background: var(--mid); color: var(--mid-ink); }
.pc.vs .pip { color: inherit; }
.glow { animation: glow 0.9s ease-in-out 2; }
.pc.shake { animation: shake 0.5s ease-in-out; }
.gap {
  position: absolute; z-index: 3; top: var(--lift); height: var(--h); width: 28px;
  left: calc(var(--s) * 100% / var(--n)); transform: translateX(-50%);
  font: inherit; font-size: 13px; color: var(--accent); cursor: pointer; padding: 0;
  display: flex; justify-content: center; align-items: flex-start;
  background: transparent; border: 0; border-radius: 8px;
}
.gap::after {
  content: ''; position: absolute; top: 18px; bottom: 4px; left: 50%; width: 0;
  border-left: 3px dotted var(--accent);
}
.gap:hover { background: var(--surface); }

@keyframes glow {
  50% { box-shadow: 0 0 0 4px var(--mid), 0 0 18px 6px var(--mid); }
}
@keyframes shake {
  20%, 60% { transform: translateX(-5px) rotate(-5deg); }
  40%, 80% { transform: translateX(5px) rotate(5deg); }
}
@media (prefers-reduced-motion: reduce) {
  .pc, .band { transition: none; }
  .glow, .pc.shake { animation: none; box-shadow: 0 0 0 3px var(--mid); }
}
</style>
