/**
 * 读语言文件：只在构建页面（Astro）和测试里用，不要从浏览器里跑的代码引用，
 * 否则所有语言、所有关卡的文案都会打进脚本。浏览器里用 runtime.ts。
 */
import { translate, type Dict, type Params, type Text } from './format';

/** 当前语言。以后做英文版时由页面路由决定 */
export const LOCALE = 'zh';

const files = import.meta.glob<Dict>('../locales/*/*.json', { eager: true, import: 'default' });

/** 所有语言文件：语言 → 文件名（common 或 slug）→ 字典 */
export const LOCALES: Record<string, Record<string, Dict>> = {};
for (const [path, dict] of Object.entries(files)) {
  const [, locale, name] = /locales\/([^/]+)\/([^/]+)\.json$/.exec(path)!;
  (LOCALES[locale] ??= {})[name] = dict;
}

/** 一个页面要用的字典：全站通用加上这一关的（同名键以关卡为准） */
export function loadDict(slug?: string, locale = LOCALE): Dict {
  const all = LOCALES[locale] ?? {};
  return { ...all.common, ...(slug ? all[slug] : undefined) };
}

/** 生成翻译函数，Astro 页面里用：const t = translator(loadDict(slug)) */
export function translator(dict: Dict) {
  return (text: Text, params?: Params) => translate(dict, text, params);
}
