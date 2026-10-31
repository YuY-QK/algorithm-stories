import type { Copy, Msg } from './types';

/** 构造一个 Msg 的简写：m('dirSay', { dir: m('left') }) */
export function m(key: string, params?: Msg['params']): Msg {
  return params ? { key, params } : { key };
}

/**
 * 把 Msg 按文案表填成文字。缺键时返回「⟦键⟧」，测试用 missingKeys 查出来，页面上一眼也能看到。
 * 字符串原样返回，方便变量名这类不需要翻译的字。
 */
export function t(msg: Msg | string | number, copy: Copy): string {
  if (typeof msg !== 'object') return String(msg);
  const tpl = copy[msg.key];
  if (tpl === undefined) return '⟦' + msg.key + '⟧';
  return tpl.replace(/\{(\w+)\}/g, (all, name: string) => {
    const v = msg.params?.[name];
    return v === undefined ? all : t(v, copy);
  });
}

/** 列出 msg（含嵌套参数）里文案表缺的键，以及模板里没给的参数，给测试用 */
export function missingKeys(msg: Msg, copy: Copy): string[] {
  const out: string[] = [];
  const tpl = copy[msg.key];
  if (tpl === undefined) out.push(msg.key);
  else for (const [, name] of tpl.matchAll(/\{(\w+)\}/g)) if (msg.params?.[name] === undefined) out.push(msg.key + '.{' + name + '}');
  for (const v of Object.values(msg.params ?? {})) if (typeof v === 'object') out.push(...missingKeys(v, copy));
  return out;
}

/** 合并文案表：后面的覆盖前面的（关卡自己的覆盖共用的） */
export function mergeCopy(...tables: Copy[]): Copy {
  return Object.assign({}, ...tables);
}
