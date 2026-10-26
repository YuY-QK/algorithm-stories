import type { Component } from 'vue';
import type { LevelModule } from '../../core/types';

/** 一关的界面包：引擎模块（含 level 规则）和画面注册表。放在 scenes/<slug>/index.ts 里默认导出 */
export interface LevelBundle {
  engine: { level: LevelModule };
  scenes: Record<string, Component>;
}

const bundles = import.meta.glob<LevelBundle>('./scenes/*/index.ts', { eager: true, import: 'default' });

export function getLevel(slug: string): LevelBundle {
  const b = bundles['./scenes/' + slug + '/index.ts'];
  if (!b) throw new Error('src/ui/vue/scenes/' + slug + '/index.ts 不存在：level.json 有了，还要登记这一关的画面');
  return b;
}

/** 按 level.json 里的名字取规则，写错了直接报出是哪一关的哪一项 */
export function rulesOf<K extends keyof LevelModule>(slug: string, group: K, name: string): NonNullable<LevelModule[K]>[string] {
  const r = getLevel(slug).engine.level[group]?.[name];
  if (!r) throw new Error(slug + ' 的引擎没有导出 level.' + group + '.' + name);
  return r as NonNullable<LevelModule[K]>[string];
}

export function sceneOf(slug: string, name: string): Component {
  const c = getLevel(slug).scenes[name];
  if (!c) throw new Error(slug + ' 的画面注册表里没有 ' + name);
  return c;
}
