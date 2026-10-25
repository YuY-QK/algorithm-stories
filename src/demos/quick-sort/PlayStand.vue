<script setup lang="ts">
import { computed, ref } from 'vue';
import { dealStand, sideOf, stars } from '../../engine/quick-sort';
import { WIGGLE_MS } from '../../components/shared/timing';
import { useStageStop } from '../../components/shared/usePlayer';
import { animalOf } from './animals';
import KidBar from './KidBar.vue';
import { play } from '../../components/shared/sound';

// 玩法一「站两边」：老师选好了标杆，七位同学排队，孩子一位一位告诉他站标杆的哪一边。
// 队伍和标杆都是预先发好的；点错了不说「错了」，而是拉出一条和标杆一样高的线，让孩子自己比一比。
const MAX = 9;
const game = ref(dealStand());
const pivotId = 7;
const heights = computed(() => [...game.value.queue, game.value.pivot]);
const qi = ref(0);
const left = ref<number[]>([]);
const right = ref<number[]>([]);
const mistakes = ref(0);
const ruler = ref(false);
const shaking = ref(false);
const glowing = ref(false);
const say = ref('');
let timer: ReturnType<typeof setTimeout> | null = null;

const phase = computed(() => (qi.value >= game.value.queue.length ? 'done' : 'pick'));
const cur = computed(() => qi.value);
const waiting = computed(() => game.value.queue.map((_, id) => id).slice(qi.value));
const earned = computed(() => stars(mistakes.value));

function ask() {
  say.value = '轮到 ' + animalOf(cur.value) + ' 了：他该站 🚩 的哪一边？';
}
function fresh() {
  game.value = dealStand();
  qi.value = 0;
  left.value = [];
  right.value = [];
  mistakes.value = 0;
  ruler.value = false;
  ask();
}
fresh();

function clearWiggle() {
  if (timer) clearTimeout(timer);
  timer = null;
  shaking.value = false;
  glowing.value = false;
}

function wiggle() {
  if (timer) clearTimeout(timer);
  shaking.value = false;
  glowing.value = false;
  requestAnimationFrame(() => {
    shaking.value = true;
    glowing.value = true;
  });
  timer = setTimeout(() => { shaking.value = false; glowing.value = false; }, WIGGLE_MS);
}

function choose(side: 'left' | 'right') {
  if (phase.value !== 'pick') return;
  const id = cur.value;
  if (sideOf(heights.value[id], game.value.pivot) !== side) {
    mistakes.value++;
    play('wrong');
    ruler.value = true;
    wiggle();
    say.value = '🤔 看看那条线：' + animalOf(id) + ' 和 🚩 谁高？';
    return;
  }
  ruler.value = false;
  (side === 'left' ? left : right).value.push(id);
  qi.value++;
  play(phase.value === 'done' ? 'win' : 'right');
  const did = animalOf(id) + ' 比 🚩 ' + (side === 'left' ? '矮' : '高') + '，站' + (side === 'left' ? '左' : '右') + '边了 ✅ ';
  say.value = phase.value === 'done' ? did + '🎉 都站好啦！' : did + '轮到 ' + animalOf(cur.value) + ' 了：他该站 🚩 的哪一边？';

}

useStageStop(clearWiggle);
</script>

