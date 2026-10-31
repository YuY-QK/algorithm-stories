<script setup lang="ts">
import { computed, nextTick, reactive, useId, watch, type Component } from 'vue';
import Segmented from '../../../components/shared/Segmented.vue';
import { m } from '../../../core/i18n';
import { SPEEDS } from '../../../core/timing';
import type { Control, TransportOp } from '../../../core/types';
import type { Tr } from '../i18n';

// 画一组 Control：按钮、数字输入框、分段选择、小按钮组。只认核心层的描述，不认识任何具体算法。
// fields：逐步执行面板上方的设置栏（每项一个带标签的字段）；play：「玩」和「挑战」里的按钮、输入框。
const props = withDefaults(defineProps<{
  controls: Control<any>[];
  variant?: 'fields' | 'play';
  /** 按钮上的小画面（art）从这里按名字取 */
  scenes?: Record<string, Component>;
  tr: Tr;
}>(), { variant: 'play', scenes: () => ({}) });
const emit = defineEmits<{ act: [action: unknown] }>();

type Num = Extract<Control<any>, { type: 'number' }>;
type Btn = Extract<Control<any>, { type: 'button' }>;

const uid = useId();
const id = (k: number) => uid + '-' + k;

// 数字框里正在输入的字，按控件序号记。接受了一次操作（clearOn 变了）就清空
const texts = reactive<Record<number, string>>({});
watch(() => props.controls.map((c) => (c.type === 'number' ? c.clearOn : null)).join(), () => {
  for (const k of Object.keys(texts)) delete texts[Number(k)];
});

function onLive(c: Num, e: Event) {
  const v = parseInt((e.target as HTMLInputElement).value, 10);
  if (!isNaN(v)) emit('act', c.submit(v));
}
function onSubmit(c: Num, k: number) {
  const v = parseInt(texts[k] ?? '', 10);
  if (!isNaN(v)) emit('act', c.submit(v));
  else if (c.invalid !== undefined) emit('act', c.invalid);
}

type Txt = Extract<Control<any>, { type: 'text' }>;
type Seg = Extract<Control<any>, { type: 'segmented' }>;
type Bar = Extract<Control<any>, { type: 'transport' }>;

// 文本框：每次输入都交给规则；规则改写了输入（如去掉不是括号的字），就把框里的字换成规则给的
function onText(c: Txt, e: Event) {
  const el = e.target as HTMLInputElement;
  emit('act', c.submit(el.value));
  nextTick(() => {
    const now = props.controls.find((x): x is Txt => x.type === 'text');
    if (now && el.value !== now.value) el.value = now.value;
  });
}

// 播放控制条：文字和 Transport 组件一样，状态在规则里
const bar = (c: Bar, op: TransportOp) => emit('act', c.act(op));
const barLabel = (c: Bar) => props.tr(m(c.speed === 0 ? 'ui.transport.step' : c.playing ? 'ui.transport.pause' : 'ui.transport.play'));

const cls = (c: Btn) => (c.look === 'pad' ? 'pad' : c.look === 'choice' ? 'choice' : c.look === 'primary' ? 'btn primary' : c.look === 'small' ? 'btn small' : c.look === 'smallPrimary' ? 'btn small primary' : 'btn');

/** play 变体：相邻的同类控件放进同一个容器（指路按钮一排、追问选项一排、其余按钮一行） */
const groups = computed(() => {
  const out: { kind: string; items: { c: Control<any>; k: number }[] }[] = [];
  props.controls.forEach((c, k) => {
    const kind = c.type === 'button' ? (c.look === 'pad' ? 'pad' : c.look === 'choice' ? 'choice' : 'row') : c.type;
    const last = out[out.length - 1];
    if (last && last.kind === kind && kind !== 'number') last.items.push({ c, k });
    else out.push({ kind, items: [{ c, k }] });
  });
  return out;
});
</script>

