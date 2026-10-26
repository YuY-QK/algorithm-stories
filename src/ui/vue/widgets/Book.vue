<script setup lang="ts">
import { computed, ref } from 'vue';
import BookPager from '../../../components/shared/BookPager.vue';
import type { LookRules } from '../../../core/types';
import { useCopy } from '../i18n';
import { rulesOf, sceneOf } from '../levels';

// 看：会动的绘本。台词和画面全部由规则生成的页提供，「再看一次」换一个故事的输入。
const props = defineProps<{ slug: string; id: string; rules: string; scene: string; copy: Record<string, string> }>();
const { tr, ui } = useCopy(props.copy);

const rules = rulesOf(props.slug, 'look', props.rules) as LookRules<unknown>;
const Scene = sceneOf(props.slug, props.scene);
const seed = ref(rules.first);
const frames = computed(() => rules.frames(seed.value).map((f) => ({ ...f, say: tr(f.say) })));

const labels = {
  prev: ui('ui.book.prev'), auto: ui('ui.book.auto'), pause: ui('ui.book.pause'), next: ui('ui.book.next'), goPlay: ui('ui.book.goPlay'),
};
// 「再看一次」按钮的字：本关的 <id>.again 优先，没有就用共用的
const againLabel = props.copy[props.id + '.again'] ? tr({ key: props.id + '.again' }) : ui('ui.book.again');
const again = () => (seed.value = rules.next(seed.value));
</script>

<template>
  <BookPager :frames="frames" :again-label="againLabel" :labels="labels" @again="again">
    <template #default="{ frame }">
      <component :is="Scene" :frame="frame" :t="tr" />
    </template>
  </BookPager>
</template>
