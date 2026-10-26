<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { bracketAction, bracketEnd, bracketGame, pairOf, stars, type Action } from '../../engine/stack';
import { useStageStop } from '../../components/shared/usePlayer';
import { FLASH_MS } from '../../components/shared/timing';
import Piece from './Piece.vue';
import { play } from '../../components/shared/sound';

// 玩法二「拼积木」：( [ { 是左半块，) ] } 是右半块。孩子当栈：
// 左半块放进篮子；右半块来了，要和篮子最上面那块拼成一整块；拼不上就卡住。
// 一串看完，再问「都拼好了吗」。每串的答案由引擎判定，孩子选错只给看得见的提示。
const rounds = ref<string[]>(bracketGame());
const r = ref(0);
const i = ref(0);
const basket = ref<string[]>([]);
const made = ref<string[]>([]);
type Phase = 'act' | 'end' | 'stuck' | 'clear' | 'left';
const phase = ref<Phase>('act');
const misses = ref(0);
const say = ref('👆 第一块来啦。放进篮子，还是拼上？');
const wiggle = ref(0);
const glowTop = ref(0);
const glowBasket = ref(0);

const s = computed(() => rounds.value[r.value]);
const roundOver = computed(() => phase.value === 'stuck' || phase.value === 'clear' || phase.value === 'left');
const gameOver = computed(() => roundOver.value && r.value === rounds.value.length - 1);
const earned = computed(() => stars(misses.value));

let timers: ReturnType<typeof setTimeout>[] = [];
function stopFlash() {
  timers.forEach(clearTimeout);
  timers = [];
  wiggle.value = glowTop.value = glowBasket.value = 0;
}
useStageStop(stopFlash);
onBeforeUnmount(stopFlash);

/** 重新触发提示动画：先清零，下一帧再设上 */
function flash(which: typeof wiggle) {
  which.value = 0;
  requestAnimationFrame(() => {
    const t = Date.now();
    which.value = t;
    timers.push(setTimeout(() => { if (which.value === t) which.value = 0; }, FLASH_MS));
  });
}

function hint(text: string, which: typeof wiggle) {
  misses.value++;
  play('wrong');
  say.value = text;
  flash(which);
}

function act(choice: Action) {
  if (phase.value !== 'act') return;
  const c = s.value[i.value];
  const right = bracketAction(basket.value, c);
  if (choice !== right) {
    if (right === 'push') return hint('🤔 这是左半块，先放进篮子等伙伴', wiggle);
    if (choice === 'push') return hint('🤔 右半块不进篮子，看看篮子最上面那块', basket.value.length ? glowTop : glowBasket);
    if (right === 'pop') return hint('🤔 再比比篮子最上面那块的形状', glowTop);
    return basket.value.length ? hint('🤔 形状一样吗？比比看', glowTop) : hint('🤔 篮子里还有积木吗？', glowBasket);
  }
  wiggle.value = glowTop.value = glowBasket.value = 0;
  play('right');
  if (right === 'push') {
    basket.value = [...basket.value, c];
    say.value = '⬆️ ' + c + ' 是左半块，放进篮子，篮子里现在有 ' + basket.value.length + ' 块';
  } else if (right === 'pop') {
    const top = basket.value[basket.value.length - 1];
    made.value = [...made.value, top + c];
    basket.value = basket.value.slice(0, -1);
    say.value = '🧩 ' + c + ' 和篮子最上面的 ' + top + ' 是一对，拼成一整块 ' + top + c + '！';
  } else {
    phase.value = 'stuck';
    say.value = basket.value.length
      ? '🙅 ' + c + ' 要找 ' + pairOf(basket.value[basket.value.length - 1]) + ' 才拼得上最上面的 ' + basket.value[basket.value.length - 1] + '，形状对不上，这一串卡住啦'
      : '🙅 篮子空了，' + c + ' 没有伙伴，卡住啦';
    return;
  }
  i.value++;
  if (i.value >= s.value.length) {
    phase.value = 'end';
    say.value = '👀 一串都看完了。都拼好了吗？';
  }
}

function finish(choice: 'clear' | 'left') {
  if (phase.value !== 'end') return;
  const right = bracketEnd(basket.value);
  if (choice !== right) {
    return right === 'clear' ? hint('🤔 看看篮子里还有吗？', glowBasket) : hint('🤔 篮子里还剩积木呢', glowBasket);
  }
  phase.value = right;
  play(gameOver.value ? 'win' : 'right');
  say.value = right === 'clear' ? '🎉 全拼好啦，篮子空空！' : '🙅 篮子里还剩 ' + basket.value.length + ' 块没有伙伴，没拼完';
}