<template>
  <div v-if="variant === 'fields'" class="controls">
    <template v-for="(c, k) in controls" :key="k">
      <Segmented
        v-if="c.type === 'segmented'"
        :model-value="c.value"
        :legend="tr(c.legend)"
        :options="c.options.map((o) => ({ value: o.value, label: tr(o.label) }))"
        @update:model-value="(v: string | number) => emit('act', c.choose(v))"
      />
      <div v-else-if="c.type === 'number'" class="field">
        <label :for="id(k)">{{ tr(c.label) }}</label>
        <input :id="id(k)" type="number" inputmode="numeric" step="1" :value="c.value" @input="onLive(c, $event)">
      </div>
      <div v-else-if="c.type === 'text'" class="field">
        <label :for="id(k)">{{ tr(c.label) }}</label>
        <input :id="id(k)" class="txt" type="text" autocomplete="off" spellcheck="false" :value="c.value" @input="onText(c, $event)">
      </div>
      <div v-else-if="c.type === 'group'" class="field">
        <span class="lab">{{ tr(c.legend) }}</span>
        <div class="inline">
          <template v-for="(b, j) in c.items" :key="j">
            <button v-if="b.type === 'button'" type="button" :class="cls(b)" :disabled="b.disabled" :aria-label="b.aria ? tr(b.aria) : undefined" @click="emit('act', b.action)">{{ tr(b.label) }}</button>
          </template>
        </div>
      </div>
      <button v-else-if="c.type === 'button'" type="button" :class="cls(c)" :disabled="c.disabled" :aria-label="c.aria ? tr(c.aria) : undefined" @click="emit('act', c.action)">{{ tr(c.label) }}</button>
    </template>
  </div>

  <template v-else>
    <template v-for="(g, gi) in groups" :key="gi">
      <div v-if="g.kind === 'pad'" class="answers pads">
        <button v-for="{ c, k } in g.items" :key="k + ':' + ((c as Btn).nope ?? 0)" type="button" class="pad" :class="{ cap: !!(c as Btn).caption, nope: !!(c as Btn).nope }" :disabled="(c as Btn).disabled" :aria-label="(c as Btn).aria ? tr((c as Btn).aria!) : undefined" @click="emit('act', (c as Btn).action)">
          <template v-if="(c as Btn).caption"><span aria-hidden="true">{{ tr((c as Btn).label) }}</span><small>{{ tr((c as Btn).caption!) }}</small></template>
          <template v-else>{{ tr((c as Btn).label) }}</template>
        </button>
      </div>
      <div v-else-if="g.kind === 'choice'" class="choices">
        <button v-for="{ c, k } in g.items" :key="k" type="button" class="choice" :disabled="(c as Btn).disabled" @click="emit('act', (c as Btn).action)">
          <component :is="scenes[(c as Btn).art!.scene]" v-if="(c as Btn).art" v-bind="(c as Btn).art!.props" />{{ tr((c as Btn).label) }}
        </button>
      </div>
      <div v-else-if="g.kind === 'row'" class="row">
        <button v-for="{ c, k } in g.items" :key="k" type="button" :class="cls(c as Btn)" :disabled="(c as Btn).disabled" :aria-label="(c as Btn).aria ? tr((c as Btn).aria!) : undefined" @click="emit('act', (c as Btn).action)">{{ tr((c as Btn).label) }}</button>
      </div>
      <div v-else-if="g.kind === 'segmented'" class="controls">
        <Segmented
          v-for="{ c, k } in g.items" :key="k" :model-value="(c as Seg).value" :legend="tr((c as Seg).legend)"
          :options="(c as Seg).options.map((o) => ({ value: o.value, label: tr(o.label) }))"
          @update:model-value="(v: string | number) => emit('act', (c as Seg).choose(v))"
        />
      </div>
      <template v-else-if="g.kind === 'transport'">
        <div v-for="{ c, k } in g.items" :key="k" class="transport">
          <button type="button" class="btn small" :disabled="(c as Bar).idx === 0" @click="bar(c as Bar, 'reset')">{{ tr(m('ui.transport.reset')) }}</button>
          <button type="button" class="btn small" :disabled="(c as Bar).idx === 0" @click="bar(c as Bar, 'prev')">{{ tr(m('ui.transport.prev')) }}</button>
          <button type="button" class="btn small primary" @click="bar(c as Bar, 'toggle')">{{ barLabel(c as Bar) }}</button>
          <button type="button" class="btn small" :disabled="(c as Bar).idx >= (c as Bar).total - 1" @click="bar(c as Bar, 'next')">{{ tr(m('ui.transport.next')) }}</button>
          <label class="speed">{{ tr(m('ui.transport.speed')) }}
            <select :value="(c as Bar).speed" @change="bar(c as Bar, { speed: Number(($event.target as HTMLSelectElement).value) })">
              <option v-for="sp in SPEEDS" :key="sp.ms" :value="sp.ms">{{ sp.label }}</option>
            </select>
          </label>
        </div>
      </template>
      <template v-else-if="g.kind === 'number'">
        <form v-for="{ c, k } in g.items" :key="k" class="inline" @submit.prevent="onSubmit(c as Num, k)">
          <label class="sr" :for="id(k)">{{ tr((c as Num).label) }}</label>
          <input
            :id="id(k)" type="number" inputmode="numeric" :min="(c as Num).min" :max="(c as Num).max"
            :placeholder="tr((c as Num).placeholder ?? (c as Num).label)" :value="texts[k] ?? ''" @input="texts[k] = ($event.target as HTMLInputElement).value"
          >
          <button v-if="(c as Num).submitLabel" type="submit" class="btn small primary">{{ tr((c as Num).submitLabel!) }}</button>
        </form>
      </template>
    </template>
  </template>
</template>

<style scoped>
.pads { gap: 12px; }
.pad {
  font: inherit; font-size: clamp(1.8rem, 8vw, 2.4rem); cursor: pointer; flex: 0 1 3.2em; height: 1.9em;
  border-radius: 16px; border: 1.5px solid var(--line); background: var(--surface);
}
.pad:disabled { opacity: 0.4; cursor: default; }
.pad:not(:disabled):hover { border-color: var(--accent); }
.pad:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
/* 点错的按钮：变淡并晃一下；key 里带着点错次数，再点错一次就重新挂载、再晃一次 */
.pad.nope { animation: nope 0.5s ease-in-out; opacity: 0.5; }
@keyframes nope {
  20%, 60% { transform: translateX(-5px); }
  40%, 80% { transform: translateX(5px); }
}
@media (prefers-reduced-motion: reduce) {
  .pad.nope { animation: none; }
}
.choices { display: flex; flex-wrap: wrap; gap: 10px; }
.choice {
  font: inherit; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 10px 14px; border-radius: 12px; border: 1.5px solid var(--line); background: var(--surface); color: var(--fg);
}
.choice:hover { border-color: var(--accent); }
.choice:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
.pad.cap {
  height: auto; flex: 0 1 6.2em; display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 8px 6px; font-size: 1rem; color: var(--fg);
}
.pad.cap span { font-size: clamp(1.7rem, 8vw, 2.2rem); line-height: 1.1; }
.pad.cap small { font-size: 13px; color: var(--muted); }
.txt {
  font: 500 16px var(--mono); color: var(--fg); background: var(--surface);
  border: 1.5px solid var(--line); border-radius: 8px; padding: 8px 10px; width: min(16em, 100%); box-sizing: border-box;
}
.txt:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
form.inline { display: flex; gap: 8px; align-items: center; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
</style>