<template>
  <div class="game">
    <p class="small-note">目标：把每位同学和 🚩 比身高，矮的站左边，高的站右边。</p>
    <p class="say" aria-live="polite">{{ say }}</p>

    <div class="qbox" aria-label="排队的同学">
      <div class="queue">
        <div v-for="id in waiting" :key="id" class="qslot" :class="{ cur: id === cur && phase === 'pick' }">
          <KidBar
            :id="id" :v="heights[id]" :max="MAX" :mark="id === cur ? '👆' : ''"
            :shake="id === cur && shaking" :glow="id === cur && glowing"
          />
        </div>
      </div>
      <div v-if="ruler" class="ruler" :style="{ bottom: 'calc(22px + var(--bar) * ' + game.pivot / MAX + ')' }" aria-hidden="true">
        <span>🚩 一样高</span>
      </div>
    </div>

    <div v-if="phase === 'pick'" class="choose">
      <button type="button" class="btn primary choice" aria-label="站左边" @click="choose('left')">⬅️ 站左边</button>
      <button type="button" class="btn primary choice" aria-label="站右边" @click="choose('right')">站右边 ➡️</button>
    </div>

    <div class="stand">
      <div class="grp">
        <span class="cap">⬅️ 左边</span>
        <div class="kids"><KidBar v-for="id in left" :key="id" :id="id" :v="heights[id]" :max="MAX" kind="low" class="pop" /></div>
      </div>
      <div class="grp mid">
        <span class="cap">&nbsp;</span>
        <div class="kids">
          <KidBar :id="pivotId" :v="game.pivot" :max="MAX" :kind="phase === 'done' ? 'placed' : 'pivot'" flag :glow="glowing" />
        </div>
      </div>
      <div class="grp">
        <span class="cap">右边 ➡️</span>
        <div class="kids"><KidBar v-for="id in right" :key="id" :id="id" :v="heights[id]" :max="MAX" kind="high" class="pop" /></div>
      </div>
    </div>

    <div v-if="phase === 'done'" class="result">
      <p class="stars" :aria-label="earned + ' 颗星'">
        <span v-for="s in 3" :key="s" :class="{ dim: s > earned }">⭐</span>
      </p>
      <p>🚩 左边 {{ left.length }} 位都比他矮，右边 {{ right.length }} 位都比他高。排好以后他也正好站第 {{ left.length + 1 }} 个，不用再动了。</p>
      <p class="small-note">两边各自还乱着，所以接下来，左边一队、右边一队，各自再选一位标杆。</p>
      <button type="button" class="btn primary" @click="fresh">🔁 再来一局</button>
    </div>
  </div>
</template>

<style scoped>
.game { display: flex; flex-direction: column; gap: 16px; }
.say { font-size: clamp(1.3rem, 5vw, 1.9rem); min-height: 2.6em; }
.qbox { --bar: clamp(70px, 22vw, 110px); position: relative; border-bottom: 2px solid var(--line); min-height: calc(var(--bar) + 80px); display: flex; align-items: flex-end; }
.queue { display: flex; width: 100%; gap: 2px; align-items: flex-end; }
.qslot { flex: 0 1 56px; min-width: 0; padding: 0 2px; border-radius: 8px; }
.qslot.cur { background: var(--surface); box-shadow: 0 0 0 2px var(--accent); }
.ruler {
  position: absolute; left: 0; right: 0; border-top: 2px dashed var(--warn); pointer-events: none;
}
.ruler span { position: absolute; right: 0; top: -22px; font-size: 13px; color: var(--warn); background: var(--bg); padding: 0 4px; border-radius: 4px; }
.choose { display: flex; gap: 12px; }
.choice { flex: 1 1 0; font-size: 1.15rem; padding: 14px 10px; min-width: 0; }
.stand { --bar: 64px; display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); gap: 8px; align-items: end; }
.grp { display: flex; flex-direction: column; gap: 6px; min-width: 0; align-items: stretch; }
.grp.mid { align-items: center; width: 56px; }
.cap { font-size: 13px; color: var(--muted); text-align: center; }
.kids { display: flex; gap: 1px; align-items: flex-end; justify-content: center; border-bottom: 2px solid var(--line); min-height: calc(var(--bar) + 70px); }
.kids > * { flex: 1 1 0; min-width: 0; max-width: 44px; }
.grp.mid .kids { width: 100%; }
.pop { animation: pop 0.4s ease-out; }
@keyframes pop { from { transform: translateY(-14px) scale(0.8); opacity: 0; } }
.stars { font-size: 2.4rem; line-height: 1; }
.stars .dim { filter: grayscale(1); opacity: 0.3; }
@media (prefers-reduced-motion: reduce) {
  .pop { animation: none; }
}
</style>
