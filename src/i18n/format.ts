/**
 * 文案的通用部分：不依赖平台，引擎、流程、页面都用。
 *
 * 文案放在 src/locales/<语言>/ 下的 JSON 里：common.json 是全站通用，<slug>.json 是一关。
 * 每个文件是一层扁平的「键 → 字符串」，键用点分段，如 "play.find.greyNo"。
 * 字符串里用 {name} 放参数；可以写 `代码`、**加粗** 和 [文字](链接) 三种简单格式（见 toHtml）。
 */

/** 参数可以是数字、文字，也可以是另一句 Msg（先翻译再填进去） */
export type Params = { [name: string]: string | number | Msg };

/** 一句还没翻译的话：键加参数。引擎和流程只产出它，由界面层翻译成文字 */
export interface Msg {
  key: string;
  params?: Params;
}

export type Dict = Record<string, string>;

/** 可翻译的东西：一个键，或者键加参数 */
export type Text = string | Msg;

export function isMsg(x: unknown): x is Msg {
  return typeof x === 'object' && x !== null && typeof (x as Msg).key === 'string';
}

/**
 * 给一个语言文件生成带类型的 msg()：键写错，npm run check 就报错。
 * 用法：import type zh from '../locales/zh/binary-search.json'; const msg = msgOf<typeof zh>();
 */
export function msgOf<D>() {
  return <K extends keyof D & string>(key: K, params?: Params): Msg => (params ? { key, params } : { key });
}

/** 把 {name} 换成参数；缺参数时原样留着，方便测试发现 */
export function format(template: string, params: Record<string, string | number> | undefined): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (all, name: string) => (name in params ? String(params[name]) : all));
}

/** 字符串里出现的参数名，用于检查各语言的占位符一致 */
export function placeholders(template: string): string[] {
  return [...template.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}

/** 按字典翻译。查不到的键原样返回并加上 ⟦⟧，页面上一眼能看出来 */
export function translate(dict: Dict, text: Text, params?: Params): string {
  const key = isMsg(text) ? text.key : text;
  const p = isMsg(text) ? text.params : params;
  const template = dict[key];
  if (template === undefined) return '⟦' + key + '⟧';
  if (!p) return template;
  const filled: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(p)) filled[k] = isMsg(v) ? translate(dict, v) : v;
  return format(template, filled);
}

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c]);

/**
 * 把带简单格式的文案转成 HTML（先转义，所以文案里写 < > 也安全）：
 * `代码` → <code>，**加粗** → <b>，[文字](链接) → <a>。
 */
export function toHtml(text: string): string {
  return escape(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
}
