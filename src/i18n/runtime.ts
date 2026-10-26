/**
 * 浏览器里的翻译：页面（Base.astro）把这一页要用的字典写在 <script id="i18n-dict"> 里，
 * 这里第一次用到时读出来。测试里用 setDict 直接塞字典。
 */
import { isMsg, translate, type Dict, type Msg, type Params, type Text } from './format';

export const DICT_ELEMENT_ID = 'i18n-dict';

let dict: Dict | null = null;

export function setDict(d: Dict) {
  dict = d;
}

function current(): Dict {
  if (dict) return dict;
  const el = typeof document === 'undefined' ? null : document.getElementById(DICT_ELEMENT_ID);
  dict = el?.textContent ? (JSON.parse(el.textContent) as Dict) : {};
  return dict;
}

/** 翻译一个键或一句 Msg */
export function t(text: Text, params?: Params): string {
  return translate(current(), text, params);
}

/**
 * 显示一段可能已经是文字、也可能是 Msg 的内容：Msg 翻译，字符串原样返回。
 * 迁移期间共享组件同时服务新旧关卡（旧关卡的引擎还直接给中文），所以要这个；全部迁移完以后改回 t。
 */
export function show(x: string | Msg): string {
  return isMsg(x) ? t(x) : x;
}