function startRound(k: number) {
  r.value = k;
  i.value = 0;
  basket.value = [];
  made.value = [];
  phase.value = 'act';
  say.value = '👆 第 ' + (k + 1) + ' 串来啦';
}

function again() {
  rounds.value = bracketGame();
  misses.value = 0;
  startRound(0);
}

function pieceLabel(c: string, k: number) {
  const name = { '(': '圆形左半块', ')': '圆形右半块', '[': '方形左半块', ']': '方形右半块', '{': '花形左半块', '}': '花形右半块' }[c];
  return name + (k === i.value && phase.value === 'act' ? '，轮到它' : k < i.value ? '，已经看过' : '');
}
</script>

<template>
  <div class="game">
    <p class="small-note">目标：左半块 ( [ { 放进篮子，右半块 ) ] } 来了，要和篮子最上面的一块形状一样才能拼上。一串看完，篮子空了才算全拼好。</p>
    <p class="say" aria-live="polite">{{ say }}</p>
    <div class="dots" aria-label="第几串">
      <span v-for="(_, k) in rounds" :key="k" :class="{ on: k === r, past: k < r }" />
    </div>

    <ol class="tape" aria-label="这一串积木">
      <li v-for="(c, k) in s" :key="r + '-' + k" :aria-label="pieceLabel(c, k)" :class="{ past: k < i, now: k === i && phase === 'act', wig: k === i && wiggle > 0 }" :data-w="wiggle">
        <span class="arrow" aria-hidden="true">{{ k === i && phase === 'act' ? '⬇️' : '' }}</span>
        <Piece :c="c" />
      </li>
    </ol>

    <div class="floor">
      <div class="col">
        <div class="basket" :class="{ glow: glowBasket > 0 }" :data-w="glowBasket" aria-label="篮子">
          <TransitionGroup name="blk">
            <span v-for="(c, k) in basket" :key="k + c" class="slot" :class="{ glow: glowTop > 0 && k === basket.length - 1 }" :data-w="glowTop">
              <Piece :c="c" />
            </span>
          </TransitionGroup>
        </div>
        <p class="cap">🧺 篮子</p>
      </div>
      <div class="col">
        <div class="made" aria-label="拼好的">
          <TransitionGroup name="blk">
            <span v-for="(m, k) in made" :key="k + m"><Piece :c="m" small /></span>
          </TransitionGroup>
        </div>
        <p class="cap">✨ 拼好的</p>
      </div>
    </div>

    <div v-if="phase === 'act'" class="pads">
      <button type="button" class="pad" aria-label="放进篮子" @click="act('push')"><span aria-hidden="true">⬆️</span><small>放进篮子</small></button>
      <button type="button" class="pad" aria-label="拼上" @click="act('pop')"><span aria-hidden="true">🧩</span><small>拼上</small></button>
      <button type="button" class="pad" aria-label="拼不上" @click="act('stuck')"><span aria-hidden="true">🙅</span><small>拼不上</small></button>
    </div>
    <div v-if="phase === 'end'" class="pads">
      <button type="button" class="pad" aria-label="都拼好了" @click="finish('clear')"><span aria-hidden="true">🎉</span><small>都拼好了</small></button>
      <button type="button" class="pad" aria-label="还剩下" @click="finish('left')"><span aria-hidden="true">🙅</span><small>还剩下</small></button>
    </div>

    <div v-if="roundOver && !gameOver" class="row">
      <button type="button" class="btn primary" @click="startRound(r + 1)">▶ 下一串</button>
    </div>
    <div v-if="gameOver" class="result">
      <p class="stars" :aria-label="earned + ' 颗星'">
        <span v-for="k in 3" :key="k" :class="{ dim: k > earned }">⭐</span>
      </p>
      <p class="q">右半块只看篮子最上面那块：形状一样才拼得上，最后篮子还得是空的。</p>
      <button type="button" class="btn primary" @click="again">🔁 再玩一局</button>
    </div>
  </div>
</template>

<style scoped>
.game { display: flex; flex-direction: column; gap: 16px; }
.say { font-size: clamp(1.3rem, 5vw, 1.9rem); min-height: 2.6em; }
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
.pads { display: flex; gap: 10px; flex-wrap: wrap; }
.pad {
  font: inherit; cursor: pointer; flex: 0 1 6.2em; display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 8px 6px; border-radius: 16px; border: 1.5px solid var(--line); background: var(--surface); color: var(--fg);
}
.pad span { font-size: clamp(1.7rem, 8vw, 2.2rem); line-height: 1.1; }
.pad small { font-size: 13px; color: var(--muted); }
.pad:hover { border-color: var(--accent); }
.pad:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
.stars { font-size: 2.4rem; line-height: 1; }
.stars .dim { filter: grayscale(1); opacity: 0.3; }
.q { font-size: 1.1rem; max-width: 30em; }

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
