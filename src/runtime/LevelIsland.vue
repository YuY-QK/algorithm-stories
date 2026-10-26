<script setup lang="ts">
import { onMounted, ref, shallowRef, type Component } from 'vue';
import type { Block, Level, Rand } from '../levels/types';
import type { Stage } from '../content.config';
import BookHost from './BookHost.vue';
import GameHost from './GameHost.vue';
import PredictHost from './PredictHost.vue';
import TraceHost from './TraceHost.vue';
import BugHost from './BugHost.vue';
import { islandRand } from './rand';

/**
 * 关卡页上的一个交互块。页面（LevelPage.astro）只传 slug、步骤和第几块，
 * 这里按需加载这一关的配置和画面组件，再交给对应的放映机。每关的代码各自成包，只在打开那一关时下载。
 */
const props = defineProps<{ slug: string; stage: Stage; index: number }>();

const levels = import.meta.glob<{ default: Level }>('../levels/*/level.ts');
const views = import.meta.glob<{ default: Record<string, Component> }>('../demos/*/views.ts');

const HOSTS: Partial<Record<Block['kind'], Component>> = { book: BookHost, game: GameHost, predict: PredictHost, trace: TraceHost, bugs: BugHost };

const root = ref<HTMLElement | null>(null);
const block = shallowRef<Block | null>(null);
const view = shallowRef<Component | undefined>();
const rand = shallowRef<Rand>(Math.random);

onMounted(async () => {
  const [level, map] = await Promise.all([
    levels['../levels/' + props.slug + '/level.ts'](),
    views['../demos/' + props.slug + '/views.ts'](),
  ]);
  const b = level.default.blocks[props.stage]?.[props.index];
  if (!b) throw new Error(props.slug + ' 的 ' + props.stage + ' 没有第 ' + props.index + ' 块');
  const name = 'view' in b ? b.view : undefined;
  if (name && !map.default[name]) throw new Error(props.slug + '/views.ts 里没有 ' + name);
  rand.value = islandRand(root.value);
  view.value = name ? map.default[name] : undefined;
  block.value = b;
});
</script>

<template>
  <div ref="root" class="level-island">
    <component :is="HOSTS[block.kind]" v-if="block" :block="block" :view="view" :rand="rand" />
  </div>
</template>

<style scoped>
.level-island { display: contents; }
</style>
