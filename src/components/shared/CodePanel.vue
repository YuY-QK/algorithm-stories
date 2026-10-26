<script setup lang="ts">
// 参考代码面板，active 行高亮（行号从 1 开始）。
// pickable 时每一行都能点（比如「找 bug」），marks 给某些行标上对错。
const props = withDefaults(defineProps<{
  lines: string[];
  active: number;
  lang?: string;
  pickable?: boolean;
  marks?: Record<number, 'good' | 'bad'>;
  /** 读屏文字，默认中文；新页面（ui/vue/widgets）按文案表传入 */
  labels?: { group: string; line: (n: number, text: string) => string };
}>(), {
  lang: 'PYTHON', pickable: false, marks: () => ({}),
  labels: undefined,
});
const groupLabel = () => props.labels?.group ?? props.lang + ' 代码';
const lineLabel = (n: number, text: string) => (props.labels ? props.labels.line(n, text) : '第 ' + n + ' 行：' + text);

const emit = defineEmits<{ pick: [line: number] }>();
</script>

<template>
  <div class="code" role="group" :aria-label="groupLabel()">
    <div class="codehead">{{ lang }}</div>
    <pre v-if="!pickable"><div v-for="(t, k) in lines" :key="k" class="line" :class="{ on: k + 1 === active }"><i>{{ k + 1 }}</i><span>{{ t }}</span></div></pre>
    <pre v-else><button v-for="(t, k) in lines" :key="k" type="button" class="line pick" :class="[{ on: k + 1 === active }, marks[k + 1]]" :aria-label="lineLabel(k + 1, t.trim())" @click="emit('pick', k + 1)"><i>{{ k + 1 }}</i><span>{{ t }}</span></button></pre>
  </div>
</template>
