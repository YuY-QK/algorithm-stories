<script setup lang="ts">
import { computed, ref } from 'vue';
import { applyCard, cardAnswer, clerkGame, SEATS, stars, type Card } from '../../engine/queue';
import { play } from '../../components/shared/sound';
import Seats from './Seats.vue';

// 玩法二「我是店员」：椅子围成一圈，按指令卡干活。
// 来人：点他该坐的椅子（最后一位后面那把，走到 5 号后面就回到 0 号）；卖出：点买到奶茶的人（队头）。
// 局面和每张卡的答案由引擎预先算好。点错时被点的椅子晃一下，并给看得见的提示：
// 来人时正确的椅子透光，卖出时队头举手。
const game = ref(clerkGame());
const ring = ref(game.value.start);
const at = ref(0);
const mistakes = ref(0);
const shake = ref<[number, number] | null>(null);
const glow = ref<number[]>([]);
const raise = ref<number | null>(null);
const served = ref<string[]>([]);
const say = ref('');

const card = computed<Card | null>(() => game.value.cards[at.value] ?? null);
const done = computed(() => card.value === null);
const earned = computed(() => stars(mistakes.value));

/** 说一句：刚才做了什么 + 现在轮到什么 */
function prompt(done = '') {
  const c = card.value;
  let next: string;
  if (!c) next = '🎉 椅子转了一圈，大家还是按顺序买到 🧋';
  else if ('arrive' in c) next = c.arrive + ' 来了，该坐哪把椅子？';
  else next = '🧋 做好一杯了，该给谁？';
  say.value = done ? done + ' ' + next : next;
}
prompt();

function tap(i: number) {
  const c = card.value;
  if (!c) return;
  const right = cardAnswer(ring.value, c);
  if (i !== right) {
    mistakes.value++;
    play('wrong');
    shake.value = [i, (shake.value?.[1] ?? 0) + 1];
    if ('arrive' in c) {
      glow.value = [];
      requestAnimationFrame(() => (glow.value = [right]));
      say.value = ring.value.cells[i] !== null ? '🙅 这把有人坐啦，跟着箭头往后找' : '👀 坐在最后一位的后面，跟着箭头找';
    } else {
      raise.value = right;
      say.value = '🙋 谁等得最久？';
    }
    return;
  }
  glow.value = [];
  raise.value = null;
  play('right');
  let done: string;
  if ('sell' in c) {
    const who = ring.value.cells[i] as string;
    served.value = [...served.value, who];
    done = '✅ ' + who + ' 是队头，等得最久，先买到 🧋，离开 ' + i + ' 号椅子。';
  } else {
    done = '✅ ' + c.arrive + ' 坐上 ' + i + ' 号椅子，排在队尾。';
  }
  ring.value = applyCard(ring.value, c);
  at.value++;
  if (!card.value) play('win');
  prompt(done);
}

const tags = computed<Record<number, string>>(() => (ring.value.size ? { [ring.value.head]: '队头' } : {}));
const labels = computed(() => ring.value.cells.map((v, i) => i + ' 号椅子' + (v ? '：' + v : '：空') + (tags.value[i] ? '，队头' : '')));

function cardText(c: Card) {
  return 'arrive' in c ? c.arrive + ' 来了' : '卖出一杯';
}

function again() {
  game.value = clerkGame();
  ring.value = game.value.start;
  at.value = 0;
  mistakes.value = 0;
  glow.value = [];
  raise.value = null;
  served.value = [];
  prompt();
}
</script>

<template>
  <div class="game">
    <p class="small-note">目标：椅子围成一圈，按上面的指令卡干活。有人来了，点他该坐的椅子（最后一位后面那把，走到 5 号后面回到 0 号）；卖出一杯，点买到奶茶的人（队头，等得最久的）。</p>
    <p class="say" aria-live="polite">{{ say }}</p>
    <ol class="tickets" aria-label="指令卡">
      <li
        v-for="(c, k) in game.cards"
        :key="k"
        class="ticket"
        :class="{ now: k === at, gone: k < at }"
        :aria-label="'第 ' + (k + 1) + ' 张：' + cardText(c) + (k < at ? '，做完了' : k === at ? '，现在做这张' : '')"
      >
        <template v-if="'arrive' in c">{{ c.arrive }}<small>🚶</small></template>
        <template v-else>🧋</template>
      </li>
    </ol>
    <Seats
      :seats="ring.cells" ring :tags="tags" :head="ring.size ? ring.head : null"
      :glow="glow" :shake="shake" :raise="raise" center="🧑‍🍳" empty="🪑"
      :clickable="!done" :labels="labels" @pick="tap"
    />
    <p class="served" aria-label="已经买到奶茶的">
      <span class="cup" aria-hidden="true">🧋</span>
      <span v-for="(a, i) in served" :key="i">{{ a }}</span>
    </p>
    <div v-if="done" class="result">
      <p class="stars" :aria-label="earned + ' 颗星'">
        <span v-for="s in 3" :key="s" :class="{ dim: s > earned }">⭐</span>
      </p>
      <p>🪑 {{ SEATS - 1 }} 号的下一把是 0 号，椅子转着圈用！</p>
      <button type="button" class="btn primary" @click="again">🔁 再来一局</button>
    </div>
  </div>
</template>

<style scoped>
.game { display: flex; flex-direction: column; gap: 16px; }
.say { font-size: clamp(1.25rem, 5vw, 1.9rem); min-height: 2.6em; }
.tickets { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px; }
.ticket {
  display: flex; align-items: center; justify-content: center; gap: 1px;
  min-width: 2.3em; height: 2.3em; padding: 0 4px; font-size: 1.15rem; border-radius: 8px;
  border: 1.5px solid var(--line); background: var(--surface);
}
.ticket small { font-size: 0.6em; }
.ticket.now { border-color: var(--mid); background: var(--mid); box-shadow: 0 0 0 3px var(--mid); }
.ticket.gone { opacity: 0.35; }
.served { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; min-height: 1.8em; font-size: 1.4rem; }
.cup { padding-right: 6px; margin-right: 4px; border-right: 1.5px solid var(--line); }
.stars { font-size: 2.4rem; line-height: 1; }
.stars .dim { filter: grayscale(1); opacity: 0.3; }
</style>
